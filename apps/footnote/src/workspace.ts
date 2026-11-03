import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import nodePath from "node:path";
import {
	isMaybeReadonlyArrayOfStrings,
	isMaybeReadonlyDictionaryOfStrings,
	isMaybeString,
	isString,
	isUndefined,
} from "@howmanysmall/arktype-utilities";
import { CliError } from "@howmanysmall/cli-utilities/cli-error";
import { type } from "arktype";
import { parse as parseJsoncText, printParseErrorCode } from "jsonc-parser";
import { glob } from "tinyglobby";
import { parse as parseYaml } from "yaml";

import type { ParseError } from "jsonc-parser";

import type { Project, Reference } from "./references";

const PNPM_WORKSPACE_YAML = "pnpm-workspace.yaml";
const PACKAGE_JSON = "package.json";
const TSCONFIG_JSON = "tsconfig.json";

const WORKSPACE_PROTOCOL = "workspace:";

const isManifest = type({
	"dependencies?": isMaybeReadonlyDictionaryOfStrings,
	"devDependencies?": isMaybeReadonlyDictionaryOfStrings,
	"name?": isMaybeString,
	"optionalDependencies?": isMaybeReadonlyDictionaryOfStrings,
	"peerDependencies?": isMaybeReadonlyDictionaryOfStrings,
}).readonly();

const isPnpmWorkspace = type({
	"packages?": isMaybeReadonlyArrayOfStrings,
}).readonly();

const isReference = type({
	path: isString,
}).readonly();

/** Keeps unknown keys, so a tsconfig round-trips through it unchanged. */
export const isTsconfig = type({
	"references?": isReference.array().readonly().or(isUndefined),
}).readonly();

const isCompositeTsconfig = type({
	"compilerOptions?": { "composite?": "unknown" },
}).readonly();

// oxlint-disable-next-line small-rules/no-unknown-parameters -- type guard.
function parseJsonc<TData>(text: string, validate: (data: unknown) => TData): TData {
	const errors = new Array<ParseError>();
	const data: unknown = parseJsoncText(text, errors, { allowTrailingComma: true });

	const [firstError] = errors;
	if (firstError !== undefined) {
		throw new Error(`${printParseErrorCode(firstError.error)} at offset ${firstError.offset}`);
	}

	return validate(data);
}

function nameFileInErrors<TResult>(file: string, callback: () => TResult): TResult {
	try {
		return callback();
	} catch (error) {
		const message = error instanceof Error ? error.message : "unknown error";
		// biome-ignore lint/style/useErrorCause: CliError takes the cause as its third argument.
		throw new CliError(`${file}: ${message}`, 1, { cause: error });
	}
}

/**
 * Walks up to the nearest directory with a `pnpm-workspace.yaml`.
 *
 * @param cwd - The directory to start from.
 * @returns The absolute path of that directory.
 * @throws {CliError} With exit code 1 when no ancestor has the file.
 */
export function findWorkspaceRoot(cwd: string): string {
	let directory = nodePath.resolve(cwd);
	while (!existsSync(nodePath.join(directory, PNPM_WORKSPACE_YAML))) {
		const parent = nodePath.dirname(directory);
		if (parent === directory) {
			throw new CliError(
				`no ${PNPM_WORKSPACE_YAML} found in ${cwd} or its parents; run footnote inside a pnpm workspace.`,
				1,
			);
		}

		directory = parent;
	}

	return directory;
}

/**
 * Reads the `packages` globs from `pnpm-workspace.yaml`.
 *
 * @param root - The directory holding `pnpm-workspace.yaml`.
 * @returns The globs, including any `!` negations.
 */
export async function readWorkspaceGlobsAsync(root: string): Promise<ReadonlyArray<string>> {
	const text = await readFile(nodePath.join(root, PNPM_WORKSPACE_YAML), "utf8");
	const workspace = nameFileInErrors(PNPM_WORKSPACE_YAML, () => isPnpmWorkspace.assert(parseYaml(text) ?? {}));

	return workspace.packages ?? [];
}

async function readReferencesAsync(root: string, file: string): Promise<ReadonlyArray<Reference>> {
	const text = await readFile(nodePath.join(root, file), "utf8");
	const tsconfig = nameFileInErrors(file, () => parseJsonc(text, isTsconfig.assert));

	return tsconfig.references ?? [];
}

/**
 * Reads the root tsconfig's references.
 *
 * @param root - The directory holding `pnpm-workspace.yaml`.
 * @returns Its references, or `undefined` if it does not exist.
 */
export async function readRootReferencesAsync(root: string): Promise<ReadonlyArray<Reference> | undefined> {
	return existsSync(nodePath.join(root, TSCONFIG_JSON)) ? readReferencesAsync(root, TSCONFIG_JSON) : undefined;
}

async function readProjectAsync(root: string, directory: string): Promise<Project> {
	const file = nodePath.posix.join(directory, PACKAGE_JSON);
	const text = await readFile(nodePath.join(root, file), "utf8");
	const manifest = nameFileInErrors(file, () => parseJsonc(text, isManifest.assert));

	const dependencyGroups = [
		manifest.dependencies,
		manifest.devDependencies,
		manifest.optionalDependencies,
		manifest.peerDependencies,
	];

	const workspaceDependencies = new Set<string>();
	for (const dependencies of dependencyGroups) {
		const entries = Object.entries(dependencies ?? {});
		for (const [name, specifier] of entries) {
			if (specifier.startsWith(WORKSPACE_PROTOCOL)) {
				workspaceDependencies.add(name);
			}
		}
	}

	return {
		name: manifest.name,
		directory,
		references: await readReferencesAsync(root, nodePath.posix.join(directory, TSCONFIG_JSON)),
		workspaceDependencies: [...workspaceDependencies],
	};
}

async function findProjectDirectoriesAsync(
	root: string,
	workspaceGlobs: ReadonlyArray<string>,
	ignore: ReadonlyArray<string>,
): Promise<ReadonlyArray<string>> {
	if (workspaceGlobs.length === 0) {
		return [];
	}

	const matches = await glob([...workspaceGlobs], {
		cwd: root,
		expandDirectories: false,
		ignore: ["**/node_modules/**", ...ignore],
		onlyDirectories: true,
	});

	const directories = new Array<string>();
	for (const match of matches) {
		// `relative` drops the trailing slash and turns the root into "".
		const directory = nodePath.posix.relative(".", match);
		const absolute = nodePath.join(root, directory);
		if (
			directory.length > 0 &&
			existsSync(nodePath.join(absolute, PACKAGE_JSON)) &&
			existsSync(nodePath.join(absolute, TSCONFIG_JSON))
		) {
			directories.push(directory);
		}
	}

	return directories;
}

/**
 * Finds the workspace's projects: directories the globs match that contain
 * both a `package.json` and a `tsconfig.json`, minus `ignore`.
 *
 * @param root - The directory holding `pnpm-workspace.yaml`.
 * @param workspaceGlobs - The `packages` globs from `pnpm-workspace.yaml`.
 * @param ignore - The configured `ignore` globs.
 * @returns The projects, with their tsconfig references.
 */
export async function readProjectsAsync(
	root: string,
	workspaceGlobs: ReadonlyArray<string>,
	ignore: ReadonlyArray<string>,
): Promise<ReadonlyArray<Project>> {
	const directories = await findProjectDirectoriesAsync(root, workspaceGlobs, ignore);
	return Promise.all(directories.map(async (directory) => readProjectAsync(root, directory)));
}

async function isCompositeAsync(root: string, directory: string): Promise<boolean> {
	const file = nodePath.posix.join(directory, TSCONFIG_JSON);
	const text = await readFile(nodePath.join(root, file), "utf8");
	const tsconfig = nameFileInErrors(file, () => parseJsonc(text, isCompositeTsconfig.assert));

	return tsconfig.compilerOptions?.composite === true;
}

/**
 * Finds the projects whose own tsconfig lacks `compilerOptions.composite:
 * true`. It does not follow `extends`, so a project inheriting `composite` is
 * included.
 *
 * @param root - The directory holding `pnpm-workspace.yaml`.
 * @param workspaceGlobs - The `packages` globs from `pnpm-workspace.yaml`.
 * @returns Their workspace-relative directories, sorted in byte order.
 */
export async function readNonCompositeProjectsAsync(
	root: string,
	workspaceGlobs: ReadonlyArray<string>,
): Promise<ReadonlyArray<string>> {
	const directories = await findProjectDirectoriesAsync(root, workspaceGlobs, []);
	const results = await Promise.all(
		directories.map(async (directory) => ((await isCompositeAsync(root, directory)) ? undefined : directory)),
	);

	return results.filter((directory) => directory !== undefined).toSorted();
}

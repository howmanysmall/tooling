import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import { argv, cwd, stdin, stdout } from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { cancel, confirm, intro, isCancel, log, note, outro, select, text } from "@clack/prompts";
import { Command } from "@cliffy/command";
import { CliError } from "@howmanysmall/cli-utilities/cli-error";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name";
import { DOCUMENTATION_ORIGIN, getDocumentationSite, REPOSITORY_PATH } from "@howmanysmall/documentation-theme/site";
import { type } from "arktype";
import { exec } from "tinyexec";

// Every site under `documentation/` builds to its own `dist/`. GitHub Pages
// takes one artifact per repository, so `assemble` gathers the sites into one
// folder, and `.github/workflows/documentation.yaml` deploys it. `publish`
// runs that workflow from your machine.

const scriptName = getScriptName(true);

const DOCUMENTATION_DIRECTORY = "documentation";
const WORKFLOW = "documentation.yaml";
const RUN_LOOKUP_ATTEMPTS = 15;
const RUN_LOOKUP_INTERVAL_MS = 2000;
const TAG_LIMIT = 6;
const COMMIT_REGEXP = /^[\da-f]{7,40}$/u;

const isManifest = type({ name: "string", "+": "ignore", "description?": "string" });
const isRunList = type({ createdAt: "string", databaseId: "number", url: "string" }).array();
const parseJson = type("string.json.parse");

/** One documentation site in the repository. */
interface DocumentationSiteEntry {
	/** The site's folder under `documentation/`. */
	readonly name: string;
	/** What the site covers, from its `package.json`. */
	readonly description: string;
	/** Where the site is published. */
	readonly url: string;
}

/** A git ref someone might publish from. */
interface RefChoice {
	/** What it is, such as the commit it points at. */
	readonly hint: string;
	/** The branch or tag name. */
	readonly ref: string;
}

/** A workflow run on GitHub. */
interface WorkflowRun {
	readonly id: number;
	/** The run's page on GitHub. */
	readonly url: string;
}

/** How `publish` was asked to run. */
interface PublishOptions {
	readonly dryRun: boolean;
	/** Whether someone is at a terminal to answer questions. */
	readonly interactive: boolean;
	readonly watch: boolean;
	readonly yes: boolean;
}

/**
 * Reads one site's details from its folder.
 *
 * @param directory - The `documentation/` folder.
 * @param name - The site's folder name.
 * @returns The site, or `undefined` when the folder isn't a site.
 */
async function readSiteAsync(directory: string, name: string): Promise<DocumentationSiteEntry | undefined> {
	const manifestPath = nodePath.join(directory, name, "package.json");
	if (!existsSync(manifestPath)) return undefined;

	const { description = name } = isManifest.assert(parseJson.assert(await readFile(manifestPath, "utf8")));
	return { name, description, url: getDocumentationSite(name).url };
}

/**
 * Lists the documentation sites, one per folder under `documentation/` with
 * a `package.json`.
 *
 * @param rootDirectory - The repository root.
 * @returns The sites, by name.
 */
async function getSitesAsync(rootDirectory: string): Promise<Array<DocumentationSiteEntry>> {
	const directory = nodePath.join(rootDirectory, DOCUMENTATION_DIRECTORY);
	const entries = await readdir(directory, { withFileTypes: true });
	const folders = entries.filter((entry) => entry.isDirectory());
	const sites = await Promise.all(folders.map(async (entry) => readSiteAsync(directory, entry.name)));
	return sites
		.filter((site) => site !== undefined)
		.toSorted((first, second) => first.name.localeCompare(second.name));
}

/**
 * Runs a command and returns what it printed, trimmed.
 *
 * @param command - The program to run.
 * @param parameters - The arguments to pass it.
 * @returns What it wrote to stdout.
 * @rejects When the command exits with an error.
 */
async function readCommandAsync(command: string, parameters: ReadonlyArray<string>): Promise<string> {
	const { stdout: output } = await exec(command, parameters, { throwOnError: true });
	return output.trim();
}

/**
 * Escapes text for an HTML page.
 *
 * @param value - Text that may hold `<`, `>`, `&`, or quotes.
 * @returns The text, safe between tags and in attributes.
 */
function escapeHtml(value: string): string {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/**
 * Renders the page at the repository's Pages root, which lists every site.
 *
 * @param sites - The sites to list.
 * @returns The page's HTML.
 */
function renderIndex(sites: ReadonlyArray<DocumentationSiteEntry>): string {
	const rows = sites
		.map(({ name, description }) => {
			const link = `<a href="./${escapeHtml(name)}/">${escapeHtml(name)}</a>`;
			return `\t\t\t<li>${link}<span>${escapeHtml(description)}</span></li>`;
		})
		.join("\n");

	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Documentation</title>
		<style>
			:root { --paper: #fafaf9; --ink: #1a1c20; --ink-2: #555a63; --rule: #e2e1dc; color-scheme: light dark; }
			@media (prefers-color-scheme: dark) { :root { --paper: #111315; --ink: #eeeeec; --ink-2: #a9adb4; --rule: #2c3035; } }
			body { margin: 0; padding: 3rem clamp(1rem, 6vw, 4.5rem); background: var(--paper); color: var(--ink); font: 400 0.9375rem / 1.5rem system-ui, sans-serif; }
			h1 { margin: 0 0 2rem; font: 400 3.25rem / 3.625rem Georgia, serif; }
			ul { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--rule); }
			li { display: grid; gap: 0.25rem 1.5rem; grid-template-columns: minmax(0, 12.5rem) minmax(0, 1fr); padding: 1rem 0; border-bottom: 1px solid var(--rule); }
			a { color: var(--ink); font: 400 1.375rem / 1.75rem Georgia, serif; }
			span { color: var(--ink-2); font-size: 0.8125rem; }
		</style>
	</head>
	<body>
		<h1>Documentation</h1>
		<ul>
${rows}
		</ul>
	</body>
</html>
`;
}

/**
 * Works out which refs to offer: the default branch, then the newest release
 * tags.
 *
 * @returns The refs, newest first after the branch.
 */
async function getRefChoicesAsync(): Promise<Array<RefChoice>> {
	const [branch, tags] = await Promise.all([
		readCommandAsync("git", ["log", "-1", "--format=%h %s", "origin/main"]),
		readCommandAsync("git", ["tag", "--list", "*@*", "--sort=-creatordate"]),
	]);
	const releases = tags
		.split("\n")
		.filter((tag) => tag.length > 0)
		.slice(0, TAG_LIMIT)
		.map((tag) => ({ hint: "release", ref: tag }));

	return [{ hint: branch, ref: "main" }, ...releases];
}

/**
 * Asks which ref to publish from.
 *
 * @returns The chosen branch, tag, or commit.
 * @rejects When the question is canceled.
 */
async function askRefAsync(): Promise<string> {
	const choices = await getRefChoicesAsync();
	const answer = await select({
		message: "Publish from which ref?",
		options: [
			...choices.map(({ hint, ref }) => ({ hint, label: ref, value: ref })),
			{ hint: "a branch, tag, or commit", label: "Another ref…", value: "" },
		],
	});

	if (isCancel(answer)) {
		throw new CliError("Canceled.", 130);
	}

	if (answer.length > 0) return answer;

	const typed = await text({
		message: "Which ref?",
		validate: (value) => ((value ?? "").trim().length === 0 ? "Type a branch, tag, or commit." : undefined),
	});

	if (isCancel(typed)) {
		throw new CliError("Canceled.", 130);
	}

	return typed.trim();
}

/**
 * Checks that the ref is something GitHub can check out.
 *
 * @param ref - A branch, tag, or commit.
 * @rejects When origin has no branch or tag by that name.
 */
async function assertRefExistsAsync(ref: string): Promise<void> {
	if (COMMIT_REGEXP.test(ref)) return;

	const remote = await exec("git", ["ls-remote", "--exit-code", "origin", ref]);
	if (remote.exitCode !== 0) {
		throw new CliError(`origin has no branch or tag named ${ref}. Push it first.`, 1);
	}
}

/**
 * Checks that GitHub Pages is on and deploys from Actions, and offers to turn
 * it on when it isn't.
 *
 * @param repository - The repository, as `owner/name`.
 * @param options - How `publish` was asked to run.
 * @rejects When Pages is off and stays off, or builds from a branch.
 */
async function ensurePagesAsync(repository: string, options: PublishOptions): Promise<void> {
	const result = await exec("gh", ["api", `repos/${repository}/pages`, "--jq", ".build_type"]);
	if (result.exitCode === 0) {
		if (result.stdout.trim() === "workflow") return;
		throw new CliError(`GitHub Pages for ${repository} builds from a branch. Set its source to GitHub Actions.`, 1);
	}

	if (!options.yes) {
		if (!options.interactive) {
			throw new CliError(`GitHub Pages is off for ${repository}. Run this on a terminal, or pass --yes.`, 2);
		}

		const answer = await confirm({
			message: `GitHub Pages is off for ${repository}. Turn it on, deploying from Actions?`,
		});

		if (answer !== true) {
			throw new CliError("GitHub Pages is off, so there is nowhere to publish.", 1);
		}
	}

	await exec("gh", ["api", "--method", "POST", `repos/${repository}/pages`, "-f", "build_type=workflow"], {
		throwOnError: true,
	});
	log.success(`Turned on GitHub Pages for ${repository}.`);
}

/**
 * Asks GitHub for a workflow run that started after a dispatch.
 *
 * @param startedAt - When the dispatch was sent.
 * @returns The run, when GitHub lists one.
 */
async function findRunSinceAsync(startedAt: Date): Promise<undefined | WorkflowRun> {
	const listed = await readCommandAsync("gh", [
		"run",
		"list",
		"--workflow",
		WORKFLOW,
		"--event",
		"workflow_dispatch",
		"--limit",
		"5",
		"--json",
		"databaseId,createdAt,url",
	]);
	const runs = isRunList.assert(parseJson.assert(listed));
	const run = runs.find(({ createdAt }) => new Date(createdAt) >= startedAt);
	return run === undefined ? undefined : { id: run.databaseId, url: run.url };
}

/**
 * Finds the workflow run that a dispatch just started. GitHub lists a run a
 * few seconds after the dispatch, so this asks again until it appears.
 *
 * @param startedAt - When the dispatch was sent.
 * @returns The run, or `undefined` when GitHub never listed it.
 */
async function findDispatchedRunAsync(startedAt: Date): Promise<undefined | WorkflowRun> {
	for (let attempt = 0; attempt < RUN_LOOKUP_ATTEMPTS; attempt += 1) {
		// oxlint-disable-next-line no-await-in-loop -- each try follows the last
		const run = await findRunSinceAsync(startedAt);
		if (run !== undefined) return run;
		// oxlint-disable-next-line no-await-in-loop -- the wait between tries
		await delay(RUN_LOOKUP_INTERVAL_MS);
	}

	return undefined;
}

/**
 * Asks before publishing, unless `--yes` was passed.
 *
 * @param count - How many sites will be published.
 * @param options - How `publish` was asked to run.
 * @returns Whether to go ahead.
 */
async function confirmPublishAsync(count: number, options: PublishOptions): Promise<boolean> {
	if (options.yes) return true;

	const sites = count === 1 ? "this site" : `these ${count} sites`;
	const answer = await confirm({ message: `Publish ${sites}?` });
	return !isCancel(answer) && answer;
}

/**
 * Starts the documentation workflow and follows it until it finishes.
 *
 * @param dispatch - The `gh` arguments that start the workflow.
 * @param sites - The sites it publishes.
 * @param options - How `publish` was asked to run.
 * @rejects When the workflow can't start, or fails while being followed.
 */
async function dispatchAsync(
	dispatch: ReadonlyArray<string>,
	sites: ReadonlyArray<DocumentationSiteEntry>,
	options: PublishOptions,
): Promise<void> {
	// Allow for clock drift between this machine and GitHub.
	const startedAt = new Date(Date.now() - 5000);
	await exec("gh", dispatch, { throwOnError: true });
	const run = await findDispatchedRunAsync(startedAt);
	if (run === undefined) {
		log.warn(`Started the workflow, but GitHub hasn't listed the run yet. See: gh run list --workflow ${WORKFLOW}`);
		return;
	}

	log.info(`Workflow run: ${run.url}`);

	if (!options.watch) return;

	await exec("gh", ["run", "watch", String(run.id), "--exit-status"], {
		nodeOptions: { stdio: "inherit" },
		throwOnError: true,
	});
	const urls = sites.map(({ url }) => url);
	if (options.interactive) {
		outro(`Published. ${urls.join("  ")}`);
	} else {
		stdout.write(`${urls.join("\n")}\n`);
	}
}

/**
 * Publishes every documentation site from one ref.
 *
 * @param givenRef - The ref from `--ref`, if any.
 * @param options - How `publish` was asked to run.
 * @rejects When something stops the publish, with a message saying what.
 */
async function publishAsync(givenRef: string | undefined, options: PublishOptions): Promise<void> {
	if (!options.interactive && !options.yes) {
		throw new CliError("Not on a terminal, so there is no one to ask. Pass --yes.", 2);
	}

	const sites = await getSitesAsync(cwd());

	if (options.interactive) {
		intro("Publish the documentation");
	}

	const fallbackRef = options.yes ? "main" : undefined;
	const ref = givenRef ?? fallbackRef ?? (await askRefAsync());
	await assertRefExistsAsync(ref);

	if (options.interactive) {
		const summary = sites.map(({ name, url }) => `${name}  ${url}`).join("\n");
		note(summary, `From ${ref}, to ${DOCUMENTATION_ORIGIN}${REPOSITORY_PATH}/`);
	}

	// The workflow file always comes from main; `ref` picks what it builds.
	const dispatch = ["workflow", "run", WORKFLOW, "--ref", "main", "-f", `ref=${ref}`];
	if (options.dryRun) {
		stdout.write(`gh ${dispatch.join(" ")}\n`);

		if (options.interactive) {
			outro("Dry run: nothing was started.");
		}

		return;
	}

	const repository = await readCommandAsync("gh", [
		"repo",
		"view",
		"--json",
		"nameWithOwner",
		"--jq",
		".nameWithOwner",
	]);

	await ensurePagesAsync(repository, options);

	if (!(await confirmPublishAsync(sites.length, options))) {
		cancel("Nothing was published.");
		return;
	}

	await dispatchAsync(dispatch, sites, options);
}

const assembleCommand = new Command()
	.description("Gather every built site into one folder for GitHub Pages, with a page that lists them.")
	.option("-o, --output <directory:string>", "Where the folder goes.", { default: "_site" })
	.action(async ({ output }) => {
		const rootDirectory = cwd();
		const sites = await getSitesAsync(rootDirectory);
		const missing = sites.filter(
			({ name }) => !existsSync(nodePath.join(rootDirectory, DOCUMENTATION_DIRECTORY, name, "dist")),
		);

		if (missing.length > 0) {
			const names = missing.map(({ name }) => `documentation/${name}`).join(", ");
			throw new CliError(
				`Not built yet: ${names}. Run: node --run turbo -- run build --filter=./documentation/*`,
				1,
			);
		}

		const outputDirectory = nodePath.resolve(rootDirectory, output);
		await rm(outputDirectory, { force: true, recursive: true });
		await mkdir(outputDirectory, { recursive: true });
		await Promise.all(
			sites.map(async ({ name }) =>
				cp(
					nodePath.join(rootDirectory, DOCUMENTATION_DIRECTORY, name, "dist"),
					nodePath.join(outputDirectory, name),
					{
						recursive: true,
					},
				),
			),
		);
		await writeFile(nodePath.join(outputDirectory, "index.html"), renderIndex(sites), "utf8");
		await writeFile(nodePath.join(outputDirectory, ".nojekyll"), "", "utf8");
		stdout.write(`${nodePath.relative(rootDirectory, outputDirectory)}\n`);
	});

const listCommand = new Command()
	.description("List the documentation sites and where they publish.")
	.action(async () => {
		const sites = await getSitesAsync(cwd());
		stdout.write(sites.map(({ name, url }) => `${name}\t${url}\n`).join(""));
	});

const publishCommand = new Command()
	.description("Publish the documentation sites to GitHub Pages, by running the documentation workflow.")
	.option("-r, --ref <ref:string>", "The branch, tag, or commit to build. Asks when not given.")
	.option("-y, --yes", "Publish without asking. Without --ref, publishes main.")
	.option("--no-watch", "Return once the workflow starts, instead of following it.")
	.option("--dry-run", "Show what would be published without starting anything.")
	.action(async ({ dryRun = false, ref, watch, yes = false }) => {
		const interactive = stdin.isTTY && stdout.isTTY;
		await publishAsync(ref, { dryRun, interactive, watch, yes });
	});

const command = createBaseCommand(scriptName, "1.0.0", "Builds, gathers, and publishes the documentation sites.", {
	showHelpWithoutArguments: true,
})
	.command("assemble", assembleCommand)
	.command("list", listCommand)
	.command("publish", publishCommand);

await command.parse(argv.slice(2));

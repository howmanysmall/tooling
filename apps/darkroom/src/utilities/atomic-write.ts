import { randomBytes } from "node:crypto";
import { link, mkdir, rename, rm, writeFile } from "node:fs/promises";
import nodePath from "node:path";

import { addCollisionSuffix } from "$generation/output-paths";
import { getErrorCode } from "$utilities/error-utilities";

/**
 * File systems without hard links (exFAT, some network mounts) report these.
 */
const NO_LINK_CODES: ReadonlySet<string> = new Set(["ENOSYS", "ENOTSUP", "EPERM", "EXDEV"]);
const MAX_ATTEMPTS = 1000;

function getTemporaryPath(path: string): string {
	return nodePath.join(nodePath.dirname(path), `.${nodePath.basename(path)}.${randomBytes(6).toString("hex")}.tmp`);
}

async function writeTemporaryAsync(path: string, bytes: Uint8Array): Promise<string> {
	await mkdir(nodePath.dirname(path), { recursive: true });
	const temporaryPath = getTemporaryPath(path);
	await writeFile(temporaryPath, bytes, { flag: "wx" });
	return temporaryPath;
}

/**
 * Places a finished temporary file at `candidate` without ever replacing an
 * existing file.
 *
 * @param temporaryPath - The fully written temporary file.
 * @param candidate - Where it should go.
 * @param bytes - The contents, for file systems without hard links.
 * @returns `true` when placed, `false` when `candidate` already exists.
 * @rejects When the file can't be written for a reason other than a
 *   name collision.
 */
async function placeExclusiveAsync(temporaryPath: string, candidate: string, bytes: Uint8Array): Promise<boolean> {
	try {
		await link(temporaryPath, candidate);
		return true;
	} catch (error) {
		if (!(error instanceof Error)) throw error;
		const code = getErrorCode(error);
		if (code === "EEXIST") return false;
		if (code === undefined || !NO_LINK_CODES.has(code)) throw error;
	}

	try {
		await writeFile(candidate, bytes, { flag: "wx" });
		return true;
	} catch (error) {
		if (error instanceof Error && getErrorCode(error) === "EEXIST") return false;
		throw error;
	}
}

/**
 * Writes a file without overwriting anything. When `path` exists, tries
 * `name-2.ext`, `name-3.ext`, and so on.
 *
 * The contents are written to a temporary file in the same directory first,
 * so a reader never sees a half-written image.
 *
 * @param path - The preferred path.
 * @param bytes - The contents.
 * @returns The path actually written.
 * @rejects When the directory can't be written to.
 */
export async function writeFileNoClobberAsync(path: string, bytes: Uint8Array): Promise<string> {
	const temporaryPath = await writeTemporaryAsync(path, bytes);
	try {
		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
			const candidate = addCollisionSuffix(path, attempt);
			// oxlint-disable-next-line no-await-in-loop -- each attempt depends on the previous one failing
			if (await placeExclusiveAsync(temporaryPath, candidate, bytes)) return candidate;
		}

		throw new Error(`Could not find a free file name for ${path}.`);
	} finally {
		await rm(temporaryPath, { force: true });
	}
}

/**
 * Writes a file atomically, replacing it if it exists.
 *
 * @param path - The destination.
 * @param bytes - The contents.
 * @returns `path`.
 * @rejects When the file can't be written or renamed into place.
 */
export async function writeFileAtomicAsync(path: string, bytes: string | Uint8Array): Promise<string> {
	const data = bytes instanceof Uint8Array ? bytes : new TextEncoder().encode(bytes);
	const temporaryPath = await writeTemporaryAsync(path, data);
	try {
		await rename(temporaryPath, path);
	} catch (error) {
		await rm(temporaryPath, { force: true });
		throw error;
	}

	return path;
}

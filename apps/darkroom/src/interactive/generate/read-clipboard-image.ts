import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { platform } from "node:process";

import { parsePastedImagePaths } from "./prompt-images";

// A copied file, from Finder or a clipboard manager, comes as a file URL.
const READ_FILE_SCRIPT = "POSIX path of (the clipboard as «class furl»)";

// A copied picture, from a screenshot or a browser, comes as PNG data.
const SAVE_PICTURE_SCRIPT = [
	"on run {outputPath}",
	"set pngData to the clipboard as «class PNGf»",
	"set fileHandle to open for access (POSIX file outputPath) with write permission",
	"write pngData to fileHandle",
	"close access fileHandle",
	"end run",
].join("\n");

async function runOsaScriptAsync(script: string, ...parameters: ReadonlyArray<string>): Promise<string | undefined> {
	return new Promise((resolve) => {
		execFile("osascript", ["-e", script, ...parameters], (error, stdout) => {
			resolve(error === null ? stdout.trim() : undefined);
		});
	});
}

/**
 * Finds the image on the clipboard: a copied image file, or a copied picture
 * saved to the temporary directory, since it has no file of its own. Only
 * macOS is supported; terminals can't paste a picture, so it has to be asked
 * for.
 *
 * @returns The image's path, or `undefined` when there is no image.
 */
export async function readClipboardImageAsync(): Promise<string | undefined> {
	if (platform !== "darwin") return undefined;

	const file = await runOsaScriptAsync(READ_FILE_SCRIPT);
	const paths = file === undefined ? undefined : parsePastedImagePaths(file);
	if (paths !== undefined) return paths[0];

	const target = nodePath.join(tmpdir(), `darkroom-clipboard-${randomUUID()}.png`);
	const saved = await runOsaScriptAsync(SAVE_PICTURE_SCRIPT, target);
	return saved === undefined ? undefined : target;
}

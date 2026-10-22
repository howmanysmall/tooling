import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import nodePath from "node:path";

async function isWritableAsync(path: string): Promise<boolean> {
	try {
		await access(path, constants.W_OK);
		return true;
	} catch {
		return false;
	}
}

/**
 * Picks the folder images go to by default. Claude Code starts the server in
 * the project, which is where its images belong. Claude Desktop starts it in
 * `/`, which can't be written, so images go to `~/Pictures/darkroom` instead.
 *
 * @param cwd - Where the client started the server.
 * @param home - The user's home folder.
 * @returns A folder that exists and can be written.
 */
export async function chooseOutputDirectoryAsync(cwd: string, home = homedir()): Promise<string> {
	if (nodePath.parse(cwd).root !== cwd && (await isWritableAsync(cwd))) return cwd;

	const pictures = nodePath.join(home, "Pictures", "darkroom");
	await mkdir(pictures, { recursive: true });
	return pictures;
}

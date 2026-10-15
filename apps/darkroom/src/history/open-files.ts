import { spawn } from "node:child_process";
import { platform } from "node:process";

interface OpenCommand {
	readonly command: string;
	readonly parameters: ReadonlyArray<string>;
}

/**
 * Works out how to open files in the system viewer.
 *
 * @param paths - The files.
 * @param system - The platform, from `process.platform`.
 * @returns One command per process to start.
 */
export function getOpenCommands(paths: ReadonlyArray<string>, system: NodeJS.Platform): Array<OpenCommand> {
	if (system === "darwin") {
		return [{ command: "open", parameters: paths }];
	}
	if (system === "win32") {
		return paths.map((path) => ({ command: "cmd", parameters: ["/c", "start", '""', path] }));
	}
	return paths.map((path) => ({ command: "xdg-open", parameters: [path] }));
}

/**
 * Opens files in the system's default viewer without waiting for it.
 *
 * @param paths - Absolute paths of the images to show.
 */
export async function openFilesAsync(paths: ReadonlyArray<string>): Promise<void> {
	await Promise.all(
		getOpenCommands(paths, platform).map(async ({ command, parameters }) => {
			const { promise, reject, resolve } = Promise.withResolvers<void>();
			const child = spawn(command, parameters, { detached: true, stdio: "ignore" });
			child.once("error", reject);
			child.once("spawn", () => {
				child.unref();
				resolve();
			});
			return promise;
		}),
	);
}

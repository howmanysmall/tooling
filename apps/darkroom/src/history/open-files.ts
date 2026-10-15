import { spawn } from "node:child_process";
import { platform } from "node:process";

interface OpenCommand {
	readonly arguments_: ReadonlyArray<string>;
	readonly command: string;
}

/**
 * Works out how to open files in the system viewer.
 *
 * @param paths - The files.
 * @param system - The platform, from `process.platform`.
 * @returns One command per process to start.
 */
export function getOpenCommands(paths: ReadonlyArray<string>, system: NodeJS.Platform): Array<OpenCommand> {
	if (system === "darwin") return [{ arguments_: paths, command: "open" }];
	if (system === "win32") return paths.map((path) => ({ arguments_: ["/c", "start", '""', path], command: "cmd" }));
	return paths.map((path) => ({ arguments_: [path], command: "xdg-open" }));
}

/**
 * Opens files in the system's default viewer without waiting for it.
 *
 * @param paths - Absolute paths of the images to show.
 */
export async function openFilesAsync(paths: ReadonlyArray<string>): Promise<void> {
	await Promise.all(
		getOpenCommands(paths, platform).map(
			async ({ arguments_, command }) =>
				new Promise<void>((resolve, reject) => {
					const child = spawn(command, arguments_, { detached: true, stdio: "ignore" });
					child.once("error", reject);
					child.once("spawn", () => {
						child.unref();
						resolve();
					});
				}),
		),
	);
}

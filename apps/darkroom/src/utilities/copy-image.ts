import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { env, platform } from "node:process";

/** A program that puts a PNG file on the system clipboard. */
export interface ClipboardCommand {
	readonly command: string;
	readonly parameters: ReadonlyArray<string>;
}

function quoteForAppleScript(path: string): string {
	const escaped = path.replaceAll("\\", String.raw`\\`).replaceAll('"', String.raw`\"`);
	return `"${escaped}"`;
}

function isWaylandSession({ WAYLAND_DISPLAY }: NodeJS.ProcessEnv): boolean {
	return WAYLAND_DISPLAY !== undefined;
}

/**
 * Runs a program and waits for it to succeed.
 *
 * @param command - The program.
 * @param parameters - Its arguments.
 * @returns Once it has exited cleanly.
 * @rejects With what it printed to stderr, when it fails or can't start.
 */
async function runAsync(command: string, parameters: ReadonlyArray<string>): Promise<void> {
	const { promise, reject, resolve } = Promise.withResolvers<void>();
	const child = spawn(command, parameters, { stdio: ["ignore", "ignore", "pipe"] });
	let errorOutput = "";
	child.stderr.setEncoding("utf8");
	child.stderr.on("data", (chunk: string) => {
		errorOutput += chunk;
	});
	child.once("error", reject);
	child.once("close", (code) => {
		if (code === 0) resolve();
		else reject(new Error(errorOutput.trim() || `${command} exited with ${code}.`));
	});
	return promise;
}

function quoteForPowerShell(path: string): string {
	return `'${path.replaceAll("'", "''")}'`;
}

/**
 * Works out how to put a PNG on the clipboard. Terminals can only copy
 * text, so this goes through the system: AppleScript on macOS, PowerShell
 * on Windows, and `wl-copy` or `xclip` elsewhere.
 *
 * @param png - The PNG file to copy.
 * @param system - The platform, from `process.platform`.
 * @param isWayland - Whether a Wayland session is running.
 * @returns The command to run.
 */
export function getClipboardCommand(png: string, system: NodeJS.Platform, isWayland: boolean): ClipboardCommand {
	if (system === "darwin") {
		const script = `set the clipboard to (read (POSIX file ${quoteForAppleScript(png)}) as «class PNGf»)`;
		return { command: "osascript", parameters: ["-e", script] };
	}

	if (system === "win32") {
		const script = [
			"Add-Type -AssemblyName System.Windows.Forms, System.Drawing",
			`[System.Windows.Forms.Clipboard]::SetImage([System.Drawing.Image]::FromFile(${quoteForPowerShell(png)}))`,
		].join("; ");

		return { command: "powershell", parameters: ["-NoProfile", "-STA", "-Command", script] };
	}

	if (isWayland) return { command: "sh", parameters: ["-c", 'wl-copy --type image/png < "$1"', "sh", png] };
	return { command: "xclip", parameters: ["-selection", "clipboard", "-t", "image/png", "-i", png] };
}

/**
 * Copies an image, not its path, to the system clipboard, converting it to
 * PNG first, since that is what every clipboard takes.
 *
 * @param path - The image to copy.
 * @rejects When the image can't be read or no clipboard program works.
 */
export async function copyImageAsync(path: string): Promise<void> {
	const directory = await mkdtemp(nodePath.join(tmpdir(), "darkroom-copy-"));
	try {
		const png = nodePath.join(directory, "image.png");
		const { default: sharp } = await import("sharp");
		await sharp(path).png().toFile(png);
		const { command, parameters } = getClipboardCommand(png, platform, isWaylandSession(env));
		await runAsync(command, parameters);
	} finally {
		await rm(directory, { force: true, recursive: true });
	}
}

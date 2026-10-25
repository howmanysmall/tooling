import nodePath from "node:path";

import { runBrowserTask } from "$interactive/app/run-browser-task";
import { CommandGroup } from "$interactive/keys/browser-command";
import { BrowserKey, formatClipboardSequence } from "$interactive/keys/browser-keys";

import type { BrowserCommand } from "$interactive/keys/browser-command";

import type { StatusReporter } from "./status-message";

/** What the image actions act through: the clipboard and the viewer. */
export interface ImageCommandEnvironment extends StatusReporter {
	/** Copies an image itself to the system clipboard. */
	readonly copyImageAsync: (path: string) => Promise<void>;
	/** Opens images in the system viewer. */
	readonly openImagesAsync: (paths: ReadonlyArray<string>) => Promise<void>;
	/** Writes escape sequences to the terminal, for copying text. */
	readonly write: (data: string) => void;
}

const group = CommandGroup.Act;

/**
 * Copies text with OSC 52 and says so.
 *
 * @param environment - The terminal and the toast.
 * @param text - What to copy.
 * @param what - What it is, for the toast, like `the path`.
 */
export function copyText(environment: ImageCommandEnvironment, text: string, what: string): void {
	environment.write(formatClipboardSequence(text));
	environment.reportSuccess(`Copied ${what}`);
}

function runTask(environment: ImageCommandEnvironment, task: Promise<void>, success: string, failure: string): void {
	runBrowserTask(task, (error) => {
		if (error === undefined) {
			environment.reportSuccess(success);
		} else {
			environment.reportError(`${failure}: ${error}`);
		}
	});
}

/**
 * What you can do with any image file: copy the picture itself, open it,
 * or copy its path.
 *
 * @param path - The image's absolute path.
 * @param environment - The clipboard, the viewer, and the toast.
 * @returns The actions, in the order a dialog lists them.
 */
export function getImageFileCommands(path: string, environment: ImageCommandEnvironment): Array<BrowserCommand> {
	const name = nodePath.basename(path);
	return [
		{
			key: BrowserKey.ImageCopy,
			description: "copy the picture itself",
			group,
			keyLabel: "",
			run(): void {
				runTask(environment, environment.copyImageAsync(path), `Copied ${name}`, "Couldn't copy the image");
			},
			title: "Copy image",
		},
		{
			key: BrowserKey.ImageOpen,
			description: "in the system viewer",
			group,
			keyLabel: "",
			run(): void {
				runTask(environment, environment.openImagesAsync([path]), `Opened ${name}`, "Couldn't open the image");
			},
			title: "Open",
		},
		{
			key: BrowserKey.ImageCopyPath,
			description: "where it was saved",
			group,
			keyLabel: "",
			run(): void {
				copyText(environment, path, "the path");
			},
			title: "Copy path",
		},
	];
}

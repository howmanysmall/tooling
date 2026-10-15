import nodePath from "node:path";

import { runBrowserTask } from "$interactive/app/run-browser-task";
import { CommandGroup } from "$interactive/keys/browser-command";
import { BrowserKey, formatClipboardSequence } from "$interactive/keys/browser-keys";

import { GenerateDialog } from "./generate-screen-state";

import type { BrowserCommand } from "$interactive/keys/browser-command";
import type { SessionActions } from "$interactive/session/session-context";
import type { BaseImage, SessionTurn } from "$interactive/session/session-state";

import type { OpenDialog } from "./generate-screen-state";

/** What the prompt and image actions act through. */
export interface TranscriptEnvironment {
	/** Copies an image itself to the system clipboard. */
	readonly copyImageAsync: (path: string) => Promise<void>;
	/** Puts text in the prompt box, replacing what was there. */
	readonly fillPrompt: (text: string) => void;
	/** Opens images in the system viewer. */
	readonly openImagesAsync: (paths: ReadonlyArray<string>) => Promise<void>;
	readonly reportError: (text: string) => void;
	readonly reportSuccess: (text: string) => void;
	readonly session: SessionActions;
	/** Writes escape sequences to the terminal, for copying text. */
	readonly write: (data: string) => void;
}

const group = CommandGroup.Act;

function copyText(environment: TranscriptEnvironment, text: string, what: string): void {
	environment.write(formatClipboardSequence(text));
	environment.reportSuccess(`Copied ${what}`);
}

function runTask(environment: TranscriptEnvironment, task: Promise<void>, success: string, failure: string): void {
	runBrowserTask(task, (error) => {
		if (error === undefined) environment.reportSuccess(success);
		else environment.reportError(`${failure}: ${error}`);
	});
}

/** The actions dialog for something clicked in the transcript. */
export interface TranscriptDialog {
	readonly commands: ReadonlyArray<BrowserCommand>;
	/** What was clicked, like `Prompt`. */
	readonly title: string;
}

/**
 * Picks the actions for the dialog open over the generate screen, when it
 * is about a prompt or an image you clicked.
 *
 * @param dialog - The dialog the screen opened, if any.
 * @param environment - The session, the prompt box, and the clipboard.
 * @returns The dialog's title and actions, or `undefined` for other dialogs.
 */
export function getTranscriptDialog(
	dialog: OpenDialog | undefined,
	environment: TranscriptEnvironment,
): TranscriptDialog | undefined {
	if (dialog?.kind === GenerateDialog.Prompt) {
		return { commands: getPromptCommands(dialog.turn, environment), title: "Prompt" };
	}
	if (dialog?.kind === GenerateDialog.Image) {
		return { commands: getImageCommands(dialog.image, environment), title: "Image" };
	}
	return undefined;
}

/**
 * What you can do with a prompt you clicked: go back to before it to try
 * again, here or in a new tab, use it again, or copy it.
 *
 * @param turn - The turn whose prompt was clicked.
 * @param environment - The session and the prompt box.
 * @returns The actions, in the order the dialog lists them.
 */
export function getPromptCommands(turn: SessionTurn, environment: TranscriptEnvironment): Array<BrowserCommand> {
	const { fillPrompt, session } = environment;
	return [
		{
			key: BrowserKey.PromptRewind,
			description: "edit it again, from the image before",
			group,
			keyLabel: "",
			run(): void {
				session.rewind(turn.id);
				fillPrompt(turn.prompt);
			},
			title: "Rewind",
		},
		{
			key: BrowserKey.PromptFork,
			description: "the same, in a new tab",
			group,
			keyLabel: "",
			run(): void {
				session.fork(turn.id);
				fillPrompt(turn.prompt);
			},
			title: "Fork",
		},
		{
			key: BrowserKey.PromptReuse,
			description: "put it in the prompt box",
			group,
			keyLabel: "",
			run(): void {
				fillPrompt(turn.prompt);
			},
			title: "Use again",
		},
		{
			key: BrowserKey.PromptCopy,
			description: "copy its text",
			group,
			keyLabel: "",
			run(): void {
				copyText(environment, turn.prompt, "the prompt");
			},
			title: "Copy",
		},
	];
}

/**
 * What you can do with an image you clicked: edit it next, copy the image
 * itself, open it, or copy where it was saved.
 *
 * @param image - The image that was clicked.
 * @param environment - The session, the clipboard, and the viewer.
 * @returns The actions, in the order the dialog lists them.
 */
export function getImageCommands(image: BaseImage, environment: TranscriptEnvironment): Array<BrowserCommand> {
	const { path } = image;
	const name = nodePath.basename(path);
	return [
		{
			key: BrowserKey.ImageEdit,
			description: "the next prompt changes it",
			group,
			keyLabel: "",
			run(): void {
				environment.session.chooseBase(image);
			},
			title: "Edit",
		},
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

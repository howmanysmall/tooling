import { copyText, getImageFileCommands } from "$interactive/components/image-commands";
import { CommandGroup } from "$interactive/keys/browser-command";
import { BrowserKey } from "$interactive/keys/browser-keys";
import { isSettled } from "$interactive/session/session-actions";

import { GenerateDialog } from "./generate-screen-state";

import type { ImageCommandEnvironment } from "$interactive/components/image-commands";
import type { BrowserCommand } from "$interactive/keys/browser-command";
import type { SessionActions } from "$interactive/session/session-context";
import type { BaseImage, SessionTurn } from "$interactive/session/session-state";

import type { OpenDialog } from "./generate-screen-state";

/** What the prompt and image actions act through. */
export interface TranscriptEnvironment extends ImageCommandEnvironment {
	/** Asks whether to delete a turn and its images. */
	readonly askDelete: (turn: SessionTurn) => void;
	/** Puts text in the prompt box, replacing what was there. */
	readonly fillPrompt: (text: string) => void;
	readonly session: SessionActions;
	/** The session's turns, to find the one that made an image. */
	readonly turns: ReadonlyArray<SessionTurn>;
}

const group = CommandGroup.Act;

function getDeleteCommand(
	key: BrowserKey,
	turn: SessionTurn | undefined,
	environment: TranscriptEnvironment,
): Array<BrowserCommand> {
	if (turn === undefined || !isSettled(turn)) {
		return [];
	}

	return [
		{
			key,
			description: turn.result === undefined ? "take it out of the session" : "from the session and the history",
			group,
			keyLabel: "",
			run(): void {
				environment.askDelete(turn);
			},
			title: "Delete",
		},
	];
}

function findTurn(turns: ReadonlyArray<SessionTurn>, path: string): SessionTurn | undefined {
	return turns.find((turn) => turn.result?.images.some((image) => image.path === path) === true);
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
 * again, here or in a new tab, use it again, copy it, or delete it once it
 * is over.
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
		...getDeleteCommand(BrowserKey.PromptDelete, turn, environment),
	];
}

/**
 * What you can do with an image you clicked: edit it next, copy the image
 * itself, open it, copy where it was saved, or delete its run.
 *
 * @param image - The image that was clicked.
 * @param environment - The session, the clipboard, and the viewer.
 * @returns The actions, in the order the dialog lists them.
 */
export function getImageCommands(image: BaseImage, environment: TranscriptEnvironment): Array<BrowserCommand> {
	const { path } = image;
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
		...getImageFileCommands(path, environment),
		...getDeleteCommand(BrowserKey.ImageDelete, findTurn(environment.turns, path), environment),
	];
}

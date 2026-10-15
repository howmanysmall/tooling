import { useReducer } from "react";
import { Box, useApp, useWindowSize } from "ink";

import { getModelPrices } from "$generation/observed-prices";
import { BrowserShell } from "$interactive/app/browser-shell";
import { DarkroomLogo } from "$interactive/components/darkroom-logo";
import { KeyHints } from "$interactive/components/key-hints";
import { ScreenHeader } from "$interactive/components/screen-header";
import { StatusBar } from "$interactive/components/status-bar";
import { createStatusReporter } from "$interactive/components/status-message";
import { findCommand } from "$interactive/keys/browser-command";
import { useSession } from "$interactive/session/session-context";
import { SessionTranscript } from "$interactive/session/session-transcript";

import { getGenerateCommands, getGenerateKey } from "./generate-commands";
import { GenerateConfirmDialog } from "./generate-confirm-dialog";
import { INITIAL_GENERATE_STATE, reduceGenerateScreen } from "./generate-screen-state";
import { ModelPickerDialog } from "./model-picker-dialog";
import { PromptBox } from "./prompt-box";
import { getEditorAction } from "./prompt-editor-state";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { Key } from "ink";
import type { ReactNode } from "react";

import type { KeyHint } from "$interactive/components/key-hints";
import type { ModelCatalog } from "$interactive/models/model-browser-state";
import type { CellBox } from "$preview/cell-fit";
import type { LoadingPreview } from "$preview/load-preview";

import type { GenerateActions } from "./generate-commands";
import type { GenerateScreenAction } from "./generate-screen-state";

/** What the prompt box asks to generate. */
export interface GenerateRequest {
	readonly model: ImageModelListItem;
	readonly prompt: string;
}

export interface GenerateScreenProperties {
	catalog: ModelCatalog;
	/** Loads a preview of a saved image, or `undefined` when previews are off. */
	getPreview: (path: string, box: CellBox) => LoadingPreview | undefined;
	/** The model to generate with, or `undefined` when there are none. */
	model?: ImageModelListItem | undefined;
	/** Takes a model picked here; the app remembers it across tabs. */
	onChooseModel: (model: ImageModelListItem) => void;
	/** Closes the app for the guided session, with references and settings. */
	onGenerateWithOptions: (request: GenerateRequest) => void;
	/** Models you used lately, most recent first. */
	recentIds: ReadonlyArray<string>;
}

const BOX_HINTS: ReadonlyArray<KeyHint> = [
	["⏎", "generate"],
	["ctrl+j", "new line"],
	["ctrl+o", "model"],
];
const STATUS_HINTS: ReadonlyArray<KeyHint> = [
	["tab", "next tab"],
	["ctrl+n", "new session"],
];
// The widest the prompt box gets on the home screen, so lines stay readable.
const MAX_HOME_WIDTH = 84;
// The header, the prompt box with its model line, its hints, and the status bar.
const SESSION_CHROME_ROWS = 1 + 6 + 1 + 1;

const OPEN_PICKER: GenerateScreenAction = { isPicking: true, type: "picking" };
const CLOSE_PICKER: GenerateScreenAction = { isPicking: false, type: "picking" };
const CLEAR_PROMPT: GenerateScreenAction = { action: { type: "clear" }, type: "edit" };
const NEW_LINE: GenerateScreenAction = { action: { text: "\n", type: "insert" }, type: "edit" };

/**
 * The generate tab, like a chat: the logo and a centered prompt box until
 * the first request, then the session's turns with the prompt box pinned
 * beneath them. Enter prices the prompt and asks before anything is sent;
 * the images appear in the turn once saved. A sent request is never
 * canceled, so `ctrl+c` only clears the prompt, or quits when it is empty.
 *
 * @param properties - The models and how to show results.
 * @param properties.catalog - The models and what they cost.
 * @param properties.getPreview - Loads previews of saved images.
 * @param properties.model - The model to generate with.
 * @param properties.onChooseModel - Takes a model picked here.
 * @param properties.onGenerateWithOptions - Opens the guided session.
 * @param properties.recentIds - Models used lately.
 * @returns The whole screen, sized to the terminal.
 */
export function GenerateScreen({
	catalog,
	getPreview,
	model,
	onChooseModel,
	onGenerateWithOptions,
	recentIds,
}: Readonly<GenerateScreenProperties>): ReactNode {
	const [screen, dispatch] = useReducer(reduceGenerateScreen, INITIAL_GENERATE_STATE);
	const session = useSession();
	const { exit } = useApp();
	const { columns, rows } = useWindowSize();
	const { reportError } = createStatusReporter(dispatch);
	const isHome = session.state.turns.length === 0;
	const boxWidth = isHome ? Math.min(MAX_HOME_WIDTH, columns - 8) : columns - 4;
	const prompt = screen.editor.text.trim();

	function generate(): void {
		if (model === undefined) {
			reportError("There are no models to generate with.");
		} else if (prompt.length === 0) {
			reportError("Write a prompt first.");
		} else {
			session.actions.send({ model, prompt, type: "new" });
			dispatch(CLEAR_PROMPT);
		}
	}

	function interrupt(): void {
		if (screen.editor.text.length === 0) exit();
		else dispatch(CLEAR_PROMPT);
	}

	function closePicker(): void {
		dispatch(CLOSE_PICKER);
	}

	function handleCancel(): void {
		session.actions.dismiss();
	}

	function handleConfirm(): void {
		session.actions.confirm();
	}

	const actions: GenerateActions = {
		chooseModel(): void {
			dispatch(OPEN_PICKER);
		},
		clearPrompt(): void {
			dispatch(CLEAR_PROMPT);
		},
		generate,
		generateWithOptions(): void {
			if (model === undefined) reportError("There are no models to generate with.");
			else {
				onGenerateWithOptions({ model, prompt });
				exit();
			}
		},
		insertNewLine(): void {
			dispatch(NEW_LINE);
		},
		newSession: session.actions.newSession,
	};
	const commands = getGenerateCommands(actions);

	function captureTyping(input: string, key: Key): void {
		const command = findCommand(commands, getGenerateKey(input, key));
		if (command !== undefined) {
			command.run();
			return;
		}

		const action = getEditorAction(input, key);
		if (action !== undefined) dispatch({ action, type: "edit" });
	}

	const promptBox = (
		<PromptBox
			editor={screen.editor}
			model={model}
			prices={model === undefined ? undefined : getModelPrices(catalog.pricing, catalog.observed, model.id)}
			width={boxWidth}
		/>
	);
	const boxHints = (
		<Box flexShrink={0} justifyContent="flex-end" width={boxWidth}>
			<KeyHints hints={BOX_HINTS} />
		</Box>
	);
	const { pending } = session.state;

	return (
		<BrowserShell
			capture={captureTyping}
			columns={columns}
			commands={commands}
			hasDialog={screen.isPicking || pending !== undefined}
			rows={rows}
			status={screen.status}
			onInterrupt={interrupt}
		>
			<ScreenHeader title="generate" />
			{isHome ? (
				<Box alignItems="center" flexDirection="column" flexGrow={1} justifyContent="center" rowGap={1}>
					<DarkroomLogo />
					{promptBox}
					{boxHints}
				</Box>
			) : (
				<Box flexDirection="column" flexGrow={1}>
					<SessionTranscript
						columns={columns}
						getPreview={getPreview}
						rows={rows - SESSION_CHROME_ROWS}
						turns={session.state.turns}
					/>
					<Box alignItems="center" flexDirection="column" flexShrink={0} marginTop={1}>
						{promptBox}
						{boxHints}
					</Box>
				</Box>
			)}
			<StatusBar commands={commands} summary={`${catalog.models.length} models`}>
				<KeyHints hints={STATUS_HINTS} />
			</StatusBar>
			{screen.isPicking ? (
				<ModelPickerDialog
					catalog={catalog}
					columns={columns}
					currentId={model?.id}
					recentIds={recentIds}
					rows={rows}
					onClose={closePicker}
					onPick={onChooseModel}
				/>
			) : null}
			{pending === undefined ? null : (
				<GenerateConfirmDialog
					columns={columns}
					pending={pending}
					rows={rows}
					onCancel={handleCancel}
					onConfirm={handleConfirm}
				/>
			)}
		</BrowserShell>
	);
}

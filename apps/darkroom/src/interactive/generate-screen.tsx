import { useReducer } from "react";
import { Box, useApp, useWindowSize } from "ink";

import { getModelPrices } from "$generation/observed-prices";

import { findCommand } from "./browser-command";
import { BrowserShell } from "./browser-shell";
import { DarkroomLogo } from "./darkroom-logo";
import { getGenerateCommands, getGenerateKey } from "./generate-commands";
import { INITIAL_GENERATE_STATE, reduceGenerateScreen } from "./generate-screen-state";
import { KeyHints } from "./key-hints";
import { ModelPickerDialog } from "./model-picker-dialog";
import { PromptBox } from "./prompt-box";
import { getEditorAction } from "./prompt-editor-state";
import { ScreenHeader } from "./screen-header";
import { StatusBar } from "./status-bar";
import { createStatusReporter } from "./status-message";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { Key } from "ink";
import type { ReactNode } from "react";

import type { GenerateActions } from "./generate-commands";
import type { GenerateScreenAction } from "./generate-screen-state";
import type { KeyHint } from "./key-hints";
import type { ModelCatalog } from "./model-browser-state";

/** What the prompt box asks to generate. */
export interface GenerateRequest {
	readonly model: ImageModelListItem;
	readonly prompt: string;
}

export interface GenerateScreenProperties {
	catalog: ModelCatalog;
	/** The model to generate with, or `undefined` when there are none. */
	model?: ImageModelListItem | undefined;
	/** Takes a model picked here; the app remembers it across tabs. */
	onChooseModel: (model: ImageModelListItem) => void;
	/** Takes the request; the app closes and asks before spending. */
	onGenerate: (request: GenerateRequest, withOptions: boolean) => void;
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
	["ctrl+g", "references and options"],
];
// The widest the prompt box gets, so lines stay readable.
const MAX_BOX_WIDTH = 84;

const OPEN_PICKER: GenerateScreenAction = { isPicking: true, type: "picking" };
const CLOSE_PICKER: GenerateScreenAction = { isPicking: false, type: "picking" };
const CLEAR_PROMPT: GenerateScreenAction = { action: { type: "clear" }, type: "edit" };
const NEW_LINE: GenerateScreenAction = { action: { text: "\n", type: "insert" }, type: "edit" };

/**
 * The home screen: the logo, a prompt box with the model beneath it, and
 * the keys. Enter closes the app and asks before spending, with the
 * estimated cost; `ctrl+g` asks for references and settings first.
 *
 * @param properties - The models and what to do with a request.
 * @param properties.catalog - The models and what they cost.
 * @param properties.model - The model to generate with.
 * @param properties.onChooseModel - Takes a model picked here.
 * @param properties.onGenerate - Takes the request.
 * @param properties.recentIds - Models used lately.
 * @returns The whole screen, sized to the terminal.
 */
export function GenerateScreen({
	catalog,
	model,
	onChooseModel,
	onGenerate,
	recentIds,
}: Readonly<GenerateScreenProperties>): ReactNode {
	const [screen, dispatch] = useReducer(reduceGenerateScreen, INITIAL_GENERATE_STATE);
	const { exit } = useApp();
	const { columns, rows } = useWindowSize();
	const { reportError } = createStatusReporter(dispatch);
	const boxWidth = Math.min(MAX_BOX_WIDTH, columns - 8);

	function requestGeneration(withOptions: boolean): void {
		const prompt = screen.editor.text.trim();
		if (model === undefined) reportError("There are no models to generate with.");
		else if (prompt === "" && !withOptions) reportError("Write a prompt first.");
		else onGenerate({ model, prompt }, withOptions);
	}

	function closePicker(): void {
		dispatch(CLOSE_PICKER);
	}

	const actions: GenerateActions = {
		chooseModel(): void {
			dispatch(OPEN_PICKER);
		},
		clearPrompt(): void {
			dispatch(CLEAR_PROMPT);
		},
		generate(): void {
			requestGeneration(false);
		},
		generateWithOptions(): void {
			requestGeneration(true);
		},
		insertNewLine(): void {
			dispatch(NEW_LINE);
		},
		quit: exit,
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

	return (
		<BrowserShell
			capture={captureTyping}
			columns={columns}
			commands={commands}
			hasDialog={screen.isPicking}
			rows={rows}
			status={screen.status}
		>
			<ScreenHeader title="generate" />
			<Box alignItems="center" flexDirection="column" flexGrow={1} justifyContent="center" rowGap={1}>
				<DarkroomLogo />
				<PromptBox
					editor={screen.editor}
					model={model}
					prices={
						model === undefined ? undefined : getModelPrices(catalog.pricing, catalog.observed, model.id)
					}
					width={boxWidth}
				/>
				<Box justifyContent="flex-end" width={boxWidth}>
					<KeyHints hints={BOX_HINTS} />
				</Box>
			</Box>
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
		</BrowserShell>
	);
}

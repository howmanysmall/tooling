import nodePath from "node:path";
import { useReducer } from "react";
import { Box, useApp, useWindowSize } from "ink";

import { getReferenceRange } from "$generation/model-capabilities";
import { getModelPrices } from "$generation/observed-prices";
import { BrowserShell } from "$interactive/app/browser-shell";
import { DarkroomLogo } from "$interactive/components/darkroom-logo";
import { KeyHints } from "$interactive/components/key-hints";
import { ScreenHeader } from "$interactive/components/screen-header";
import { StatusBar } from "$interactive/components/status-bar";
import { createStatusReporter } from "$interactive/components/status-message";
import { findCommand } from "$interactive/keys/browser-command";
import { useSession } from "$interactive/session/session-context";
import { getEditBase, PromptMode } from "$interactive/session/session-state";
import { SessionTabStrip } from "$interactive/session/session-tab-strip";
import { SessionTranscript } from "$interactive/session/session-transcript";
import { TranscriptActionsContext } from "$interactive/session/transcript-actions-context";

import { getBoxHints, getGenerateCommands, getGenerateKey, PromptBasis } from "./generate-commands";
import { GenerateDialogs } from "./generate-dialogs";
import { GenerateDialog, INITIAL_GENERATE_STATE, reduceGenerateScreen } from "./generate-screen-state";
import { PromptBox } from "./prompt-box";
import { getEditorAction } from "./prompt-editor-state";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { Key } from "ink";
import type { Dispatch, ReactNode } from "react";

import type { SessionSummary } from "$history/session-list";
import type { KeyHint } from "$interactive/components/key-hints";
import type { ModelCatalog } from "$interactive/models/model-browser-state";
import type { SessionState, SessionTurn } from "$interactive/session/session-state";
import type { TranscriptActions } from "$interactive/session/transcript-actions-context";
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
	/** When the app opened, for day names in the session list. */
	now: Date;
	/** Takes a model picked here; the app remembers it across tabs. */
	onChooseModel: (model: ImageModelListItem) => void;
	/** Closes the app for the guided session, with references and settings. */
	onGenerateWithOptions: (request: GenerateRequest) => void;
	/** Models you used lately, most recent first. */
	recentIds: ReadonlyArray<string>;
	/** Past sessions, the one used last first. */
	sessions: ReadonlyArray<SessionSummary>;
}

const STATUS_HINTS: ReadonlyArray<KeyHint> = [
	["tab", "next tab"],
	["ctrl+n", "new session"],
	["ctrl+s", "sessions"],
];

// The widest the prompt box gets on the home screen, so lines stay readable.
const MAX_HOME_WIDTH = 84;

// The header, the tabs, the prompt box with its model line, its hints, and
// the status bar.
const SESSION_CHROME_ROWS = 1 + 1 + 6 + 1 + 1;

const OPEN_PICKER: GenerateScreenAction = { dialog: { kind: GenerateDialog.Model }, type: "dialog" };
const OPEN_SESSIONS: GenerateScreenAction = { dialog: { kind: GenerateDialog.Sessions }, type: "dialog" };
const CLOSE_DIALOG: GenerateScreenAction = { dialog: undefined, type: "dialog" };
const CLEAR_PROMPT: GenerateScreenAction = { action: { type: "clear" }, type: "edit" };
const NEW_LINE: GenerateScreenAction = { action: { text: "\n", type: "insert" }, type: "edit" };

function createTranscriptActions(dispatch: Dispatch<GenerateScreenAction>): TranscriptActions {
	return {
		showImage(image): void {
			dispatch({ dialog: { image, kind: GenerateDialog.Image }, type: "dialog" });
		},
		showPrompt(turn): void {
			dispatch({ dialog: { kind: GenerateDialog.Prompt, turn }, type: "dialog" });
		},
	};
}

function getPromptBasis({ base, mode }: SessionState, canEdit: boolean): PromptBasis {
	if (base === undefined) return PromptBasis.Nothing;
	if (mode === PromptMode.New) return PromptBasis.Fresh;
	return canEdit ? PromptBasis.Editing : PromptBasis.CantEdit;
}

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
 * @param properties.now - When the app opened.
 * @param properties.onChooseModel - Takes a model picked here.
 * @param properties.onGenerateWithOptions - Opens the guided session.
 * @param properties.recentIds - Models used lately.
 * @param properties.sessions - Past sessions.
 * @returns The whole screen, sized to the terminal.
 */
export function GenerateScreen({
	catalog,
	getPreview,
	model,
	now,
	onChooseModel,
	onGenerateWithOptions,
	recentIds,
	sessions,
}: Readonly<GenerateScreenProperties>): ReactNode {
	const [screen, dispatch] = useReducer(reduceGenerateScreen, INITIAL_GENERATE_STATE);
	const session = useSession();
	const { exit } = useApp();
	const { columns, rows } = useWindowSize();
	const { reportError, reportSuccess } = createStatusReporter(dispatch);
	const transcriptActions = createTranscriptActions(dispatch);
	const isHome = session.state.turns.length === 0;
	const boxWidth = isHome ? Math.min(MAX_HOME_WIDTH, columns - 8) : columns - 4;
	const prompt = screen.editor.text.trim();
	const base = getEditBase(session.state);
	const canEdit = model !== undefined && getReferenceRange(model).max > 0;
	const basis = getPromptBasis(session.state, canEdit);

	function generate(): void {
		if (model === undefined) {
			reportError("There are no models to generate with.");
		} else if (prompt.length === 0) {
			reportError("Write a prompt first.");
		} else {
			session.actions.send({ base, model, prompt, type: "new" });
			dispatch(CLEAR_PROMPT);
		}
	}

	function interrupt(): void {
		if (screen.editor.text.length === 0) {
			exit();
		} else {
			dispatch(CLEAR_PROMPT);
		}
	}

	function closeDialog(): void {
		dispatch(CLOSE_DIALOG);
	}

	function askDelete(turn: SessionTurn): void {
		dispatch({ dialog: { kind: GenerateDialog.Delete, turn }, type: "dialog" });
	}

	function fillPrompt(text: string): void {
		dispatch(CLEAR_PROMPT);
		dispatch({ action: { text, type: "insert" }, type: "edit" });
	}

	function handleShiftTab(): void {
		session.actions.toggleMode();
	}

	const actions: GenerateActions = {
		chooseModel(): void {
			dispatch(OPEN_PICKER);
		},
		clearPrompt(): void {
			dispatch(CLEAR_PROMPT);
		},
		closeSession(): void {
			session.actions.close(session.state.id);
		},
		cycleSessions: session.actions.cycle,
		generate,
		generateWithOptions(): void {
			if (model === undefined) {
				reportError("There are no models to generate with.");
			} else {
				onGenerateWithOptions({ model, prompt });
				exit();
			}
		},
		insertNewLine(): void {
			dispatch(NEW_LINE);
		},
		newSession: session.actions.newSession,
		showSessions(): void {
			dispatch(OPEN_SESSIONS);
		},
		toggleMode: session.actions.toggleMode,
	};
	const commands = getGenerateCommands(actions);

	function captureTyping(input: string, key: Key): void {
		const command = findCommand(commands, getGenerateKey(input, key));
		if (command !== undefined) {
			command.run();
			return;
		}

		const action = getEditorAction(input, key);
		if (action !== undefined) {
			dispatch({ action, type: "edit" });
		}
	}

	const promptBox = (
		<PromptBox
			canEdit={canEdit}
			editFileName={base === undefined ? undefined : nodePath.basename(base.path)}
			editor={screen.editor}
			model={model}
			prices={model === undefined ? undefined : getModelPrices(catalog.pricing, catalog.observed, model.id)}
			width={boxWidth}
		/>
	);
	const boxHints = (
		<Box flexShrink={0} justifyContent="flex-end" width={boxWidth}>
			<KeyHints hints={getBoxHints(basis)} />
		</Box>
	);

	return (
		<BrowserShell
			capture={captureTyping}
			columns={columns}
			commands={commands}
			hasDialog={screen.dialog !== undefined || session.state.pending !== undefined}
			rows={rows}
			status={screen.status}
			onInterrupt={interrupt}
			onShiftTab={handleShiftTab}
		>
			<ScreenHeader title="generate" />
			<SessionTabStrip columns={columns} />
			{isHome ? (
				<Box alignItems="center" flexDirection="column" flexGrow={1} justifyContent="center" rowGap={1}>
					<DarkroomLogo />
					{promptBox}
					{boxHints}
				</Box>
			) : (
				<Box flexDirection="column" flexGrow={1}>
					<TranscriptActionsContext value={transcriptActions}>
						<SessionTranscript
							columns={columns}
							getPreview={getPreview}
							rows={rows - SESSION_CHROME_ROWS}
							turns={session.state.turns}
						/>
					</TranscriptActionsContext>
					<Box alignItems="center" flexDirection="column" flexShrink={0} marginTop={1}>
						{promptBox}
						{boxHints}
					</Box>
				</Box>
			)}
			<StatusBar commands={commands} summary={`${catalog.models.length} models`}>
				<KeyHints hints={STATUS_HINTS} />
			</StatusBar>
			<GenerateDialogs
				catalog={catalog}
				columns={columns}
				currentModelId={model?.id}
				dialog={screen.dialog}
				isEditing={base !== undefined}
				now={now}
				recentIds={recentIds}
				rows={rows}
				sessions={sessions}
				onAskDelete={askDelete}
				onChooseModel={onChooseModel}
				onClose={closeDialog}
				onFillPrompt={fillPrompt}
				onReportError={reportError}
				onReportSuccess={reportSuccess}
			/>
		</BrowserShell>
	);
}

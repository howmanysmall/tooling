import { useReducer } from "react";
import { TextInput } from "@inkjs/ui";
import { Box, Text } from "ink";

import { CommandGroup } from "./browser-command";
import { PaletteRow } from "./command-palette-row";
import { getPaletteMatches, INITIAL_PALETTE_STATE, reducePaletteState } from "./command-palette-state";
import { Dialog } from "./dialog";
import { getWindowStart } from "./list-cursor";
import { theme } from "./theme";
import { useDialogListKeys } from "./use-dialog-list-keys";

import type { ReactNode } from "react";

import type { BrowserCommand } from "./browser-command";
import type { KeyHint } from "./key-hints";

export interface CommandPaletteProperties {
	columns: number;
	/** The screen's commands; the palette offers its actions. */
	commands: ReadonlyArray<BrowserCommand>;
	/** Closes the palette, before the chosen command runs. */
	onClose: () => void;
	rows: number;
}

const HINTS: ReadonlyArray<KeyHint> = [
	["↑↓", "choose"],
	["⏎", "run"],
];
// Rows of commands shown at once.
const VISIBLE_ROWS = 10;

/**
 * Every action the browser offers, searchable by name. Typing narrows the
 * list the way fzf does, ↑↓ choose, and Enter runs the choice.
 *
 * @param properties - What to offer and how to close.
 * @param properties.columns - The screen's width.
 * @param properties.commands - The commands to offer.
 * @param properties.onClose - Closes the palette.
 * @param properties.rows - The screen's height.
 * @returns The palette dialog.
 */
export function CommandPalette({ columns, commands, onClose, rows }: Readonly<CommandPaletteProperties>): ReactNode {
	const [palette, dispatch] = useReducer(reducePaletteState, INITIAL_PALETTE_STATE);
	// Moving the cursor isn't worth a palette entry; help lists those keys.
	const offered = commands.filter((command) => command.group === CommandGroup.Act);
	const matches = getPaletteMatches(offered, palette.query);
	const start = getWindowStart(palette.cursor, matches.length, VISIBLE_ROWS);
	const shown = matches.slice(start, start + VISIBLE_ROWS);

	function runSelected(): void {
		const chosen = matches[palette.cursor];
		onClose();
		chosen?.command.run();
	}

	function handleQueryChange(query: string): void {
		dispatch({ query, type: "query" });
	}

	useDialogListKeys(matches.length, dispatch, onClose);

	return (
		<Dialog columns={columns} hints={HINTS} rows={rows} title="Commands" width={60}>
			<Box marginBottom={1}>
				<Text bold={true} color={theme.accent}>
					{"› "}
				</Text>
				<TextInput placeholder="Search" onChange={handleQueryChange} onSubmit={runSelected} />
			</Box>
			{shown.length === 0 ? <Text color={theme.muted}>{"No commands match."}</Text> : null}
			{shown.map((match, index) => (
				<PaletteRow key={match.command.key} isSelected={start + index === palette.cursor} match={match} />
			))}
		</Dialog>
	);
}

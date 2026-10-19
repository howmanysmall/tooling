import { TextInput } from "@inkjs/ui";
import { Box, Text } from "ink";

import { Dialog } from "$interactive/components/dialog";
import { DialogList } from "$interactive/components/dialog-list";
import { theme } from "$interactive/components/theme";
import { CommandGroup } from "$interactive/keys/browser-command";

import { PaletteRow } from "./command-palette-row";
import { getPaletteMatches } from "./command-palette-state";
import { useSearchList } from "./use-search-list";

import type { ReactNode } from "react";

import type { KeyHint } from "$interactive/components/key-hints";
import type { BrowserCommand } from "$interactive/keys/browser-command";

import type { PaletteMatch } from "./command-palette-state";

export interface CommandPaletteProperties {
	columns: number;
	/** The screen's commands; the palette offers its actions. */
	commands: ReadonlyArray<BrowserCommand>;
	/** Closes the palette, before the chosen command runs. */
	onClose: () => void;
	rows: number;
	/** What the palette offers, like `Commands` or `Image`. */
	title: string;
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
 * @param properties.title - What the palette offers.
 * @returns The palette dialog.
 */
export function CommandPalette({
	columns,
	commands,
	onClose,
	rows,
	title,
}: Readonly<CommandPaletteProperties>): ReactNode {
	// Moving the cursor isn't worth a palette entry; help lists those keys.
	const offered = commands.filter((command) => command.group === CommandGroup.Act);
	const list = useSearchList((query) => getPaletteMatches(offered, query), VISIBLE_ROWS, onClose);

	function run(match?: PaletteMatch): void {
		onClose();
		match?.command.run();
	}

	function runSelected(): void {
		run(list.selected);
	}

	return (
		<Dialog columns={columns} hints={HINTS} rows={rows} title={title} width={60} onDismiss={onClose}>
			<Box marginBottom={1}>
				<Text bold={true} color={theme.accent}>
					{"› "}
				</Text>
				<TextInput placeholder="Search" onChange={list.handleQueryChange} onSubmit={runSelected} />
			</Box>
			{list.visible.length === 0 ? <Text color={theme.muted}>{"No commands match."}</Text> : null}
			<DialogList target="palette:list" onWheel={list.handleWheel}>
				{list.visible.map((match, index) => (
					<PaletteRow
						key={match.command.key}
						isSelected={list.start + index === list.cursor}
						match={match}
						onChoose={(): void => {
							run(match);
						}}
					/>
				))}
			</DialogList>
		</Dialog>
	);
}

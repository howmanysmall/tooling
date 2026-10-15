import { Box } from "ink";

import { Dialog } from "$interactive/components/dialog";
import { CommandGroup } from "$interactive/keys/browser-command";

import { HelpSection } from "./help-section";

import type { ReactNode } from "react";

import type { KeyHint } from "$interactive/components/key-hints";
import type { BrowserCommand } from "$interactive/keys/browser-command";

import type { HelpRow } from "./help-section";

export interface HelpDialogProperties {
	columns: number;
	commands: ReadonlyArray<BrowserCommand>;
	/** Closes it, for a click outside; the shell closes it on any key. */
	onClose: () => void;
	rows: number;
}

// The keys every browser shares, which aren't commands of their own.
const GENERAL_KEYS: ReadonlyArray<HelpRow> = [
	["ctrl+p", "Command palette"],
	["esc", "Close a dialog, or quit"],
	["drag", "Select and copy text"],
];
const HINTS: ReadonlyArray<KeyHint> = [["any key", "close"]];

function toRows(commands: ReadonlyArray<BrowserCommand>, group: CommandGroup): Array<HelpRow> {
	return commands.flatMap((command) => (command.group === group ? [[command.keyLabel, command.title]] : []));
}

/**
 * Every key the browser understands, grouped, in a dialog: the actions on
 * the left, moving and the shared keys on the right. Any key closes it.
 *
 * @param properties - The browser's commands and the screen's size.
 * @param properties.columns - The screen's width.
 * @param properties.commands - What the browser can do, with their keys.
 * @param properties.onClose - Closes it.
 * @param properties.rows - The screen's height.
 * @returns A dialog listing the actions, the navigation keys, and the keys
 *   every browser shares.
 */
export function HelpDialog({ columns, commands, onClose, rows }: Readonly<HelpDialogProperties>): ReactNode {
	return (
		<Dialog columns={columns} hints={HINTS} rows={rows} title="Keys" width={88} onDismiss={onClose}>
			<Box columnGap={4}>
				<Box flexBasis={0} flexDirection="column" flexGrow={1}>
					<HelpSection heading="Actions" rows={toRows(commands, CommandGroup.Act)} />
				</Box>
				<Box flexBasis={0} flexDirection="column" flexGrow={1}>
					<HelpSection heading="Navigate" rows={toRows(commands, CommandGroup.Navigate)} />
					<HelpSection heading="General" rows={GENERAL_KEYS} />
				</Box>
			</Box>
		</Dialog>
	);
}

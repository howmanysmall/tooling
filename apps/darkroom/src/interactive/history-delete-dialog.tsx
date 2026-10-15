import { Text } from "ink";

import { previewPrompt } from "$history/format-history";

import { Dialog } from "./dialog";
import { useHistoryBrowser } from "./history-browser-context";
import { theme } from "./theme";

import type { ReactNode } from "react";

import type { KeyHint } from "./key-hints";

const HINTS: ReadonlyArray<KeyHint> = [
	["y", "delete"],
	["any other key", "keep it"],
];

/**
 * Asks whether to delete the selected run, naming it by its prompt.
 *
 * @returns The question as a dialog.
 */
export function HistoryDeleteDialog(): ReactNode {
	const {
		meta: { layout },
		state: { selected },
	} = useHistoryBrowser();
	const name = selected === undefined ? "this run" : `“${previewPrompt(selected.prompt, 80)}”`;

	return (
		<Dialog columns={layout.columns} hints={HINTS} rows={layout.rows} title="Delete run" width={60}>
			<Text>{name}</Text>
			<Text color={theme.warning}>{"Its stored images are deleted too. Your own copies stay."}</Text>
		</Dialog>
	);
}

import { Text } from "ink";

import { previewPrompt } from "$history/format-history";
import { Dialog } from "$interactive/components/dialog";
import { theme } from "$interactive/components/theme";

import { useHistoryBrowser } from "./history-browser-context";

import type { ReactNode } from "react";

import type { KeyHint } from "$interactive/components/key-hints";

const HINTS: ReadonlyArray<KeyHint> = [
	["y", "delete"],
	["any other key", "keep it"],
];

/**
 * Asks whether to delete the selected run, naming it by its prompt. A
 * click outside keeps it.
 *
 * @returns The question as a dialog.
 */
export function HistoryDeleteDialog(): ReactNode {
	const {
		actions: { answerDelete },
		meta: { layout },
		state: { selected },
	} = useHistoryBrowser();
	const name = selected === undefined ? "this run" : `“${previewPrompt(selected.prompt, 80)}”`;

	function keepRun(): void {
		answerDelete("n");
	}

	return (
		<Dialog
			columns={layout.columns}
			hints={HINTS}
			rows={layout.rows}
			title="Delete run"
			width={60}
			onDismiss={keepRun}
		>
			<Text>{name}</Text>
			<Text color={theme.warning}>{"Its stored images are deleted too. Your own copies stay."}</Text>
		</Dialog>
	);
}

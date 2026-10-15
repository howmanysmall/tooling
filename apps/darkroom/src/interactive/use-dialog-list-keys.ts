import { useInput } from "ink";

import type { Dispatch } from "react";

import type { PaletteAction } from "./command-palette-state";

/**
 * The keys a searchable list dialog shares: ↑↓ move through the matches and
 * Esc closes it. The search input reads the typing and Enter.
 *
 * @param count - How many matches there are.
 * @param dispatch - Sends cursor moves to the dialog's reducer.
 * @param onClose - Closes the dialog.
 */
export function useDialogListKeys(count: number, dispatch: Dispatch<PaletteAction>, onClose: () => void): void {
	useInput(function onDialogListInput(_input, key) {
		if (key.escape) onClose();
		else if (key.upArrow) dispatch({ count, move: { delta: -1, type: "move" }, type: "move" });
		else if (key.downArrow) dispatch({ count, move: { delta: 1, type: "move" }, type: "move" });
	});
}

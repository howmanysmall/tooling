import { theme } from "./theme";

/**
 * Fills a list row: raised when selected, lit under the pointer, and the
 * pane's own color otherwise.
 *
 * @param isSelected - Whether the cursor is on the row.
 * @param isHovered - Whether the pointer is over the row.
 * @returns The row's background color.
 */
export function getRowBackground(isSelected: boolean, isHovered: boolean): string {
	if (isSelected) return theme.element;
	return isHovered ? theme.hover : theme.panel;
}

/**
 * Fills a row in a dialog: the accent when the keys would pick it, a
 * lighter shade under the pointer, and the dialog's own color otherwise.
 * The pointer never moves the selection, so a resting mouse can't take
 * the keyboard's place.
 *
 * @param isSelected - Whether Enter would pick the row.
 * @param isHovered - Whether the pointer is over the row.
 * @returns The row's background color.
 */
export function getDialogRowBackground(isSelected: boolean, isHovered: boolean): string {
	if (isSelected) return theme.accent;
	return isHovered ? theme.border : theme.element;
}

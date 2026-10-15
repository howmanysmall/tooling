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

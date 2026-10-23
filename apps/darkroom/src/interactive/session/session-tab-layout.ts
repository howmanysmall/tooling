const MIN_TAB_WIDTH = 16;
const MAX_TAB_WIDTH = 32;

/** Columns between tabs. */
export const TAB_GAP = 1;

// The padding at each side and the `+` button.
const CHROME_COLUMNS = 4 + 4;

/** Room for `‹ 12` and `12 ›` when the tabs don't fit. */
export const MARKER_COLUMNS = 5;

export interface TabLayout {
	/** How many tabs show at once. */
	readonly capacity: number;
	/** The columns each tab takes. */
	readonly width: number;
}

/**
 * Sizes the tabs: as wide as there is room for, up to a limit, or as many
 * as fit at the narrowest when they don't all.
 *
 * @param columns - The screen's width.
 * @param count - How many tabs are open.
 * @returns How many tabs show, and how wide each is.
 */
export function getTabLayout(columns: number, count: number): TabLayout {
	const room = columns - CHROME_COLUMNS;
	const shared = Math.floor((room + TAB_GAP) / Math.max(1, count)) - TAB_GAP;
	if (shared >= MIN_TAB_WIDTH) return { capacity: count, width: Math.min(MAX_TAB_WIDTH, shared) };

	const capacity = Math.max(1, Math.floor((room - MARKER_COLUMNS * 2 + TAB_GAP) / (MIN_TAB_WIDTH + TAB_GAP)));
	return { capacity, width: MIN_TAB_WIDTH };
}

import { getWindowStart } from "./list-cursor";

/**
 * The part of a row of images that fits, and how many are off each side.
 *
 * @template Item - What the strip holds.
 */
export interface StripWindow<Item> {
	/** How many items are hidden to the right. */
	readonly after: number;
	/** How many items are hidden to the left. */
	readonly before: number;
	readonly shown: ReadonlyArray<Item>;
}

/**
 * Picks the items a strip shows, keeping the selected one near the middle.
 *
 * @template Item - What the strip holds.
 * @param items - Every item, in order.
 * @param selectedIndex - The selected item's index.
 * @param capacity - How many items fit.
 * @returns The items to show, and how many are hidden on each side.
 */
export function getStripWindow<Item>(
	items: ReadonlyArray<Item>,
	selectedIndex: number,
	capacity: number,
): StripWindow<Item> {
	const size = Math.max(1, Math.min(capacity, items.length));
	const start = getWindowStart(selectedIndex, items.length, size);
	return { after: Math.max(0, items.length - start - size), before: start, shown: items.slice(start, start + size) };
}

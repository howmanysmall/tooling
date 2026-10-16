// Items above and below the selection whose previews load ahead of time.
const PRELOAD_BEHIND = 2;
const PRELOAD_AHEAD = 4;

/**
 * Lists the items around a selection whose images should load before you
 * reach them: a few behind, more ahead, since lists are mostly read down.
 *
 * @template Item - What the list holds.
 * @param items - The list, in the order it shows.
 * @param index - Where the selection is.
 * @returns The selected item and its neighbors, selected first.
 */
export function getNearbyItems<Item>(items: ReadonlyArray<Item>, index: number): Array<Item> {
	const nearby = items.slice(Math.max(0, index - PRELOAD_BEHIND), index + PRELOAD_AHEAD + 1);
	const selected = items[index];
	return selected === undefined ? nearby : [selected, ...nearby.filter((item) => item !== selected)];
}

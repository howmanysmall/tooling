import { formatLocalDate } from "$generation/output-paths";

import type { HistoryEntry } from "$history/history-entry";

/** One line of the run list: a day heading or a two-line run. */
export type RunListItem =
	| { readonly entry: HistoryEntry; readonly index: number; readonly key: string; readonly kind: "run" }
	| { readonly key: string; readonly kind: "day"; readonly label: string };

/** A run takes two lines: its prompt, then its model, time, and cost. */
export const RUN_LINES = 2;

const DAY_MILLISECONDS = 86_400_000;

const dayFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", weekday: "short" });
const yearFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

function getLines(item: RunListItem): number {
	return item.kind === "run" ? RUN_LINES : 1;
}

function startOfDay(date: Date): number {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Names the day a run was made, relative to today.
 *
 * @param date - When the run was made.
 * @param now - The current time.
 * @returns `Today`, `Yesterday`, `Mon 12 Oct` within the year, or
 *   `12 Oct 2025` before it.
 */
export function formatDayLabel(date: Date, now: Date): string {
	const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MILLISECONDS);
	if (days === 0) return "Today";
	if (days === 1) return "Yesterday";

	return date.getFullYear() === now.getFullYear() ? dayFormatter.format(date) : yearFormatter.format(date);
}

/**
 * Lays out runs under a heading for each day.
 *
 * @param runs - The visible runs, newest first.
 * @param now - The current time, for the day names.
 * @returns The headings and runs, in display order.
 */
export function buildRunListItems(runs: ReadonlyArray<HistoryEntry>, now: Date): Array<RunListItem> {
	const items: Array<RunListItem> = [];
	let previousDay: string | undefined;
	for (const [index, entry] of runs.entries()) {
		const created = new Date(entry.created);
		const day = formatLocalDate(created);
		if (day !== previousDay) {
			items.push({ key: `day:${day}`, kind: "day", label: formatDayLabel(created, now) });
		}

		previousDay = day;
		items.push({ key: entry.id, entry, index, kind: "run" });
	}

	return items;
}

/**
 * Picks the items that fit, scrolled so the selected run stays in view near
 * the middle, with its day heading when there is room.
 *
 * @param items - Every heading and run.
 * @param selectedIndex - The selected run's index among the runs.
 * @param height - How many lines fit.
 * @returns The items to draw, top to bottom; none is cut in half.
 */
export function getVisibleItems(
	items: ReadonlyArray<RunListItem>,
	selectedIndex: number,
	height: number,
): Array<RunListItem> {
	const tops: Array<number> = [];
	let total = 0;
	let selectedTop = 0;
	for (const item of items) {
		tops.push(total);

		if (item.kind === "run" && item.index === selectedIndex) {
			selectedTop = total;
		}
		total += getLines(item);
	}

	if (total <= height) {
		return [...items];
	}

	const centered = Math.max(0, Math.min(selectedTop - Math.floor((height - RUN_LINES) / 2), total - height));
	// Start at an item's top, so the pane holds whole items with no blank line
	// where half a run would have been.
	let start = 0;
	for (const top of tops) {
		if (top <= centered) start = top;
	}

	return items.filter((item, index) => {
		const top = tops[index] ?? 0;
		return top >= start && top + getLines(item) <= start + height;
	});
}

import getStringWidth from "fast-string-width";

/** What separates the end of the text from its start as it loops. */
const GAP = " · ";
/** How long the text rests at its start before scrolling, in ticks. */
export const MARQUEE_PAUSE_TICKS = 8;
/** How often the text moves one cell, in milliseconds. */
export const MARQUEE_TICK_MS = 80;

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** The part of a scrolling text that fits, with where it came from. */
export interface MarqueeWindow {
	/** For each UTF-16 unit of `text`, its index in the source, if any. */
	readonly sources: ReadonlyArray<number | undefined>;
	readonly text: string;
}

interface Cell {
	readonly source: number | undefined;
	readonly value: string;
	readonly width: number;
}

function toCells(text: string, isGap: boolean): Array<Cell> {
	return Array.from(segmenter.segment(text), ({ index, segment }) => ({
		source: isGap ? undefined : index,
		value: segment,
		width: getStringWidth(segment),
	}));
}

/**
 * Says how many cells a text moves through before it shows its start again.
 *
 * @param text - The text that scrolls.
 * @returns Its width with the gap after it.
 */
export function getMarqueeCycle(text: string): number {
	return getStringWidth(text + GAP);
}

/**
 * Turns animation ticks into how far the text has scrolled: it rests at
 * its start, scrolls one cell a tick through a whole loop, and rests again.
 *
 * @param tick - Ticks since the text began to scroll.
 * @param cycle - Cells in one loop, from {@link getMarqueeCycle}.
 * @returns How many cells to skip.
 */
export function getMarqueeOffset(tick: number, cycle: number): number {
	return Math.max(0, (tick % (MARQUEE_PAUSE_TICKS + cycle)) - MARQUEE_PAUSE_TICKS);
}

/**
 * Takes the cells of a looping text that fit in a width, starting some
 * cells in. A wide character cut by the left edge is skipped whole.
 *
 * @param text - The text that scrolls.
 * @param width - The columns it has.
 * @param offset - How many cells it has scrolled.
 * @returns The visible text, mapped back to the source.
 */
export function sliceMarquee(text: string, width: number, offset: number): MarqueeWindow {
	const loop = [...toCells(text, false), ...toCells(GAP, true)];
	const cells = [...loop, ...loop];
	let skipped = 0;
	let start = 0;
	while (start < cells.length && skipped < offset) {
		skipped += cells[start]?.width ?? 0;
		start += 1;
	}

	const sources: Array<number | undefined> = [];
	let visible = "";
	let used = 0;
	for (const cell of cells.slice(start)) {
		if (used + cell.width > width) break;
		used += cell.width;
		visible += cell.value;
		for (let unit = 0; unit < cell.value.length; unit += 1) {
			sources.push(cell.source === undefined ? undefined : cell.source + unit);
		}
	}

	return { sources, text: visible };
}

/** A stretch of text in one style. */
export interface StyledRun {
	readonly color: string;
	readonly isBold?: boolean;
	readonly isUnderlined?: boolean;
	readonly text: string;
}

/** A run placed in the line, keyed by where it starts. */
export interface PlacedRun extends StyledRun {
	/** Its first UTF-16 index in the line shown. */
	readonly start: number;
}

/**
 * Places runs one after another, for a line that isn't scrolling.
 *
 * @param runs - The line, in styled stretches.
 * @returns Each run with where it starts.
 */
export function placeRuns(runs: ReadonlyArray<StyledRun>): Array<PlacedRun> {
	let start = 0;
	return runs.map((run) => {
		const placed = { ...run, start };
		start += run.text.length;
		return placed;
	});
}

function findRun(runs: ReadonlyArray<PlacedRun>, source?: number): PlacedRun | undefined {
	if (source === undefined) return undefined;
	return runs.findLast((run) => run.start <= source);
}

/**
 * Restyles a scrolled window with the runs of its source, so a muted part
 * or a matched character keeps its look as it scrolls past. The gap
 * between loops takes the first run's color.
 *
 * @param runs - The whole line, in styled stretches.
 * @param scrolled - The visible part, from {@link sliceMarquee}.
 * @returns The visible part, in styled stretches.
 */
export function sliceRuns(runs: ReadonlyArray<StyledRun>, scrolled: MarqueeWindow): Array<PlacedRun> {
	const placed = placeRuns(runs);
	const gap: StyledRun = { color: runs[0]?.color ?? "", text: "" };
	const sliced: Array<PlacedRun> = [];
	let current: StyledRun | undefined;
	for (const [index, source] of scrolled.sources.entries()) {
		const run = findRun(placed, source) ?? gap;
		const character = scrolled.text.charAt(index);
		const last = sliced.at(-1);
		if (last !== undefined && run === current) sliced[sliced.length - 1] = { ...last, text: last.text + character };
		else sliced.push({ ...run, start: index, text: character });
		current = run;
	}
	return sliced;
}

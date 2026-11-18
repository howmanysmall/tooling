/**
 * How far the transcript is scrolled: rows from the top, or `undefined`
 * while it follows the newest turn.
 */
export type TranscriptScroll = number | undefined;

/**
 * The renderer clamps `scrollTop` to the bottom, so a scroll past any
 * transcript's height keeps the newest turn in view as turns come.
 */
export const FOLLOW_NEWEST = Number.MAX_SAFE_INTEGER;

/**
 * Scrolls the transcript by some rows. Reaching the bottom goes back to
 * following the newest turn; anywhere above stays put as turns come, so
 * what you scrolled back to doesn't move.
 *
 * @param current - Where it is now, in rows from the top, as laid out.
 * @param delta - Rows to move; positive scrolls down.
 * @param bottom - The furthest it can scroll, in rows from the top.
 * @returns Where it scrolls to.
 */
export function scrollTranscript(current: number, delta: number, bottom: number): TranscriptScroll {
	const next = Math.min(Math.max(current + delta, 0), Math.max(bottom, 0));
	return next >= bottom ? undefined : next;
}

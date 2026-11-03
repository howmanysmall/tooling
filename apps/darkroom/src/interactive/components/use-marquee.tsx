import { useRef } from "react";
import getStringWidth from "fast-string-width";
import { useAnimation, useBoxMetrics } from "ink";

import { getMarqueeCycle, getMarqueeOffset, MARQUEE_TICK_MS, sliceMarquee } from "./marquee";

import type { DOMElement } from "ink";
import type { RefObject } from "react";

import type { MarqueeWindow } from "./marquee";

export interface Marquee {
	/** The box whose width the text has; attach it as its `ref`. */
	readonly boxRef: RefObject<DOMElement | null>;
	/** What shows while the text scrolls, or nothing while it rests. */
	readonly scrolled: MarqueeWindow | undefined;
}

/**
 * Scrolls a text that doesn't fit its box, so all of it can be read: while
 * active it rests at its start, then loops through, and rests again. A text
 * that fits never moves.
 *
 * @param text - The text to show.
 * @param isActive - Whether it should scroll, as for the chosen row.
 * @returns The box to measure, and the scrolled text while it moves.
 */
export function useMarquee(text: string, isActive: boolean): Marquee {
	const boxRef = useRef<DOMElement>(null);
	const { width } = useBoxMetrics(boxRef);
	const isScrolling = isActive && width > 0 && getStringWidth(text) > width;
	const { frame } = useAnimation({ interval: MARQUEE_TICK_MS, isActive: isScrolling });
	const offset = isScrolling ? getMarqueeOffset(frame, getMarqueeCycle(text)) : 0;

	return { boxRef, scrolled: offset === 0 ? undefined : sliceMarquee(text, width, offset) };
}

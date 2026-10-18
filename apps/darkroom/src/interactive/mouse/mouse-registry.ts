import { MouseAction } from "./mouse-input";

import type { PointerEvent } from "./mouse-input";

/** Where something is on screen, in zero-based cells. */
export interface CellRect {
	readonly height: number;
	readonly left: number;
	readonly top: number;
	readonly width: number;
}

/** What a target does with the pointer. */
export interface MouseHandlers {
	readonly onClick?: (() => void) | undefined;
	/** Called once when the pointer moves onto it. */
	readonly onHover?: (() => void) | undefined;
	/** `1` for the wheel down, `-1` for up. */
	readonly onWheel?: ((delta: number) => void) | undefined;
}

export interface MouseTarget<Node> extends MouseHandlers {
	/**
	 * Dialogs are layer 1 and the screen 0. A layer hides every lower one
	 * where it covers it, so rows behind a dialog don't react.
	 */
	readonly layer: number;
	readonly node: Node;
}

export interface MouseRegistry<Node> {
	/** Forgets the press, so its release doesn't click: a drag took it. */
	readonly cancelPress: () => void;
	/** Handles a pointer event; a click is a press and release on a target. */
	readonly dispatch: (event: PointerEvent) => void;
	/** The target under the pointer, by ID, for drawing hover states. */
	readonly getHoveredId: () => string | undefined;
	/** Adds a target; the returned function removes it. */
	readonly register: (id: string, target: MouseTarget<Node>) => () => void;
	readonly subscribe: (listener: () => void) => () => void;
}

interface Hit<Node> {
	readonly id: string;
	readonly area: number;
	readonly target: MouseTarget<Node>;
}

function contains(rect: CellRect, column: number, row: number): boolean {
	return column >= rect.left && column < rect.left + rect.width && row >= rect.top && row < rect.top + rect.height;
}

/**
 * Picks the target a handler belongs to: the smallest one under the
 * pointer on the top layer there, so a row wins over its pane, and a
 * dialog hides the screen behind it.
 *
 * @template Node - What a target is drawn as.
 * @param hits - Every target under the pointer.
 * @param hasHandler - Whether a target takes this event.
 * @returns The target, or `undefined` when none on the top layer takes it.
 */
function pickHit<Node>(
	hits: ReadonlyArray<Hit<Node>>,
	hasHandler: (target: MouseHandlers) => boolean,
): Hit<Node> | undefined {
	let topLayer = Number.NEGATIVE_INFINITY;
	for (const { target } of hits) topLayer = Math.max(topLayer, target.layer);

	let best: Hit<Node> | undefined;
	for (const hit of hits) {
		if (hit.target.layer !== topLayer || !hasHandler(hit.target)) continue;
		if (best === undefined || hit.area < best.area) best = hit;
	}
	return best;
}

function isAny(): boolean {
	return true;
}

function hasClick(target: MouseHandlers): boolean {
	return target.onClick !== undefined;
}

function hasWheel(target: MouseHandlers): boolean {
	return target.onWheel !== undefined;
}

/**
 * Tracks what the mouse can reach and sends each pointer event to the
 * target under it.
 *
 * @template Node - What a target is drawn as, like an Ink element.
 * @param measure - Where a target's node is on screen, or `undefined` while
 *   it has no size, as when hidden.
 * @returns A registry that targets join and pointer events go through.
 */
export function createMouseRegistry<Node>(measure: (node: Node) => CellRect | undefined): MouseRegistry<Node> {
	const targets = new Map<string, MouseTarget<Node>>();
	const listeners = new Set<() => void>();
	let hoveredId: string | undefined;
	// The clickable target the button went down on; a release over it clicks.
	let pressedId: string | undefined;

	function findHits({ column, row }: PointerEvent): Array<Hit<Node>> {
		const hits: Array<Hit<Node>> = [];
		for (const [id, target] of targets) {
			const rect = measure(target.node);
			if (rect !== undefined && contains(rect, column, row)) {
				hits.push({ id, area: rect.width * rect.height, target });
			}
		}
		return hits;
	}

	function hover(hit: Hit<Node> | undefined): void {
		if (hit?.id === hoveredId) return;
		hoveredId = hit?.id;
		hit?.target.onHover?.();
		for (const listener of listeners) listener();
	}

	function release(hits: ReadonlyArray<Hit<Node>>): void {
		const hit = pickHit(hits, hasClick);
		if (hit !== undefined && hit.id === pressedId) hit.target.onClick?.();
		pressedId = undefined;
	}

	function scroll(hits: ReadonlyArray<Hit<Node>>, delta: number): void {
		pickHit(hits, hasWheel)?.target.onWheel?.(delta);
	}

	return {
		cancelPress(): void {
			pressedId = undefined;
		},
		dispatch(event): void {
			const hits = findHits(event);
			hover(pickHit(hits, isAny));
			switch (event.action) {
				case MouseAction.Press: {
					pressedId = pickHit(hits, hasClick)?.id;
					break;
				}
				case MouseAction.Release: {
					release(hits);
					break;
				}
				case MouseAction.WheelDown: {
					scroll(hits, 1);
					break;
				}
				case MouseAction.WheelUp: {
					scroll(hits, -1);
					break;
				}
				default: {
					// A move or a drag only changes the hover.
				}
			}
		},
		getHoveredId: () => hoveredId,
		register(id, target): () => void {
			targets.set(id, target);
			return () => {
				if (targets.get(id) === target) targets.delete(id);
			};
		},
		subscribe(listener): () => void {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

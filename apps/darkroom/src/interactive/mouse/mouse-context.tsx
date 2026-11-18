import { createContext, use, useSyncExternalStore } from "react";
import { getBoundingBox } from "@visulima/tui";

import { getNothing, subscribeToNothing } from "$interactive/components/empty-store";

import type { DOMElement } from "@visulima/tui/dom";

import type { CellRect, MouseHandlers, MouseRegistry } from "./mouse-registry";

export type ElementMouseRegistry = MouseRegistry<DOMElement>;

/**
 * Set by the app. Screens rendered on their own, as in tests, have no
 * mouse.
 */
export const MouseRegistryContext = createContext<ElementMouseRegistry | undefined>(undefined);

MouseRegistryContext.displayName = "MouseRegistryContext";

/** Raised by dialogs, so the screen behind them doesn't react. */
export const MouseLayerContext = createContext(0);

MouseLayerContext.displayName = "MouseLayerContext";

function toCellRect({ height, width, x, y }: ReturnType<typeof getBoundingBox>): CellRect {
	return { height, left: x, top: y, width };
}

function isClipping({ style }: DOMElement): boolean {
	const overflow = style.overflowY ?? style.overflow;
	return overflow === "hidden" || overflow === "scroll";
}

function intersect(rect: CellRect, clip: CellRect): CellRect {
	const left = Math.max(rect.left, clip.left);
	const top = Math.max(rect.top, clip.top);
	const right = Math.min(rect.left + rect.width, clip.left + clip.width);
	const bottom = Math.min(rect.top + rect.height, clip.top + clip.height);
	return { height: Math.max(0, bottom - top), left, top, width: Math.max(0, right - left) };
}

/**
 * Finds the cells an element shows on: where it was laid out, moved by any
 * scrolled box around it, and cut to the boxes that clip it, so a row
 * scrolled out of sight can't be pointed at.
 *
 * @param node - An element the renderer has laid out.
 * @returns Its visible cells, or `undefined` while none show, as when
 *   hidden or scrolled away.
 */
export function measureElement(node: DOMElement): CellRect | undefined {
	if (node.yogaNode === undefined) return undefined;

	let rect = toCellRect(getBoundingBox(node));
	for (let ancestor = node.parentNode; ancestor !== undefined; ancestor = ancestor.parentNode) {
		if (isClipping(ancestor)) {
			rect = intersect(rect, toCellRect(getBoundingBox(ancestor)));
		}
	}

	return rect.width === 0 || rect.height === 0 ? undefined : rect;
}

/** Binds an element to the mouse. */
export interface MouseBinding {
	/** Goes on the element's `Box` as its `ref`. */
	readonly attachNode: (node: DOMElement | null) => (() => void) | undefined;
	/** Whether the pointer is over it, for drawing a hover state. */
	readonly isHovered: boolean;
}

/**
 * Makes an element react to the mouse. It joins the registry through its
 * ref and leaves when it unmounts or its tab is hidden.
 *
 * @param id - Unique among everything on screen, like `run:01M4…`.
 * @param handlers - What a click, hover, or wheel does.
 * @returns The ref for the element, and whether the pointer is over it.
 */
export function useMouseTarget(id: string, handlers: MouseHandlers): MouseBinding {
	const registry = use(MouseRegistryContext);
	const layer = use(MouseLayerContext);
	const hoveredId = useSyncExternalStore(
		registry?.subscribe ?? subscribeToNothing,
		registry?.getHoveredId ?? getNothing,
	);

	function attachNode(node: DOMElement | null): (() => void) | undefined {
		if (node === null || registry === undefined) return undefined;
		return registry.register(id, { ...handlers, layer, node });
	}

	return { attachNode, isHovered: hoveredId === id };
}

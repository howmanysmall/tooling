import { createContext, use, useSyncExternalStore } from "react";

import { getNothing, subscribeToNothing } from "$interactive/components/empty-store";

import type { DOMElement } from "ink";

import type { CellRect, MouseHandlers, MouseRegistry } from "./mouse-registry";

export type InkMouseRegistry = MouseRegistry<DOMElement>;

/**
 * Set by the app. Screens rendered on their own, as in tests, have no
 * mouse.
 */
export const MouseRegistryContext = createContext<InkMouseRegistry | undefined>(undefined);

MouseRegistryContext.displayName = "MouseRegistryContext";

/** Raised by dialogs, so the screen behind them doesn't react. */
export const MouseLayerContext = createContext(0);

MouseLayerContext.displayName = "MouseLayerContext";

/**
 * Finds where an Ink element was laid out, by adding up its offsets from
 * the screen's corner.
 *
 * @param node - An element Ink has laid out.
 * @returns Its cells, or `undefined` while it has no size, as when hidden.
 */
export function measureElement(node: DOMElement): CellRect | undefined {
	const layout = node.yogaNode;
	if (layout === undefined) return undefined;

	const width = layout.getComputedWidth();
	const height = layout.getComputedHeight();
	if (width === 0 || height === 0) return undefined;

	let left = 0;
	let top = 0;
	for (let current: DOMElement | undefined = node; current !== undefined; current = current.parentNode) {
		left += current.yogaNode?.getComputedLeft() ?? 0;
		top += current.yogaNode?.getComputedTop() ?? 0;
	}

	return { height, left, top, width };
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

import { useSyncExternalStore } from "react";
import useMouseContext from "@visulima/tui/hooks/use-mouse";

import { getNothing } from "$interactive/components/empty-store";

import { MouseAction } from "./mouse-input";

import type { MouseButton, MousePosition } from "@visulima/tui";
import type { ReactNode } from "react";

import type { PointerEvent } from "./mouse-input";

type ClickAction = "press" | "release";

type DragAction = "dragging" | null;

type ScrollDirection = "scrolldown" | "scrollup";

export interface MouseBridgeProperties {
	/** Receives each pointer event, in zero-based cells. */
	readonly onPointer: (event: PointerEvent) => void;
}

function toPointer(action: MouseAction, { x, y }: MousePosition): PointerEvent {
	// The renderer reports the terminal's one-based cells.
	return { action, column: x - 1, row: y - 1 };
}

/**
 * Hands the renderer's mouse to darkroom: every report from its
 * `MouseProvider` becomes a pointer event for the targets and the text
 * selection. Only the primary button clicks, drags, and selects. Must sit
 * inside a `MouseProvider`.
 *
 * @param properties - Where the events go.
 * @param properties.onPointer - Receives each pointer event.
 * @returns Nothing; it only listens.
 */
export function MouseBridge({ onPointer }: MouseBridgeProperties): ReactNode {
	const { events } = useMouseContext();

	/**
	 * Every report moves the pointer first, so hover follows it.
	 *
	 * @param position - Where the pointer is.
	 */
	function onPosition(position: MousePosition): void {
		onPointer(toPointer(MouseAction.Move, position));
	}

	function onClick(position: MousePosition, action: ClickAction, button: MouseButton): void {
		if (button !== "left") return;
		onPointer(toPointer(action === "press" ? MouseAction.Press : MouseAction.Release, position));
	}

	function onDrag(position: MousePosition, action: DragAction, button: MouseButton): void {
		if (button !== "left" || action === null) return;
		onPointer(toPointer(MouseAction.Drag, position));
	}

	function onScroll(position: MousePosition, direction: ScrollDirection): void {
		onPointer(toPointer(direction === "scrollup" ? MouseAction.WheelUp : MouseAction.WheelDown, position));
	}

	function subscribeToPointer(): () => void {
		events.on("position", onPosition);
		events.on("click", onClick);
		events.on("drag", onDrag);
		events.on("scroll", onScroll);
		return () => {
			events.off("position", onPosition);
			events.off("click", onClick);
			events.off("drag", onDrag);
			events.off("scroll", onScroll);
		};
	}

	useSyncExternalStore(subscribeToPointer, getNothing);
	return undefined;
}

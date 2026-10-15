import { describe, it } from "vitest";

import { MouseAction } from "./mouse-input.ts";
import { createMouseRegistry } from "./mouse-registry.ts";

import type { CellRect, MouseRegistry } from "./mouse-registry.ts";

/**
 * Each node is its own rectangle, so tests lay targets out directly.
 *
 * @param node - A target's rectangle.
 * @returns The same rectangle.
 */
function measure(node: CellRect): CellRect {
	return node;
}

const PANE: CellRect = { height: 20, left: 0, top: 0, width: 40 };
const ROW: CellRect = { height: 2, left: 0, top: 4, width: 40 };
const DIALOG: CellRect = { height: 10, left: 10, top: 2, width: 30 };

function click(registry: MouseRegistry<CellRect>, column: number, row: number): void {
	registry.dispatch({ action: MouseAction.Press, column, row });
	registry.dispatch({ action: MouseAction.Release, column, row });
}

function record(events: Array<string>, name: string): () => void {
	return () => {
		events.push(name);
	};
}

describe("createMouseRegistry", () => {
	it("clicks the smallest target under the pointer, and scrolls the one that takes the wheel", ({ expect }) => {
		expect.assertions(2);

		const events: Array<string> = [];
		const registry = createMouseRegistry(measure);
		registry.register("pane", {
			layer: 0,
			node: PANE,
			onWheel(delta): void {
				events.push(`wheel ${delta}`);
			},
		});
		registry.register("row", { layer: 0, node: ROW, onClick: record(events, "row") });

		click(registry, 3, 5);
		registry.dispatch({ action: MouseAction.WheelDown, column: 3, row: 5 });

		expect(events).toStrictEqual(["row", "wheel 1"]);
		expect(registry.getHoveredId()).toBe("row");
	});

	it("lets a dialog hide the targets behind it", ({ expect }) => {
		expect.assertions(2);

		const events: Array<string> = [];
		const registry = createMouseRegistry(measure);
		registry.register("row", { layer: 0, node: ROW, onClick: record(events, "row") });
		registry.register("dialog", { layer: 1, node: DIALOG, onClick: record(events, "dialog") });

		click(registry, 15, 5);
		click(registry, 2, 5);

		expect(events).toStrictEqual(["dialog", "row"]);
		expect(registry.getHoveredId()).toBe("row");
	});

	it("clicks only when the button comes up on the target it went down on", ({ expect }) => {
		expect.assertions(1);

		const events: Array<string> = [];
		const registry = createMouseRegistry(measure);
		registry.register("row", { layer: 0, node: ROW, onClick: record(events, "row") });

		// Down on the row, up below it.
		registry.dispatch({ action: MouseAction.Press, column: 2, row: 5 });
		registry.dispatch({ action: MouseAction.Release, column: 2, row: 9 });
		// A drag that selected text takes the press.
		registry.dispatch({ action: MouseAction.Press, column: 2, row: 5 });
		registry.cancelPress();
		registry.dispatch({ action: MouseAction.Release, column: 2, row: 5 });
		click(registry, 2, 4);

		expect(events).toStrictEqual(["row"]);
	});

	it("reports hover once per target, and forgets removed targets", ({ expect }) => {
		expect.assertions(2);

		const hovers: Array<string> = [];
		const changes: Array<string> = [];
		const registry = createMouseRegistry(measure);
		registry.subscribe(record(changes, "change"));
		const unregister = registry.register("row", { layer: 0, node: ROW, onHover: record(hovers, "row") });

		registry.dispatch({ action: MouseAction.Move, column: 1, row: 4 });
		registry.dispatch({ action: MouseAction.Move, column: 2, row: 5 });
		unregister();
		registry.dispatch({ action: MouseAction.Move, column: 2, row: 5 });

		expect(hovers).toHaveLength(1);
		expect(changes).toHaveLength(2);
	});
});

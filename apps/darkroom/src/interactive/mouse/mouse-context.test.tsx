import { setTimeout as delay } from "node:timers/promises";
import { describe, it } from "vitest";
import { Box } from "@visulima/tui/components/box";
import { Text } from "@visulima/tui/components/text";

import { renderScreen } from "$interactive/app/test-screen";

import { measureElement } from "./mouse-context";

import type { DOMElement } from "@visulima/tui/dom";
import type { ReactElement, ReactNode } from "react";

const ROW_NAMES = Array.from({ length: 10 }, (_, index) => `row ${index}`);

type Keep = (name: string) => (node: DOMElement | null) => void;

interface Laid {
	readonly nodes: ReadonlyMap<string, DOMElement>;
	readonly unmount: () => void;
}

interface RowProperties {
	readonly name: string;
	readonly keep: Keep;
}

function Row({ name, keep }: RowProperties): ReactNode {
	return (
		<Box ref={keep(name)} flexShrink={0}>
			<Text>{name}</Text>
		</Box>
	);
}

/**
 * Lays out a screen and keeps the elements it names.
 *
 * @param build - The screen, given how to keep an element by name.
 * @returns The kept elements once laid out.
 */
async function layOutAsync(build: (keep: Keep) => ReactElement): Promise<Laid> {
	const nodes = new Map<string, DOMElement>();
	const instance = renderScreen(
		build((name) => (node): void => {
			if (node !== null) {
				nodes.set(name, node);
			}
		}),
	);

	await delay(20);
	return { nodes, unmount: instance.unmount };
}

describe("measureElement", () => {
	it("finds an element by the boxes it sits in", async ({ expect, onTestFinished }) => {
		expect.assertions(1);

		const { nodes, unmount } = await layOutAsync((keep) => (
			<Box flexDirection="column" paddingLeft={18} paddingTop={13}>
				<Box paddingLeft={3} paddingTop={1}>
					<Row keep={keep} name="a row" />
				</Box>
			</Box>
		));

		onTestFinished(unmount);

		expect(measureElement(nodes.get("a row")!)).toStrictEqual({ height: 1, left: 21, top: 14, width: 5 });
	});

	it("follows a scrolled box, and finds nothing for a row scrolled out of it", async ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const { nodes, unmount } = await layOutAsync((keep) => (
			<Box flexDirection="column" height={4} overflow="scroll" scrollTop={3}>
				{ROW_NAMES.map((name) => (
					<Row key={name} keep={keep} name={name} />
				))}
			</Box>
		));

		onTestFinished(unmount);

		expect(measureElement(nodes.get("row 4")!)).toMatchObject({ height: 1, left: 0, top: 1 });
		expect(measureElement(nodes.get("row 1")!)).toBeUndefined();
	});

	it("finds nothing for a hidden element", async ({ expect, onTestFinished }) => {
		expect.assertions(1);

		const { nodes, unmount } = await layOutAsync((keep) => (
			<Box display="none">
				<Row keep={keep} name="hidden" />
			</Box>
		));

		onTestFinished(unmount);

		expect(measureElement(nodes.get("hidden")!)).toBeUndefined();
	});
});

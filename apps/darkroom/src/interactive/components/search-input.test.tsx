import { setTimeout as delay } from "node:timers/promises";
import { describe, it } from "vitest";

import { renderScreen } from "$interactive/app/test-screen";

import { SearchInput } from "./search-input.tsx";

interface ChangeRecorder {
	readonly changes: Array<string>;
	readonly record: (text: string) => void;
}

function createChangeRecorder(): ChangeRecorder {
	const changes: Array<string> = [];
	return {
		changes,
		record(text): void {
			changes.push(text);
		},
	};
}

function ignore(): void {
	// The tests read what the input reports, not what Enter does.
}

async function typeIntoAsync(...keys: ReadonlyArray<string>): Promise<string | undefined> {
	const { changes, record } = createChangeRecorder();
	const instance = renderScreen(
		<SearchInput initialValue="a red fox" placeholder="Search" onChange={record} onSubmit={ignore} />,
	);

	await delay(20);

	for (const key of keys) {
		instance.stdin.write(key);
		// oxlint-disable-next-line no-await-in-loop -- one key at a time, as typed
		await delay(20);
	}

	instance.unmount();
	return changes.at(-1);
}

describe("search input", () => {
	it.for([
		["option+backspace", "\u001B\u007F", "a red "],
		["ctrl+w, which Zed sends for ctrl+backspace", "\u0017", "a red "],
		["ctrl+backspace, from a terminal with the kitty protocol", "\u001B[127;5u", "a red "],
		["ctrl+u, which Zed sends for cmd+backspace", "\u0015", ""],
		["cmd+backspace, from a terminal with the kitty protocol", "\u001B[127;9u", ""],
		["backspace", "\u007F", "a red fo"],
		["backspace held down, in one chunk", "\u007F\u007F\u007F", "a red "],
	] as const)("edits on %s", async ([, key, expected], { expect }) => {
		expect.assertions(1);

		await expect(typeIntoAsync(key)).resolves.toBe(expected);
	});

	it("doesn't type the letter of a control key it has no use for", async ({ expect }) => {
		expect.assertions(1);

		await expect(typeIntoAsync("\u0016", "!")).resolves.toBe("a red fox!");
	});
});

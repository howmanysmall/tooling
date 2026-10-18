import { setTimeout as delay } from "node:timers/promises";
import { describe, it } from "vitest";
import { fromPartial } from "@total-typescript/shoehorn";
import { Box } from "ink";

import { renderScreen, TEST_COLUMNS, TEST_ROWS } from "$interactive/app/test-screen";

import { planOpenTabs } from "./plan-open-tabs";
import { SessionListDialog } from "./session-list-dialog.tsx";
import { SessionProvider } from "./session-provider.tsx";
import { createSession, TurnPhase } from "./session-state";
import { createSessionStore } from "./session-store";
import { createSessionTabs, getActiveSession } from "./session-tabs";

import type { SessionSummary } from "$history/session-list";

import type { SessionServices } from "./session-services";

const NOW = new Date("2026-10-15T12:00:00.000Z");
const CAT: SessionSummary = { id: "01SESSIONCAT", cost: 0.02, runs: [], title: "a cat", updated: NOW.toISOString() };
const DOG: SessionSummary = { id: "01SESSIONDOG", runs: [], title: "a dog in a hat", updated: NOW.toISOString() };
const SESSIONS = [CAT, DOG];
const ROWS = /a cat +0 runs · \$0\.02 · Today[\s\S]*a dog in a hat +0 runs/u;

const SERVICES = fromPartial<SessionServices>({
	restoreAsync: async () => [
		{ model: "test/multi", phase: TurnPhase.Done, prompt: "a dog in a hat", requested: 1, warnings: [] },
	],
});

function ignore(): void {
	// Nothing is saved, and the dialog's closing isn't under test.
}

describe("session list dialog", () => {
	it("lists past sessions, narrows them as you type, and resumes the chosen one in a tab", async ({ expect }) => {
		expect.assertions(2);

		const fresh = createSession("01SESSIONNEW");
		const store = createSessionStore(createSessionTabs([fresh], fresh.id), async () => undefined);
		const instance = renderScreen(
			<SessionProvider services={SERVICES} store={store} onRunSaved={ignore}>
				<Box height={TEST_ROWS} width={TEST_COLUMNS}>
					<SessionListDialog
						columns={TEST_COLUMNS}
						now={NOW}
						rows={TEST_ROWS}
						sessions={SESSIONS}
						onClose={ignore}
					/>
				</Box>
			</SessionProvider>,
		);

		await expect.poll(() => String(instance.lastFrame())).toMatch(ROWS);

		await delay(100);
		instance.stdin.write("dog");
		await delay(100);
		instance.stdin.write("\r");

		await expect.poll(() => getActiveSession(store.getTabs()).id).toBe(DOG.id);
	});
});

describe("planOpenTabs", () => {
	it("reopens the tabs open last time, and adds the one asked for to show first", ({ expect }) => {
		expect.assertions(3);

		expect(planOpenTabs(SESSIONS, ["01SESSIONDOG", "01GONE"], undefined)).toStrictEqual({
			activeId: undefined,
			toOpen: [DOG],
		});
		expect(planOpenTabs(SESSIONS, ["01SESSIONDOG"], "last")).toStrictEqual({
			activeId: CAT.id,
			toOpen: [DOG, CAT],
		});
		expect(planOpenTabs([], [], "last")).toStrictEqual({ activeId: undefined, toOpen: [] });
	});
});

import { describe, it } from "vitest";

import { createSession, TurnPhase } from "./session-state";
import { createSessionStore, toOpenTabs } from "./session-store";
import { createSessionTabs, getActiveSession, getTabStatus, reduceSessionTabs, TabStatus } from "./session-tabs";

import type { SessionState, SessionTurn } from "./session-state";
import type { SessionTabs, SessionTabsAction } from "./session-tabs";

const DONE: SessionTurn = {
	id: 1,
	model: "test/multi",
	phase: TurnPhase.Done,
	prompt: "a cat",
	requested: 1,
	warnings: [],
};

function applyActions(tabs: SessionTabs, actions: ReadonlyArray<SessionTabsAction>): SessionTabs {
	let state = tabs;
	for (const action of actions) state = reduceSessionTabs(state, action);
	return state;
}

function openThree(): SessionTabs {
	const sessions = [createSession("A", [DONE]), createSession("B", [DONE]), createSession("C")];
	return createSessionTabs(sessions, "C");
}

function getIds(tabs: SessionTabs): Array<string> {
	return tabs.sessions.map((session: SessionState) => session.id);
}

describe("reduceSessionTabs", () => {
	it("lands a request on the session that sent it, and marks a hidden one unread", ({ expect }) => {
		expect.assertions(4);

		const tabs = applyActions(openThree(), [
			{
				action: { id: 2, model: "test/multi", prompt: "a dog", type: "turn-added" },
				session: "A",
				type: "in-session",
			},
			{ action: { id: 2, at: 5, error: "Failed.", type: "turn-failed" }, session: "A", type: "in-session" },
		]);

		expect(getActiveSession(tabs).id).toBe("C");
		expect(tabs.sessions[0]?.turns.map((turn) => turn.prompt)).toStrictEqual(["a cat", "a dog"]);
		expect(getTabStatus(getActiveSession({ ...tabs, activeId: "A" }), tabs.unread.has("A"))).toBe(TabStatus.Failed);
		expect(reduceSessionTabs(tabs, { id: "A", type: "select" }).unread.size).toBe(0);
	});

	it("reuses an empty tab for a new session, and shows an open session instead of opening it twice", ({ expect }) => {
		expect.assertions(2);

		const fresh = reduceSessionTabs(openThree(), { session: createSession("D"), type: "open" });
		const again = reduceSessionTabs(openThree(), { session: createSession("A", [DONE]), type: "open" });

		expect([getIds(fresh), fresh.activeId]).toStrictEqual([["A", "B", "C"], "C"]);
		expect([getIds(again), again.activeId]).toStrictEqual([["A", "B", "C"], "A"]);
	});

	it("shows the tab to the left after closing the one on screen, and a new session after the last", ({ expect }) => {
		expect.assertions(2);

		const closed = reduceSessionTabs(openThree(), { id: "C", replacement: createSession("N"), type: "close" });
		const last = applyActions(createSessionTabs([createSession("A", [DONE])], "A"), [
			{ id: "A", replacement: createSession("N"), type: "close" },
		]);

		expect([getIds(closed), closed.activeId]).toStrictEqual([["A", "B"], "B"]);
		expect([getIds(last), last.activeId]).toStrictEqual([["N"], "N"]);
	});

	it("puts a rewound session in its tab's place and shows it", ({ expect }) => {
		expect.assertions(1);

		const rewound = reduceSessionTabs(openThree(), {
			id: "B",
			session: createSession("F", [DONE]),
			type: "replace",
		});

		expect([getIds(rewound), rewound.activeId]).toStrictEqual([["A", "F", "C"], "F"]);
	});

	it("cycles through the tabs in both directions, wrapping around", ({ expect }) => {
		expect.assertions(2);

		expect(reduceSessionTabs(openThree(), { delta: 1, type: "cycle" }).activeId).toBe("A");
		expect(reduceSessionTabs(openThree(), { delta: -1, type: "cycle" }).activeId).toBe("B");
	});
});

describe("createSessionStore", () => {
	it("saves the tabs that can be reopened, only when they change", async ({ expect }) => {
		expect.assertions(2);

		const saved: Array<unknown> = [];
		const store = createSessionStore(openThree(), async (tabs) => {
			saved.push(tabs);
		});
		store.dispatch({ delta: -1, type: "cycle" });
		store.dispatch({
			action: { id: 9, model: "m", prompt: "p", type: "turn-added" },
			session: "B",
			type: "in-session",
		});
		await store.flushAsync();

		expect(saved).toStrictEqual([{ active: "B", open: ["A", "B"] }]);
		expect(toOpenTabs(openThree())).toStrictEqual({ open: ["A", "B"] });
	});
});

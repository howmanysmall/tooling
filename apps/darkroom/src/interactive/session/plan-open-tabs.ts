import { resolveSessionReference } from "$history/session-list";

import type { SessionSummary } from "$history/session-list";

/** Which sessions the app opens as tabs, and which shows first. */
export interface TabPlan {
	/** The session asked for, or `undefined` for a new session after the rest. */
	readonly activeId?: string | undefined;
	/** The sessions to rebuild, in tab order. */
	readonly toOpen: ReadonlyArray<SessionSummary>;
}

/**
 * Plans the tabs: the sessions open when the app last closed, then the one
 * asked for with `-c` or `-s`, which shows first. Sessions no longer in the
 * history are dropped.
 *
 * @param sessions - Every past session, the one used last first.
 * @param open - The sessions open when the app last closed, in tab order.
 * @param resume - `last`, a prefix of a session's ID, or `undefined`.
 * @returns The sessions to open, and the one to show.
 * @throws {Error} When no session matches `resume`.
 */
export function planOpenTabs(
	sessions: ReadonlyArray<SessionSummary>,
	open: ReadonlyArray<string>,
	resume: string | undefined,
): TabPlan {
	const isNew = resume === undefined || (resume === "last" && sessions.length === 0);
	const target = isNew ? undefined : resolveSessionReference(sessions, resume);
	const ids = new Set(open);
	if (target !== undefined) ids.add(target.id);

	const byId = new Map(sessions.map((session) => [session.id, session]));
	return { activeId: target?.id, toOpen: [...ids].flatMap((id) => byId.get(id) ?? []) };
}

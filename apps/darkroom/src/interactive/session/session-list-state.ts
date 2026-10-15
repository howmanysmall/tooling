import { Fzf } from "fzf";

import type { FzfResultItem } from "fzf";

import type { SessionSummary } from "$history/session-list";

/** A past session that matches the session list's query. */
export interface SessionMatch {
	/** Which characters of the title matched, to highlight them. */
	readonly positions: ReadonlySet<number>;
	readonly session: SessionSummary;
}

const NO_POSITIONS: ReadonlySet<number> = new Set();

/**
 * Ranks the sessions against the query by title, the way fzf does. With
 * no query, the one used last comes first.
 *
 * @param sessions - From `listSessions`, the one used last first.
 * @param query - What has been typed.
 * @returns The matches, best first.
 */
export function getSessionMatches(sessions: ReadonlyArray<SessionSummary>, query: string): Array<SessionMatch> {
	const trimmed = query.trim();
	if (trimmed.length === 0) return sessions.map((session) => ({ positions: NO_POSITIONS, session }));

	const finder = new Fzf(sessions, { selector: (session): string => session.title });
	// Fzf's find returns every match, never undefined.
	const ranked: ReadonlyArray<FzfResultItem<SessionSummary>> = finder.find(trimmed);
	return ranked.map(({ item, positions }) => ({ positions, session: item }));
}

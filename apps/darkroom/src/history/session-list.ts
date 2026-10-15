import { ValidationError } from "@cliffy/command";

import { SHORT_ID_LENGTH } from "./resolve-run-reference";

import type { HistoryEntry } from "./history-entry";

/** The runs of one session in the app, as the history recorded them. */
export interface SessionSummary {
	readonly id: string;
	/** What the runs cost together, when any cost was reported. */
	readonly cost?: number | undefined;
	/** Oldest first. */
	readonly runs: ReadonlyArray<HistoryEntry>;
	/** The first prompt, which names the session. */
	readonly title: string;
	/** When its newest run was made, as an ISO date. */
	readonly updated: string;
}

function sumCosts(runs: ReadonlyArray<HistoryEntry>): number | undefined {
	let total: number | undefined;
	for (const { cost } of runs) if (cost !== undefined) total = (total ?? 0) + cost;
	return total;
}

function toSummary(id: string, newestFirst: ReadonlyArray<HistoryEntry>): SessionSummary {
	const runs = newestFirst.toReversed();
	return {
		id,
		cost: sumCosts(runs),
		runs,
		title: runs[0]?.prompt ?? "",
		updated: newestFirst[0]?.created ?? "",
	};
}

/**
 * Groups the runs made in the app into their sessions. Runs from the
 * command line belong to none.
 *
 * @param entries - Every run, newest first.
 * @returns The sessions, the one used last first.
 */
export function listSessions(entries: ReadonlyArray<HistoryEntry>): Array<SessionSummary> {
	const groups = new Map<string, Array<HistoryEntry>>();
	for (const entry of entries) {
		if (entry.session === undefined) continue;

		const group = groups.get(entry.session);
		if (group === undefined) groups.set(entry.session, [entry]);
		else group.push(entry);
	}
	return Array.from(groups, ([id, runs]) => toSummary(id, runs));
}

/**
 * Finds the session a reference points to: `last` for the one used last,
 * or a unique prefix of its ID.
 *
 * @param sessions - From {@link listSessions}.
 * @param reference - What the user typed.
 * @returns The matching session.
 * @throws {ValidationError} When nothing matches or a prefix is ambiguous.
 */
export function resolveSessionReference(sessions: ReadonlyArray<SessionSummary>, reference: string): SessionSummary {
	if (reference === "last") {
		const [last] = sessions;
		if (last === undefined) throw new ValidationError("There is no session yet.");
		return last;
	}

	const prefix = reference.toUpperCase();
	const matches = sessions.filter((session) => session.id.startsWith(prefix));
	const [match] = matches;
	if (match === undefined) throw new ValidationError(`No session matches "${reference}".`);
	if (matches.length > 1) {
		const listing = matches.map((session) => `  ${session.id.slice(0, SHORT_ID_LENGTH)}  ${session.title}`);
		throw new ValidationError(`"${reference}" matches ${matches.length} sessions:\n${listing.join("\n")}`);
	}
	return match;
}

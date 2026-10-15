import { toPlural } from "@howmanysmall/english-utilities/to-plural";

import { formatCost, toDisplayPath } from "$generation/format-result";

import type { SessionTurn } from "./session-state";

function formatSeconds(turn: SessionTurn): string | undefined {
	if (turn.startedAt === undefined || turn.finishedAt === undefined) return undefined;
	return `${((turn.finishedAt - turn.startedAt) / 1000).toFixed(1)}s`;
}

/**
 * The line under a finished turn: the model, how long it took, what it
 * cost, and how many images came back when that isn't what was asked for.
 *
 * @param turn - A finished or failed turn.
 * @returns Like `Nano Banana 2.1 · 14.2s · $0.039`.
 */
export function summarizeTurn(turn: SessionTurn): string {
	const parts = [turn.modelName, formatSeconds(turn)];
	const { result } = turn;
	if (result !== undefined) {
		parts.push(formatCost(result.cost));
		if (result.returned !== result.requested) {
			parts.push(`${result.returned} of ${result.requested} ${toPlural(result.requested, "image")}`);
		}
	}
	return parts.filter((part) => part !== undefined).join(" · ");
}

/**
 * Where a finished turn's images were saved, relative to `cwd` when inside it.
 *
 * @param turn - A finished turn.
 * @param cwd - The working directory.
 * @returns One path per saved image.
 */
export function getTurnPaths(turn: SessionTurn, cwd: string): Array<string> {
	return (turn.result?.images ?? []).flatMap(({ path }) => (path === undefined ? [] : [toDisplayPath(path, cwd)]));
}

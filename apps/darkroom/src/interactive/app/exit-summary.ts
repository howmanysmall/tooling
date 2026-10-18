import { bold, dim, hex } from "ansis";

import { LOGO_DARK, LOGO_ROOM } from "$interactive/components/logo-lines";
import { theme } from "$interactive/components/theme";
import { getSessionTitle, TurnPhase } from "$interactive/session/session-state";

import type { SessionState } from "$interactive/session/session-state";

// The longest title shown before it is cut, so the line fits a terminal.
const MAX_TITLE_LENGTH = 60;

function truncate(text: string, length: number): string {
	const line = text.replaceAll(/\s+/gu, " ").trim();
	return line.length > length ? `${line.slice(0, length - 1)}…` : line;
}

/**
 * What darkroom prints after it closes, as opencode does: the logo, the
 * session that was on screen, and the command that resumes it. A session
 * with nothing saved can't be resumed, so it gets nothing.
 *
 * @param session - The session on screen when the app closed.
 * @param command - The command's name, like `darkroom`.
 * @returns The lines to print, or `undefined`.
 */
export function formatExitSummary(session: SessionState, command: string): string | undefined {
	if (session.turns.every((turn) => turn.phase !== TurnPhase.Done)) return undefined;

	const accent = hex(theme.accent);
	const resume = `${command} -s ${session.id}`;
	const logo = LOGO_DARK.map((dark, index) => `  ${dim(dark)} ${accent(LOGO_ROOM[index] ?? "")}`);
	return [
		"",
		...logo,
		"",
		`  ${dim("Session ")}  ${bold(truncate(getSessionTitle(session), MAX_TITLE_LENGTH))}`,
		`  ${dim("Continue")}  ${bold(resume)}`,
		"",
	].join("\n");
}

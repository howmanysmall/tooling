import { Fzf } from "fzf";

import { moveCursor } from "$interactive/components/list-cursor";

import type { CursorMove } from "$interactive/components/list-cursor";
import type { BrowserCommand } from "$interactive/keys/browser-command";

/** A command that matches the palette's query. */
export interface PaletteMatch {
	readonly command: BrowserCommand;
	/** Which characters of the title matched, to highlight them. */
	readonly positions: ReadonlySet<number>;
}

export interface PaletteState {
	readonly cursor: number;
	readonly query: string;
}

export const enum PaletteActionType {
	Move = 1,
	Query = 2,
}

export type PaletteAction =
	| { readonly count: number; readonly move: CursorMove; readonly type: PaletteActionType.Move }
	| { readonly query: string; readonly type: PaletteActionType.Query };

export const INITIAL_PALETTE_STATE: PaletteState = { cursor: 0, query: "" };

const NO_POSITIONS: ReadonlySet<number> = new Set();

/**
 * Ranks the commands against the query, best first, the way fzf does.
 *
 * @param commands - The commands the palette offers.
 * @param query - What has been typed.
 * @returns Every command when the query is empty, otherwise the matches.
 */
export function getPaletteMatches(commands: ReadonlyArray<BrowserCommand>, query: string): Array<PaletteMatch> {
	if (query.trim().length === 0) return commands.map((command) => ({ command, positions: NO_POSITIONS }));

	const finder = new Fzf(commands, { selector: (command): string => command.title });
	return finder.find(query.trim()).map(({ item, positions }) => ({ command: item, positions }));
}

/** A run of a title's characters that all matched, or all didn't. */
export interface TitleSegment {
	readonly isMatch: boolean;
	/** Where the run starts in the title. */
	readonly start: number;
	readonly text: string;
}

/**
 * Splits a title into runs of matched and unmatched characters, to
 * highlight what the query hit.
 *
 * @param title - The command's title.
 * @param positions - The indexes of the matched characters.
 * @returns The runs, in order.
 */
export function splitTitle(title: string, positions: ReadonlySet<number>): Array<TitleSegment> {
	// Titles are plain text, and fzf counts positions in UTF-16 units too.
	const segments: Array<TitleSegment> = [];
	for (let index = 0; index < title.length; index += 1) {
		const isMatch = positions.has(index);
		const last = segments.at(-1);
		if (last?.isMatch === isMatch) {
			segments[segments.length - 1] = { ...last, text: last.text + title.charAt(index) };
		} else {
			segments.push({ isMatch, start: index, text: title.charAt(index) });
		}
	}

	return segments;
}

/**
 * Applies one palette action.
 *
 * @param state - The current query and cursor.
 * @param action - A new query, or a cursor move within the matches.
 * @returns The next state; a new query puts the cursor back on the best match.
 */
export function reducePaletteState(state: PaletteState, action: PaletteAction): PaletteState {
	if (action.type === PaletteActionType.Query) {
		return action.query === state.query ? state : { cursor: 0, query: action.query };
	}

	return { ...state, cursor: moveCursor(state.cursor, action.move, action.count) };
}

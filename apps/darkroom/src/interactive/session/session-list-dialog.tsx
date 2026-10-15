import { TextInput } from "@inkjs/ui";
import { Box, Text } from "ink";

import { Dialog } from "$interactive/components/dialog";
import { DialogList } from "$interactive/components/dialog-list";
import { theme } from "$interactive/components/theme";
import { useSearchList } from "$interactive/palette/use-search-list";

import { useSession } from "./session-context";
import { SessionListRow } from "./session-list-row";
import { getSessionMatches } from "./session-list-state";

import type { ReactNode } from "react";

import type { SessionSummary } from "$history/session-list";
import type { KeyHint } from "$interactive/components/key-hints";

import type { SessionMatch } from "./session-list-state";

export interface SessionListDialogProperties {
	columns: number;
	/** When the app opened, for day names like `Today`. */
	now: Date;
	/** Closes the list without resuming anything. */
	onClose: () => void;
	rows: number;
	/** Every past session, the one used last first. */
	sessions: ReadonlyArray<SessionSummary>;
}

const HINTS: ReadonlyArray<KeyHint> = [
	["↑↓", "choose"],
	["⏎", "resume"],
];
// Rows of sessions shown at once.
const VISIBLE_ROWS = 12;

/**
 * Lists past sessions to resume, the one used last first. Typing narrows
 * them by their first prompt the way fzf does; resuming opens the session
 * in a tab with its images, or shows its tab when it is already open.
 *
 * @param properties - The sessions and the screen's size.
 * @param properties.columns - The screen's width.
 * @param properties.now - When the app opened.
 * @param properties.onClose - Closes the list.
 * @param properties.rows - The screen's height.
 * @param properties.sessions - Every past session.
 * @returns A dialog with a search line and the matching sessions.
 */
export function SessionListDialog({
	columns,
	now,
	onClose,
	rows,
	sessions,
}: Readonly<SessionListDialogProperties>): ReactNode {
	const { actions, tabs } = useSession();
	const visibleRows = Math.max(3, Math.min(VISIBLE_ROWS, rows - 12));
	const list = useSearchList((query) => getSessionMatches(sessions, query), visibleRows, onClose);
	const openIds = new Set(tabs.sessions.map((session) => session.id));

	function resume(match: SessionMatch | undefined): void {
		if (match === undefined) return;
		actions.resume(match.session);
		onClose();
	}

	function resumeSelected(): void {
		resume(list.selected);
	}

	return (
		<Dialog columns={columns} hints={HINTS} rows={rows} title="Sessions" width={88} onDismiss={onClose}>
			<Box marginBottom={1}>
				<Text bold={true} color={theme.accent}>
					{"› "}
				</Text>
				<TextInput placeholder="Search sessions" onChange={list.handleQueryChange} onSubmit={resumeSelected} />
			</Box>
			{list.visible.length === 0 ? (
				<Text color={theme.muted}>{sessions.length === 0 ? "No sessions yet." : "No sessions match."}</Text>
			) : null}
			<DialogList target="sessions:list" onWheel={list.handleWheel}>
				{list.visible.map((match, index) => (
					<SessionListRow
						key={match.session.id}
						isOpen={openIds.has(match.session.id)}
						isSelected={list.start + index === list.cursor}
						match={match}
						now={now}
						onChoose={(): void => {
							resume(match);
						}}
						onPoint={(): void => {
							list.pointAt(list.start + index);
						}}
					/>
				))}
			</DialogList>
		</Dialog>
	);
}

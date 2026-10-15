import { toPlural } from "@howmanysmall/english-utilities/to-plural";
import { Box, Text } from "ink";

import { formatCost } from "$generation/format-result";
import { HighlightedText } from "$interactive/components/highlighted-text";
import { getDialogRowBackground } from "$interactive/components/row-background";
import { theme } from "$interactive/components/theme";
import { describeMadeAt } from "$interactive/history/run-facts";
import { useMouseTarget } from "$interactive/mouse/mouse-context";

import type { ReactNode } from "react";

import type { SessionSummary } from "$history/session-list";

import type { SessionMatch } from "./session-list-state";

export interface SessionListRowProperties {
	/** Whether the session is open in a tab. */
	isOpen: boolean;
	isSelected: boolean;
	match: SessionMatch;
	/** When the list opened, for day names like `Today`. */
	now: Date;
	/** Resumes the session, as a click does. */
	onChoose: () => void;
}

function getMarks(isOpen: boolean, { forkedFrom }: SessionSummary): string {
	return `${isOpen ? "●" : " "}${forkedFrom === undefined ? " " : "⑂"}`;
}

/**
 * One past session: a dot when it is open in a tab and `⑂` when it was
 * forked from another, its first prompt with the matched characters
 * highlighted, and how many runs it has, what they
 * cost, and when it was last used.
 *
 * @param properties - The session and how it stands.
 * @param properties.isOpen - Whether it is open in a tab.
 * @param properties.isSelected - Whether Enter would resume it.
 * @param properties.match - The session and the characters the query hit.
 * @param properties.now - When the list opened.
 * @param properties.onChoose - Resumes the session.
 * @returns One line.
 */
export function SessionListRow({
	isOpen,
	isSelected,
	match,
	now,
	onChoose,
}: Readonly<SessionListRowProperties>): ReactNode {
	const { session } = match;
	const { attachNode, isHovered } = useMouseTarget(`sessions:${session.id}`, { onClick: onChoose });
	const count = session.runs.length;
	const facts = `${count} ${toPlural(count, "run")} · ${formatCost(session.cost)} · ${describeMadeAt(session.updated, now)}`;

	return (
		<Box
			ref={attachNode}
			backgroundColor={getDialogRowBackground(isSelected, isHovered)}
			columnGap={2}
			paddingX={1}
		>
			<Box flexShrink={0} width={3}>
				<Text color={isSelected ? theme.background : theme.accent}>{getMarks(isOpen, session)}</Text>
			</Box>
			<Box flexGrow={1} flexShrink={1} overflow="hidden">
				<HighlightedText isSelected={isSelected} positions={match.positions} text={session.title} />
			</Box>
			<Box flexShrink={0}>
				<Text color={isSelected ? theme.background : theme.muted}>{facts}</Text>
			</Box>
		</Box>
	);
}

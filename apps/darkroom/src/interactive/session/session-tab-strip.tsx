import { Box, Text } from "ink";

import { getStripWindow } from "$interactive/components/strip-window";
import { theme } from "$interactive/components/theme";

import { NewSessionButton } from "./new-session-button";
import { useSession } from "./session-context";
import { SessionTab } from "./session-tab";
import { getTabLayout, MARKER_COLUMNS, TAB_GAP } from "./session-tab-layout";
import { getTabStatus } from "./session-tabs";

import type { ReactNode } from "react";

export interface SessionTabStripProperties {
	columns: number;
}

/**
 * The open sessions as tabs, like opencode's: each with a mark for what it
 * is doing and its first prompt, the one on screen raised, and `+` for a
 * new session. When they don't fit, the tabs around the one on screen show
 * and the rest are counted at each side.
 *
 * @param properties - The screen's width.
 * @param properties.columns - The screen's width.
 * @returns One line.
 */
export function SessionTabStrip({ columns }: Readonly<SessionTabStripProperties>): ReactNode {
	const { actions, tabs } = useSession();
	const { sessions } = tabs;
	const activeIndex = Math.max(
		0,
		sessions.findIndex((session) => session.id === tabs.activeId),
	);
	const { capacity, width } = getTabLayout(columns, sessions.length);
	const { after, before, shown } = getStripWindow(sessions, activeIndex, capacity);
	const isClipped = before + after > 0;

	function handleNewSession(): void {
		actions.newSession();
	}

	return (
		<Box columnGap={TAB_GAP} flexShrink={0} paddingX={2}>
			{isClipped ? (
				<Box flexShrink={0} width={MARKER_COLUMNS}>
					<Text color={theme.muted}>{before === 0 ? "" : `‹ ${before}`}</Text>
				</Box>
			) : null}
			{shown.map((session, index) => (
				<SessionTab
					key={session.id}
					isActive={session.id === tabs.activeId}
					position={before + index + 1}
					session={session}
					status={getTabStatus(session, tabs.unread.has(session.id))}
					width={width}
					onClose={(): void => {
						actions.close(session.id);
					}}
					onSelect={(): void => {
						actions.select(session.id);
					}}
				/>
			))}
			{isClipped ? (
				<Box flexShrink={0} justifyContent="flex-end" width={MARKER_COLUMNS}>
					<Text color={theme.muted}>{after === 0 ? "" : `${after} ›`}</Text>
				</Box>
			) : null}
			<NewSessionButton onPress={handleNewSession} />
		</Box>
	);
}

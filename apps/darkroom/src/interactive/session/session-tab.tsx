import { Box, Text } from "ink";

import { theme } from "$interactive/components/theme";
import { useMouseTarget } from "$interactive/mouse/mouse-context";

import { getSessionTitle } from "./session-state";
import { SessionTabMark } from "./session-tab-mark";

import type { ReactNode } from "react";

import type { SessionState } from "./session-state";
import type { TabStatus } from "./session-tabs";

export interface SessionTabProperties {
	isActive: boolean;
	/** Closes the tab, as a click on its `✕` does. */
	onClose: () => void;
	/** Shows the session, as a click on the tab does. */
	onSelect: () => void;
	/** Where the tab is, from 1. */
	position: number;
	session: SessionState;
	status: TabStatus;
	width: number;
}

function getBackground(isActive: boolean, isHovered: boolean): string {
	if (isActive) return theme.element;
	return isHovered ? theme.hover : theme.panel;
}

/**
 * One open session: its mark, then its first prompt cut to fit, raised
 * and bright while it is on screen. A `✕` appears while the pointer is over
 * the tab; clicking it closes the tab, and clicking elsewhere shows it.
 *
 * @param properties - The session and its place in the strip.
 * @param properties.isActive - Whether the session is on screen.
 * @param properties.onClose - Closes the tab.
 * @param properties.onSelect - Shows the session.
 * @param properties.position - The tab's place, from 1.
 * @param properties.session - The open session it shows.
 * @param properties.status - Busy, waiting, unread, failed, or idle.
 * @param properties.width - The columns it takes.
 * @returns One line.
 */
export function SessionTab({
	isActive,
	onClose,
	onSelect,
	position,
	session,
	status,
	width,
}: Readonly<SessionTabProperties>): ReactNode {
	const { attachNode: attachTab, isHovered: isTabHovered } = useMouseTarget(`session-tab:${session.id}`, {
		onClick: onSelect,
	});
	const { attachNode: attachClose, isHovered: isCloseHovered } = useMouseTarget(`session-tab-close:${session.id}`, {
		onClick: onClose,
	});
	const isHovered = isTabHovered || isCloseHovered;

	return (
		<Box
			ref={attachTab}
			backgroundColor={getBackground(isActive, isHovered)}
			columnGap={1}
			flexShrink={0}
			paddingX={1}
			width={width}
		>
			<Box flexShrink={0} width={1}>
				<SessionTabMark position={position} status={status} />
			</Box>
			<Box flexGrow={1} flexShrink={1} overflow="hidden">
				<Text bold={isActive} color={isActive || isHovered ? theme.text : theme.muted} wrap="truncate-end">
					{getSessionTitle(session)}
				</Text>
			</Box>
			<Box ref={attachClose} flexShrink={0} width={1}>
				<Text color={isCloseHovered ? theme.danger : theme.muted}>{isHovered ? "✕" : " "}</Text>
			</Box>
		</Box>
	);
}

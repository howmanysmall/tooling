import { Box, Text } from "ink";

import { MarqueeText } from "$interactive/components/marquee-text";
import { theme } from "$interactive/components/theme";
import { useMouseTarget } from "$interactive/mouse/mouse-context";

import { getSessionTitle } from "./session-state";
import { SessionTabMark } from "./session-tab-mark";

import type { ReactNode } from "react";

import type { StyledRun } from "$interactive/components/marquee";

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

function getTitleRuns(session: SessionState, isActive: boolean, isHovered: boolean): Array<StyledRun> {
	const color = isActive || isHovered ? theme.text : theme.muted;
	return [{ color, isBold: isActive, text: getSessionTitle(session) }];
}

/**
 * One open session: its mark, then its first prompt cut to fit, raised
 * and bright while it is on screen. Under the pointer, a cut prompt
 * scrolls so all of it can be read, and a `✕` appears; clicking it closes
 * the tab, and clicking elsewhere shows it.
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
	const titleRuns = getTitleRuns(session, isActive, isHovered);

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
			<MarqueeText isScrolling={isHovered} runs={titleRuns} />
			<Box ref={attachClose} flexShrink={0} width={1}>
				<Text color={isCloseHovered ? theme.danger : theme.muted}>{isHovered ? "✕" : " "}</Text>
			</Box>
		</Box>
	);
}

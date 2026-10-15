import { Text } from "ink";

import { theme } from "$interactive/components/theme";

import { BusyMark } from "./busy-mark";
import { TabStatus } from "./session-tabs";

import type { ReactNode } from "react";

export interface SessionTabMarkProperties {
	/** Where the tab is, from 1, shown while nothing else needs saying. */
	position: number;
	status: TabStatus;
}

/**
 * The mark before a tab's title: a spinner while it generates, `?` while a
 * request waits for you to confirm it, a dot when it finished out of sight,
 * `✖` when that was a failure, and otherwise the tab's number.
 *
 * @param properties - How the session stands and where its tab is.
 * @param properties.position - The tab's place, from 1.
 * @param properties.status - Busy, waiting, unread, failed, or idle.
 * @returns One character.
 */
export function SessionTabMark({ position, status }: Readonly<SessionTabMarkProperties>): ReactNode {
	switch (status) {
		case TabStatus.Busy:
			return <BusyMark />;
		case TabStatus.Failed:
			return <Text color={theme.danger}>{"✖"}</Text>;
		case TabStatus.Unread:
			return <Text color={theme.accent}>{"●"}</Text>;
		case TabStatus.Waiting:
			return <Text color={theme.warning}>{"?"}</Text>;
		default:
			return <Text color={theme.border}>{String(position)}</Text>;
	}
}

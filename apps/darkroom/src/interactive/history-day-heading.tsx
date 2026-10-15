import { Box, Text } from "ink";

import { theme } from "./theme";

import type { ReactNode } from "react";

export interface HistoryDayHeadingProperties {
	/** Like `Today` or `Mon 12 Oct`. */
	label: string;
}

// Longer than any pane; the box clips it to fit.
const RULE = "─".repeat(240);

/**
 * A quiet divider above the runs of one day.
 *
 * @param properties - Which day the runs below were made.
 * @param properties.label - Like `Today` or `Mon 12 Oct`.
 * @returns The day's name followed by a rule across the pane.
 */
export function HistoryDayHeading({ label }: Readonly<HistoryDayHeadingProperties>): ReactNode {
	// Truncating would end the rule with an ellipsis, so the rule wraps and
	// its box clips it to one line instead.
	return (
		<Box columnGap={1} height={1}>
			<Box flexShrink={0}>
				<Text bold={true} color={theme.muted}>
					{label.toUpperCase()}
				</Text>
			</Box>
			<Box flexBasis={0} flexGrow={1} overflow="hidden">
				<Text color={theme.border}>{RULE}</Text>
			</Box>
		</Box>
	);
}

import { Box, Text } from "ink";

import { theme } from "./theme";

import type { ReactNode } from "react";

export interface SectionHeadingProperties {
	/** Like `Today` or `Pricing`; shown in capitals. */
	label: string;
}

// Longer than any pane; the box clips it to fit.
const RULE = "─".repeat(240);

/**
 * A quiet divider: a label followed by a rule across the pane.
 *
 * @param properties - What the section holds.
 * @param properties.label - Like `Today` or `Pricing`.
 * @returns One line.
 */
export function SectionHeading({ label }: Readonly<SectionHeadingProperties>): ReactNode {
	// Truncating would end the rule with an ellipsis, so the rule wraps and
	// its box clips it to one line instead.
	return (
		<Box columnGap={1} flexShrink={0} height={1}>
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

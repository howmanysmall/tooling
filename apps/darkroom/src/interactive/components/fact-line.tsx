import { Box, Text } from "ink";

import { theme } from "./theme";

import type { ReactNode } from "react";

import type { Fact } from "./fact";
import type { FactOverflow } from "./fact-overflow";

export interface FactLineProperties {
	fact: Fact;
	/** Whether the pointer is over it, which lights its value. */
	isHovered: boolean;
	/** Columns for the label, so the values line up. */
	labelWidth: number;
	overflow: FactOverflow;
}

/**
 * One fact: a muted label, then its value.
 *
 * @param properties - The fact and how it fits.
 * @param properties.fact - The label and value.
 * @param properties.isHovered - Whether the pointer is over it.
 * @param properties.labelWidth - Columns for the label.
 * @param properties.overflow - How a value too long for the pane fits.
 * @returns One line, or more when it wraps.
 */
export function FactLine({ fact, isHovered, labelWidth, overflow }: Readonly<FactLineProperties>): ReactNode {
	return (
		<>
			<Box flexShrink={0} width={labelWidth}>
				<Text color={theme.muted}>{fact.label}</Text>
			</Box>
			<Text
				color={isHovered ? theme.accent : theme.text}
				dimColor={fact.isQuiet === true}
				underline={isHovered}
				wrap={overflow}
			>
				{fact.value}
			</Text>
		</>
	);
}

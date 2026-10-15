import { Box, Text } from "ink";

import { theme } from "./theme";

import type { ReactNode } from "react";

import type { Fact } from "./fact";

export interface FactLinesProperties {
	facts: ReadonlyArray<Fact>;
	/** Columns for the labels, so the values line up. */
	labelWidth: number;
	/**
	 * What a value too long for the pane does: `truncate-middle` keeps both
	 * ends of a path; `wrap` continues under itself, for lists of choices.
	 */
	overflow: "truncate-middle" | "wrap";
}

/**
 * Facts one per line, a muted label then its value.
 *
 * @param properties - What to show.
 * @param properties.facts - The facts, top to bottom.
 * @param properties.labelWidth - Columns for the labels.
 * @param properties.overflow - How a value too long for the pane fits.
 * @returns The lines; each keeps its height, so a long list is clipped at the
 *   bottom instead of overlapping.
 */
export function FactLines({ facts, labelWidth, overflow }: Readonly<FactLinesProperties>): ReactNode {
	return (
		<Box flexDirection="column" flexShrink={0}>
			{facts.map(({ isQuiet, label, value }) => (
				<Box key={`${label}:${value}`} flexShrink={0}>
					<Box flexShrink={0} width={labelWidth}>
						<Text color={theme.muted}>{label}</Text>
					</Box>
					<Text dimColor={isQuiet === true} wrap={overflow}>
						{value}
					</Text>
				</Box>
			))}
		</Box>
	);
}

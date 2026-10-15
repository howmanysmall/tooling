import { Box, Text } from "ink";

import { theme } from "./theme";

import type { ReactNode } from "react";

import type { Fact } from "./fact";

export interface FactColumnsProperties {
	facts: ReadonlyArray<Fact>;
}

/**
 * Headline facts as small columns, each a muted label over its value. They
 * wrap onto a second row in narrow panes.
 *
 * @param properties - What to show.
 * @param properties.facts - The facts, left to right.
 * @returns A row of labelled columns.
 */
export function FactColumns({ facts }: Readonly<FactColumnsProperties>): ReactNode {
	return (
		<Box columnGap={4} flexShrink={0} flexWrap="wrap" rowGap={1}>
			{facts.map(({ label, value }) => (
				<Box key={label} flexDirection="column" flexShrink={0}>
					<Text color={theme.muted}>{label.toUpperCase()}</Text>
					<Text>{value}</Text>
				</Box>
			))}
		</Box>
	);
}

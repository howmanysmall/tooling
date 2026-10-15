import { Box, Text } from "ink";

import { theme } from "./theme";

import type { ReactNode } from "react";

/** A key as shown, and what it does. */
export type HelpRow = readonly [key: string, title: string];

export interface HelpSectionProperties {
	heading: string;
	rows: ReadonlyArray<HelpRow>;
}

const KEY_WIDTH = 9;

/**
 * One group of keys in the help dialog: a muted heading, then each key in
 * the accent color beside what it does.
 *
 * @param properties - The group.
 * @param properties.heading - Like `Actions`.
 * @param properties.rows - Each key and what it does.
 * @returns The heading and its rows.
 */
export function HelpSection({ heading, rows }: Readonly<HelpSectionProperties>): ReactNode {
	return (
		<Box flexDirection="column" marginBottom={1}>
			<Text bold={true} color={theme.muted}>
				{heading.toUpperCase()}
			</Text>
			{rows.map(([key, title]) => (
				<Box key={`${key}:${title}`}>
					<Box flexShrink={0} width={KEY_WIDTH}>
						<Text bold={true} color={theme.accent}>
							{key}
						</Text>
					</Box>
					<Text>{title}</Text>
				</Box>
			))}
		</Box>
	);
}

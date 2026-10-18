import { Box, Text } from "ink";

import { theme } from "./theme";

import type { ReactNode } from "react";

/** A key and what it does, like `["/", "filter"]`. */
export type KeyHint = readonly [key: string, action: string];

export interface KeyHintsProperties {
	hints: ReadonlyArray<KeyHint>;
}

/**
 * Key bindings on one line: each key in the accent color, its action muted.
 *
 * @param properties - The bindings to show.
 * @param properties.hints - Each key and what it does, in order.
 * @returns One line of key hints.
 */
export function KeyHints({ hints }: Readonly<KeyHintsProperties>): ReactNode {
	return (
		<Box columnGap={2}>
			{hints.map(([key, action]) => (
				<Text key={key}>
					<Text bold={true} color={theme.accent}>
						{key}
					</Text>
					<Text color={theme.muted}>{` ${action}`}</Text>
				</Text>
			))}
		</Box>
	);
}

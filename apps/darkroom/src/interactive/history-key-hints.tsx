import { Box, Text } from "ink";

import { theme } from "./theme";

import type { ReactNode } from "react";

const KEY_HINTS: ReadonlyArray<readonly [key: string, action: string]> = [
	["↑↓", "move"],
	["/", "filter"],
	["⏎", "open"],
	["y", "copy id"],
	["r", "re-run"],
	["d", "delete"],
	["q", "quit"],
];

/**
 * The key bindings: each key in the accent colour, its action muted.
 *
 * @returns One line of key hints.
 */
export function HistoryKeyHints(): ReactNode {
	return (
		<Box columnGap={2}>
			{KEY_HINTS.map(([key, action]) => (
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

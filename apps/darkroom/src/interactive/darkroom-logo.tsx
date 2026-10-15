import { Box, Text } from "ink";

import { theme } from "./theme";

import type { ReactNode } from "react";

// "dark" and "room" in a two-row block font.
const DARK = ["█▀▄ ▄▀█ █▀█ █▄▀", "█▄▀ █▀█ █▀▄ █ █"];
const ROOM = ["█▀█ █▀█ █▀█ █▀▄▀█", "█▀▄ █▄█ █▄█ █ ▀ █"];

/**
 * The word darkroom in block letters, "dark" muted and "room" in the
 * safelight accent.
 *
 * @returns Two lines.
 */
export function DarkroomLogo(): ReactNode {
	return (
		<Box columnGap={1} flexShrink={0}>
			<Text color={theme.muted}>{DARK.join("\n")}</Text>
			<Text color={theme.accent}>{ROOM.join("\n")}</Text>
		</Box>
	);
}

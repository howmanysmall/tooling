import { Box, Text } from "ink";

import { LOGO_DARK, LOGO_ROOM } from "./logo-lines";
import { theme } from "./theme";

import type { ReactNode } from "react";

/**
 * The word darkroom in block letters, "dark" muted and "room" in the
 * safelight accent.
 *
 * @returns Two lines.
 */
export function DarkroomLogo(): ReactNode {
	return (
		<Box columnGap={1} flexShrink={0}>
			<Text color={theme.muted}>{LOGO_DARK.join("\n")}</Text>
			<Text color={theme.accent}>{LOGO_ROOM.join("\n")}</Text>
		</Box>
	);
}

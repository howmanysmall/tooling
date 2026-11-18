import { Text } from "@visulima/tui/components/text";
import { useAnimation } from "@visulima/tui/hooks/use-animation";

import { theme } from "$interactive/components/theme";

import type { ReactNode } from "react";

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/**
 * A spinner for a tab whose session is generating.
 *
 * @returns One character that turns ten times a second.
 */
export function BusyMark(): ReactNode {
	const { frame } = useAnimation({ interval: 100 });
	return <Text color={theme.accent}>{SPINNER[frame % SPINNER.length]}</Text>;
}

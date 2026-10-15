import { Text, useAnimation } from "ink";

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

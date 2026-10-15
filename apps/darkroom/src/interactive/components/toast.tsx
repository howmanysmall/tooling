import { Box, Text } from "ink";

import { theme } from "./theme";

import type { ReactNode } from "react";

import type { StatusMessage } from "./status-message";

export interface ToastProperties {
	status: StatusMessage;
}

/**
 * The outcome of the last action, raised in the top-right corner with a
 * colored edge, until it expires or the next action replaces it.
 *
 * @param properties - What to report.
 * @param properties.status - The message and its tone.
 * @returns A small box pinned over the panes.
 */
export function Toast({ status }: Readonly<ToastProperties>): ReactNode {
	const color = status.tone === "error" ? theme.danger : theme.success;

	return (
		<Box
			backgroundColor={theme.element}
			borderBottom={false}
			borderColor={color}
			borderRight={false}
			borderStyle="bold"
			borderTop={false}
			paddingX={2}
			position="absolute"
			right={2}
			top={2}
		>
			<Text>
				<Text bold={true} color={color}>
					{status.tone === "error" ? "✖  " : "✔  "}
				</Text>
				{status.text}
			</Text>
		</Box>
	);
}

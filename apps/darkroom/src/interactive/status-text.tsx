import { Text } from "ink";

import { theme } from "./theme";

import type { ReactNode } from "react";

import type { StatusMessage } from "./status-message";

export interface StatusTextProperties {
	status: StatusMessage;
}

/**
 * The outcome of the last action, marked and coloured by whether it worked.
 *
 * @param properties - What to report.
 * @param properties.status - The message and its tone.
 * @returns `✔ Copied …` in green, or `✖ Could not …` in red.
 */
export function StatusText({ status }: Readonly<StatusTextProperties>): ReactNode {
	return status.tone === "error" ? (
		<Text color={theme.danger}>{`✖ ${status.text}`}</Text>
	) : (
		<Text color={theme.success}>{`✔ ${status.text}`}</Text>
	);
}

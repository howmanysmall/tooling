import { Box, Text } from "ink";

import { KeyHints } from "./key-hints";
import { theme } from "./theme";

import type { ReactNode } from "react";

import type { BrowserCommand } from "$interactive/keys/browser-command";

import type { KeyHint } from "./key-hints";

export interface StatusBarProperties {
	/** The screen's commands; the featured ones are hinted on the left. */
	commands: ReadonlyArray<BrowserCommand>;
	/** A short count or total for the right, like `71 runs · $4.65`. */
	summary: string;
	/** Replaces the hints while the screen needs the line, as for its filter. */
	children?: ReactNode;
}

const HELP_HINT: KeyHint = ["?", "help"];

function getHints(commands: ReadonlyArray<BrowserCommand>): Array<KeyHint> {
	const featured = commands.flatMap((command) =>
		command.isFeatured === true ? [[command.keyLabel, command.title.toLowerCase()] as const] : [],
	);

	return [...featured, HELP_HINT];
}

/**
 * The bottom line: the main keys (or the screen's input) on the left, and
 * the screen's summary and the command palette's key on the right.
 *
 * @param properties - What to show.
 * @param properties.commands - The screen's commands.
 * @param properties.summary - A short count or total.
 * @param properties.children - The screen's input, when it has one open.
 * @returns One line.
 */
export function StatusBar({ commands, summary, children }: Readonly<StatusBarProperties>): ReactNode {
	return (
		<Box columnGap={2} flexShrink={0} justifyContent="space-between" paddingX={2}>
			<Box flexShrink={1} overflow="hidden">
				{children ?? <KeyHints hints={getHints(commands)} />}
			</Box>
			<Box columnGap={2} flexShrink={0}>
				<Text color={theme.muted}>{summary}</Text>
				<Text>
					<Text bold={true}>{"ctrl+p"}</Text>
					<Text color={theme.muted}>{" commands"}</Text>
				</Text>
			</Box>
		</Box>
	);
}

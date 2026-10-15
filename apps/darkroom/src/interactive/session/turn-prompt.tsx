import { Box, Text } from "ink";

import { theme } from "$interactive/components/theme";
import { useMouseTarget } from "$interactive/mouse/mouse-context";

import { useTranscriptActions } from "./transcript-actions-context";

import type { ReactNode } from "react";

import type { SessionTurn } from "./session-state";

export interface TurnPromptProperties {
	turn: SessionTurn;
}

/**
 * A turn's prompt on a raised panel with the safelight edge. Clicking it
 * offers what to do with it, as opencode does with a message: rewind to
 * before it, fork from there, use it again, or copy it.
 *
 * @param properties - The turn whose prompt it shows.
 * @param properties.turn - Its prompt, and its ID for rewinding.
 * @returns The prompt block.
 */
export function TurnPrompt({ turn }: Readonly<TurnPromptProperties>): ReactNode {
	const transcript = useTranscriptActions();
	const { attachNode, isHovered } = useMouseTarget(`turn-prompt:${turn.id}`, {
		onClick(): void {
			transcript?.showPrompt(turn);
		},
	});

	return (
		<Box
			ref={attachNode}
			backgroundColor={isHovered ? theme.element : theme.panel}
			borderBottom={false}
			borderColor={theme.accent}
			borderRight={false}
			borderStyle="bold"
			borderTop={false}
			paddingX={2}
			paddingY={1}
		>
			<Text>{turn.prompt}</Text>
		</Box>
	);
}

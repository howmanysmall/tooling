import { Text, useAnimation } from "ink";

import { describeProgress } from "$generation/image-stream";
import { theme } from "$interactive/components/theme";

import type { ReactNode } from "react";

import type { SessionTurn } from "./session-state";

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export interface TurnStatusProperties {
	turn: SessionTurn;
}

/**
 * A running turn's live line: a spinner, the model, how far the stream
 * has got, and how long it has taken, like
 * `⠹ Generating · Nano Banana · image 1/2 · partial 3 · 12s`.
 *
 * @param properties - The running turn.
 * @param properties.turn - Its model, progress, and request.
 * @returns One line that ticks ten times a second.
 */
export function TurnStatus({ turn }: Readonly<TurnStatusProperties>): ReactNode {
	const { frame, time } = useAnimation({ interval: 100 });
	const parts = ["Generating", turn.modelName];
	if (turn.progress !== undefined) parts.push(describeProgress(turn.progress, turn.requested));
	parts.push(`${Math.floor(time / 1000)}s`);

	return (
		<Text>
			<Text color={theme.accent}>{`${SPINNER[frame % SPINNER.length]} `}</Text>
			<Text color={theme.muted}>{parts.join(" · ")}</Text>
		</Text>
	);
}

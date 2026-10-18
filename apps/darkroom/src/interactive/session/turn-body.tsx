import { Text } from "ink";

import { theme } from "$interactive/components/theme";

import { useModelName } from "./model-name-context";
import { TurnPhase } from "./session-state";
import { TurnResult } from "./turn-result";
import { TurnStatus } from "./turn-status";
import { summarizeTurn } from "./turn-summary";

import type { ReactNode } from "react";

import type { TurnResultProperties } from "./turn-result";

/**
 * What is happening to a turn: checking the price, waiting for you to
 * confirm, generating, what it made, or why it failed.
 *
 * @param properties - The turn and how to draw its images.
 * @param properties.box - The cells each image may use.
 * @param properties.getPreview - Loads a preview of a saved image.
 * @param properties.turn - Any turn, in any phase.
 * @returns The turn's status, or its images and summary.
 */
export function TurnBody({ box, getPreview, turn }: Readonly<TurnResultProperties>): ReactNode {
	const modelName = useModelName(turn.model);
	if (turn.phase === TurnPhase.Preparing) {
		return <Text color={theme.muted}>{`◌ Checking ${modelName} and the price…`}</Text>;
	}
	if (turn.phase === TurnPhase.Confirming) {
		return <Text color={theme.muted}>{"◌ Waiting for you to confirm"}</Text>;
	}
	if (turn.phase === TurnPhase.Running) {
		return <TurnStatus turn={turn} />;
	}
	if (turn.phase === TurnPhase.Done) {
		return <TurnResult box={box} getPreview={getPreview} turn={turn} />;
	}

	return (
		<Text>
			<Text color={theme.danger}>{`✖ ${turn.error ?? "Failed."}`}</Text>
			<Text color={theme.muted}>{`  ${summarizeTurn(turn, modelName)}`}</Text>
		</Text>
	);
}

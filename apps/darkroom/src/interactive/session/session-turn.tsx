import { Box, Text } from "ink";

import { theme } from "$interactive/components/theme";

import { TurnBody } from "./turn-body";
import { TurnPrompt } from "./turn-prompt";

import type { ReactNode } from "react";

import type { TurnResultProperties } from "./turn-result";

/**
 * One turn of the session: your prompt on a raised panel with the
 * safelight edge, then what is happening to it or what came back, and any
 * warnings.
 *
 * @param properties - The turn and how to draw its images.
 * @param properties.box - The cells each image may use.
 * @param properties.getPreview - Loads a preview of a saved image.
 * @param properties.turn - Your prompt and its outcome.
 * @returns The prompt block above its outcome.
 */
export function SessionTurnView({ box, getPreview, turn }: Readonly<TurnResultProperties>): ReactNode {
	return (
		<Box flexDirection="column" flexShrink={0} rowGap={1}>
			<TurnPrompt turn={turn} />
			<Box flexDirection="column" paddingLeft={3}>
				<TurnBody box={box} getPreview={getPreview} turn={turn} />
				{turn.warnings.map((warning) => (
					<Text key={warning} color={theme.warning}>{`! ${warning}`}</Text>
				))}
			</Box>
		</Box>
	);
}

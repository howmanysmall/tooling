import { Box, Text } from "ink";

import { theme } from "$interactive/components/theme";

import { useModelName } from "./model-name-context";
import { TurnImages } from "./turn-images";
import { TurnPathLine } from "./turn-path-line";
import { summarizeTurn } from "./turn-summary";

import type { ReactNode } from "react";

import type { SavedImage } from "$generation/save-run";
import type { CellBox } from "$preview/cell-fit";
import type { LoadingPreview } from "$preview/load-preview";

import type { SessionTurn } from "./session-state";

export interface TurnResultProperties {
	/** The cells each image may use. */
	box: CellBox;
	getPreview: (path: string, box: CellBox) => LoadingPreview | undefined;
	/** A finished turn. */
	turn: SessionTurn;
}

const NO_IMAGES: ReadonlyArray<SavedImage> = [];

/**
 * What a finished turn made: its images, then the model, time, and cost,
 * and where each image was saved.
 *
 * @param properties - The finished turn and how to draw its images.
 * @param properties.box - The cells each image may use.
 * @param properties.getPreview - Loads a preview of a saved image.
 * @param properties.turn - The finished turn.
 * @returns The images above a summary line and the saved paths.
 */
export function TurnResult({ box, getPreview, turn }: Readonly<TurnResultProperties>): ReactNode {
	const modelName = useModelName(turn.model);
	return (
		<Box flexDirection="column" rowGap={1}>
			<TurnImages box={box} getPreview={getPreview} images={turn.result?.images ?? NO_IMAGES} />
			<Box flexDirection="column">
				<Text>
					<Text color={theme.accent}>{"◆ "}</Text>
					<Text color={theme.muted}>{summarizeTurn(turn, modelName)}</Text>
				</Text>
				{(turn.result?.images ?? NO_IMAGES).flatMap(({ mediaType, path }) =>
					path === undefined ? [] : [<TurnPathLine key={path} mediaType={mediaType} path={path} />],
				)}
			</Box>
		</Box>
	);
}

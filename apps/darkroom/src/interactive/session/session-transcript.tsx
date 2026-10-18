import { Box } from "ink";

import { SessionTurnView } from "./session-turn";

import type { ReactNode } from "react";

import type { CellBox } from "$preview/cell-fit";
import type { LoadingPreview } from "$preview/load-preview";

import type { SessionTurn } from "./session-state";

export interface SessionTranscriptProperties {
	columns: number;
	getPreview: (path: string, box: CellBox) => LoadingPreview | undefined;
	/** The rows the transcript has, for sizing images. */
	rows: number;
	/** Oldest first. */
	turns: ReadonlyArray<SessionTurn>;
}

// The most cells an image gets, so a few fit side by side.
const MAX_IMAGE_COLUMNS = 48;
const MAX_IMAGE_ROWS = 18;
// The transcript's padding, the turn's indent, and the gap between images.
const CHROME_COLUMNS = 4 + 3;
const IMAGE_GAP = 2;
// Only the newest turns can be on screen; older ones scroll off the top.
const SHOWN_TURNS = 6;

function getImageBox(turn: SessionTurn, columns: number, rows: number): CellBox {
	const count = Math.max(1, turn.requested);
	const available = Math.floor((columns - CHROME_COLUMNS - IMAGE_GAP * (count - 1)) / count);
	return {
		columns: Math.max(8, Math.min(MAX_IMAGE_COLUMNS, available)),
		rows: Math.max(4, Math.min(MAX_IMAGE_ROWS, Math.floor(rows * 0.6))),
	};
}

/**
 * The session so far, newest at the bottom just above the prompt box, the
 * way a chat reads. Turns that no longer fit scroll off the top.
 *
 * @param properties - The turns and the space they have.
 * @param properties.columns - The transcript's width.
 * @param properties.getPreview - Loads a preview of a saved image.
 * @param properties.rows - The transcript's height.
 * @param properties.turns - Every turn, oldest first.
 * @returns A column of turns, pinned to the bottom.
 */
export function SessionTranscript({
	columns,
	getPreview,
	rows,
	turns,
}: Readonly<SessionTranscriptProperties>): ReactNode {
	return (
		<Box
			flexDirection="column"
			flexGrow={1}
			flexShrink={1}
			justifyContent="flex-end"
			overflow="hidden"
			paddingX={2}
			rowGap={1}
		>
			{turns.slice(-SHOWN_TURNS).map((turn) => (
				<SessionTurnView
					key={turn.id}
					box={getImageBox(turn, columns, rows)}
					getPreview={getPreview}
					turn={turn}
				/>
			))}
		</Box>
	);
}

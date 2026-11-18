import { useRef, useState } from "react";
import { getInnerHeight, getScrollHeight, getScrollTop } from "@visulima/tui";
import { Box } from "@visulima/tui/components/box";
import { useScrollAcceleration } from "@visulima/tui/hooks/use-scroll-acceleration";

import { theme } from "$interactive/components/theme";
import { useMouseTarget } from "$interactive/mouse/mouse-context";

import { SessionTurnView } from "./session-turn";
import { FOLLOW_NEWEST, scrollTranscript } from "./transcript-scroll";

import type { DOMElement } from "@visulima/tui/dom";
import type { ReactNode } from "react";

import type { CellBox } from "$preview/cell-fit";
import type { LoadingPreview } from "$preview/load-preview";

import type { SessionTurn } from "./session-state";
import type { TranscriptScroll } from "./transcript-scroll";

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

// Only the newest turns draw their images. Drawing every turn's would decode
// them all when a long session opens, and with kitty graphics send each one
// to the terminal: tens of megabytes for 60 turns.
const TURNS_WITH_PREVIEWS = 6;

function getNoPreview(): undefined {
	return undefined;
}

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
 * way a chat reads. It follows the newest turn; the wheel scrolls back
 * through older ones, with a scrollbar showing where you are. Only the
 * newest turns draw their images; older ones keep their prompts and paths.
 *
 * @param properties - The turns and the space they have.
 * @param properties.columns - The transcript's width.
 * @param properties.getPreview - Loads a preview of a saved image.
 * @param properties.rows - The transcript's height.
 * @param properties.turns - Every turn, oldest first.
 * @returns A scrolling column of turns, pinned to the bottom.
 */
export function SessionTranscript({
	columns,
	getPreview,
	rows,
	turns,
}: Readonly<SessionTranscriptProperties>): ReactNode {
	const boxRef = useRef<DOMElement | null>(null);
	const firstWithPreview = turns.length - TURNS_WITH_PREVIEWS;
	const [scroll, setScroll] = useState<TranscriptScroll>(undefined);

	function scrollBy(delta: number): void {
		const node = boxRef.current;
		if (node === null) return;

		const bottom = getScrollHeight(node) - getInnerHeight(node);
		const current = Math.min(getScrollTop(node), bottom);
		setScroll(scrollTranscript(current, delta, bottom));
	}

	const { handleScroll } = useScrollAcceleration({ onScroll: scrollBy });
	const { attachNode } = useMouseTarget("transcript", {
		onWheel(delta): void {
			handleScroll(delta > 0 ? "down" : "up");
		},
	});

	function attachBox(node: DOMElement | null): (() => void) | undefined {
		boxRef.current = node;
		return attachNode(node);
	}

	return (
		<Box
			ref={attachBox}
			flexDirection="column"
			flexGrow={1}
			flexShrink={1}
			overflow="scroll"
			paddingX={2}
			scrollbarThumbColor={theme.border}
			scrollTop={scroll ?? FOLLOW_NEWEST}
		>
			{/* Keeps a short session down by the prompt box. */}
			<Box flexGrow={1} />
			<Box flexDirection="column" flexShrink={0} rowGap={1}>
				{turns.map((turn, index) => (
					<SessionTurnView
						key={turn.id}
						box={getImageBox(turn, columns, rows)}
						getPreview={index < firstWithPreview ? getNoPreview : getPreview}
						turn={turn}
					/>
				))}
			</Box>
		</Box>
	);
}

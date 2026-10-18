import { Box } from "ink";

import { FactLine } from "./fact-line";
import { ImageFactLine } from "./image-fact-line";

import type { ReactNode } from "react";

import type { Fact } from "./fact";
import type { FactOverflow } from "./fact-overflow";

export interface FactLinesProperties {
	facts: ReadonlyArray<Fact>;
	/** Columns for the labels, so the values line up. */
	labelWidth: number;
	/** Opens an image's actions, for facts that name one. */
	onOpenImage?: ((path: string) => void) | undefined;
	/**
	 * What a value too long for the pane does: `truncate-middle` keeps both
	 * ends of a path; `wrap` continues under itself, for lists of choices.
	 */
	overflow: FactOverflow;
}

/**
 * Facts one per line, a muted label then its value. A fact naming an
 * image can be clicked for the image's actions.
 *
 * @param properties - What to show.
 * @param properties.facts - The facts, top to bottom.
 * @param properties.labelWidth - Columns for the labels.
 * @param properties.onOpenImage - Opens an image's actions.
 * @param properties.overflow - How a value too long for the pane fits.
 * @returns The lines; each keeps its height, so a long list is clipped at the
 *   bottom instead of overlapping.
 */
export function FactLines({ facts, labelWidth, onOpenImage, overflow }: Readonly<FactLinesProperties>): ReactNode {
	return (
		<Box flexDirection="column" flexShrink={0}>
			{facts.map((fact) =>
				onOpenImage === undefined || fact.imagePath === undefined ? (
					<Box key={`${fact.label}:${fact.value}`} flexShrink={0}>
						<FactLine fact={fact} isHovered={false} labelWidth={labelWidth} overflow={overflow} />
					</Box>
				) : (
					<ImageFactLine
						key={`${fact.label}:${fact.value}`}
						fact={fact}
						imagePath={fact.imagePath}
						labelWidth={labelWidth}
						overflow={overflow}
						onOpenActions={onOpenImage}
					/>
				),
			)}
		</Box>
	);
}

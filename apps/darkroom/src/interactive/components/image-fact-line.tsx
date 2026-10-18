import { Box } from "ink";

import { useMouseTarget } from "$interactive/mouse/mouse-context";

import { FactLine } from "./fact-line";

import type { ReactNode } from "react";

import type { Fact } from "./fact";
import type { FactOverflow } from "./fact-overflow";

export interface ImageFactLineProperties {
	fact: Fact;
	/** The image's absolute path. */
	imagePath: string;
	/** Columns for the label, so the values line up. */
	labelWidth: number;
	/** Opens the image's actions, as a click does. */
	onOpenActions: (path: string) => void;
	overflow: FactOverflow;
}

/**
 * A fact naming an image file, such as a run's `file`. It lights up under
 * the pointer, and a click opens the image's actions.
 *
 * @param properties - The fact, its image, and what a click does.
 * @param properties.fact - The label and value.
 * @param properties.imagePath - The image's absolute path.
 * @param properties.labelWidth - Columns for the label.
 * @param properties.onOpenActions - Opens the image's actions.
 * @param properties.overflow - How a value too long for the pane fits.
 * @returns One line.
 */
export function ImageFactLine({
	fact,
	imagePath,
	labelWidth,
	onOpenActions,
	overflow,
}: Readonly<ImageFactLineProperties>): ReactNode {
	const { attachNode, isHovered } = useMouseTarget(`fact-image:${imagePath}`, {
		onClick(): void {
			onOpenActions(imagePath);
		},
	});

	return (
		<Box ref={attachNode} flexShrink={0}>
			<FactLine fact={fact} isHovered={isHovered} labelWidth={labelWidth} overflow={overflow} />
		</Box>
	);
}

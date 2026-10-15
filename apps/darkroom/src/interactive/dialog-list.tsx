import { Box } from "ink";

import { useMouseTarget } from "./mouse-context";

import type { ReactNode } from "react";

export interface DialogListProperties {
	/** Moves the cursor: `1` for the wheel down, `-1` for up. */
	onWheel: (delta: number) => void;
	/** Names it to the mouse; unique on screen, like `palette:list`. */
	target: string;
	children: ReactNode;
}

/**
 * The rows of a searchable dialog, which the wheel scrolls through.
 *
 * @param properties - The rows and how the wheel moves through them.
 * @param properties.onWheel - Moves the cursor.
 * @param properties.target - Names it to the mouse; unique on screen.
 * @param properties.children - The rows.
 * @returns A column of the rows.
 */
export function DialogList({ onWheel, target, children }: Readonly<DialogListProperties>): ReactNode {
	const { attachNode } = useMouseTarget(target, { onWheel });

	return (
		<Box ref={attachNode} flexDirection="column">
			{children}
		</Box>
	);
}

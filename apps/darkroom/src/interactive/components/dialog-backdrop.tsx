import { Box } from "ink";

import { useMouseTarget } from "$interactive/mouse/mouse-context";

import type { ReactNode } from "react";

export interface DialogBackdropProperties {
	columns: number;
	/** What a click outside the dialog does, as Esc would. */
	onDismiss: () => void;
	rows: number;
	/** The dialog's name, which makes the target's ID. */
	title: string;
	children: ReactNode;
}

/**
 * Covers the screen so nothing behind a dialog reacts to the mouse, and
 * dismisses the dialog when clicked.
 *
 * @param properties - The screen's size and what a click does.
 * @param properties.columns - The screen's width.
 * @param properties.onDismiss - What a click outside the dialog does.
 * @param properties.rows - The screen's height.
 * @param properties.title - The dialog's name, which makes the target's ID.
 * @param properties.children - The dialog's panel.
 * @returns An overlay the size of the screen, with the panel in its middle.
 */
export function DialogBackdrop({
	columns,
	onDismiss,
	rows,
	title,
	children,
}: Readonly<DialogBackdropProperties>): ReactNode {
	const { attachNode } = useMouseTarget(`dialog:${title}:backdrop`, { onClick: onDismiss });

	return (
		<Box
			ref={attachNode}
			alignItems="center"
			height={rows}
			justifyContent="center"
			left={0}
			position="absolute"
			top={0}
			width={columns}
		>
			{children}
		</Box>
	);
}

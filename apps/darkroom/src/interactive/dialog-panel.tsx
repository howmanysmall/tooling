import { Box } from "ink";

import { useMouseTarget } from "./mouse-context";
import { theme } from "./theme";

import type { ReactNode } from "react";

export interface DialogPanelProperties {
	/** The dialog's name, which makes the target's ID. */
	title: string;
	width: number;
	children: ReactNode;
}

function ignoreClick(): void {
	// A click inside the dialog must not reach the backdrop and close it.
}

/**
 * A dialog's raised box. Clicks inside it stay there.
 *
 * @param properties - The dialog's name, width, and body.
 * @param properties.title - The dialog's name, which makes the target's ID.
 * @param properties.width - How wide the panel is.
 * @param properties.children - The title row, body, and keys.
 * @returns A filled column.
 */
export function DialogPanel({ title, width, children }: Readonly<DialogPanelProperties>): ReactNode {
	const { attachNode } = useMouseTarget(`dialog:${title}`, { onClick: ignoreClick });

	return (
		<Box ref={attachNode} backgroundColor={theme.element} flexDirection="column" width={width}>
			{children}
		</Box>
	);
}

import { Box } from "ink";

import { ModelFooterLine } from "./model-footer-line";

import type { ReactNode } from "react";

/**
 * The bottom line, inset to line up with the panes' contents.
 *
 * @returns The footer for the current mode.
 */
export function ModelBrowserFooter(): ReactNode {
	return (
		<Box paddingX={1}>
			<ModelFooterLine />
		</Box>
	);
}

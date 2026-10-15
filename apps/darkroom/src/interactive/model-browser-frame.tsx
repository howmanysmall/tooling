import { Box } from "ink";

import { useModelBrowser } from "./model-browser-context";
import { useModelBrowserKeys } from "./use-model-browser-keys";

import type { ReactNode } from "react";

export interface ModelBrowserFrameProperties {
	children: ReactNode;
}

/**
 * The full-screen column that holds the model browser's parts, and owns the
 * key bindings.
 *
 * @param properties - The parts to lay out.
 * @param properties.children - The header, panes, and footer.
 * @returns A box the size of the terminal.
 */
export function ModelBrowserFrame({ children }: Readonly<ModelBrowserFrameProperties>): ReactNode {
	const {
		meta: { layout },
	} = useModelBrowser();
	useModelBrowserKeys();

	return (
		<Box flexDirection="column" height={layout.rows} width={layout.columns}>
			{children}
		</Box>
	);
}

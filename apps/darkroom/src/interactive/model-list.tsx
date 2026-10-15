import { Box, Text } from "ink";

import { getWindowStart } from "./list-cursor";
import { useModelBrowser } from "./model-browser-context";
import { ModelRow } from "./model-row";
import { theme } from "./theme";

import type { ReactNode } from "react";

/**
 * The left pane: one model per line, scrolled to keep the selected one in
 * view.
 *
 * @returns A bordered pane of models and their prices.
 */
export function ModelList(): ReactNode {
	const {
		meta: { layout },
		state: { models, selectedIndex },
	} = useModelBrowser();
	const start = getWindowStart(selectedIndex, models.length, layout.listHeight);
	const shown = models.slice(start, start + layout.listHeight);

	return (
		<Box
			borderColor={theme.border}
			borderStyle="round"
			flexDirection="column"
			flexShrink={0}
			height={layout.listHeight + 2}
			paddingX={1}
			width={layout.listWidth}
		>
			{shown.length === 0 ? <Text color={theme.muted}>{"No models match."}</Text> : null}
			{shown.map((model) => (
				<ModelRow key={model.id} model={model} />
			))}
		</Box>
	);
}

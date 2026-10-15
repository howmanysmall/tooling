import { getWindowStart } from "./list-cursor";
import { ListPane } from "./list-pane";
import { useModelBrowser } from "./model-browser-context";
import { ModelRow } from "./model-row";

import type { ReactNode } from "react";

/**
 * The left pane: one model per line, scrolled to keep the selected one in
 * view.
 *
 * @returns A filled pane of models and their prices.
 */
export function ModelList(): ReactNode {
	const {
		meta: { layout },
		state: { models, selectedIndex },
	} = useModelBrowser();
	const start = getWindowStart(selectedIndex, models.length, layout.listHeight);
	const shown = models.slice(start, start + layout.listHeight);

	return (
		<ListPane
			emptyText="No models match."
			height={layout.listHeight}
			isEmpty={shown.length === 0}
			width={layout.listWidth}
		>
			{shown.map((model) => (
				<ModelRow key={model.id} model={model} />
			))}
		</ListPane>
	);
}

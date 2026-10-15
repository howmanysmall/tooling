import { DetailPane } from "./detail-pane";
import { useModelBrowser } from "./model-browser-context";
import { ModelDetailBody } from "./model-detail-body";

import type { ReactNode } from "react";

/**
 * The right pane: everything about the selected model.
 *
 * @returns The detail pane, with a hint when nothing is selected.
 */
export function ModelDetail(): ReactNode {
	const {
		state: { selected },
	} = useModelBrowser();

	return (
		<DetailPane isEmpty={selected === undefined}>
			{selected === undefined ? null : <ModelDetailBody model={selected} />}
		</DetailPane>
	);
}

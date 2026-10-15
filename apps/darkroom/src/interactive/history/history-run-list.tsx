import { ListPane } from "$interactive/components/list-pane";
import { SectionHeading } from "$interactive/components/section-heading";

import { useHistoryBrowser } from "./history-browser-context";
import { HistoryRunRow } from "./history-run-row";
import { buildRunListItems, getVisibleItems } from "./run-list-layout";

import type { ReactNode } from "react";

/**
 * The left pane: runs grouped by day, newest first, scrolled to keep the
 * selected run in view.
 *
 * @returns A bordered pane of day headings and two-line runs.
 */
export function HistoryRunList(): ReactNode {
	const {
		actions: { moveBy },
		meta: { layout, now },
		state,
	} = useHistoryBrowser();
	const items = getVisibleItems(buildRunListItems(state.runs, now), state.selectedIndex, layout.listHeight);
	const emptyText = state.entries.length === 0 ? "No runs yet. Make one with darkroom generate." : "No runs match.";

	return (
		<ListPane
			emptyText={emptyText}
			height={layout.listHeight}
			isEmpty={items.length === 0}
			target="pane:history"
			width={layout.listWidth}
			onWheel={moveBy}
		>
			{items.map((item) =>
				item.kind === "day" ? (
					<SectionHeading key={item.key} label={item.label} />
				) : (
					<HistoryRunRow key={item.key} entry={item.entry} />
				),
			)}
		</ListPane>
	);
}

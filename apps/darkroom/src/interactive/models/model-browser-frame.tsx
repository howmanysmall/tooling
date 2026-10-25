import { BrowserShell } from "$interactive/app/browser-shell";

import { useModelBrowser } from "./model-browser-context";
import { getModelCommands } from "./model-commands";

import type { Key } from "ink";
import type { PropsWithChildren, ReactNode } from "react";

/**
 * The model browser's frame: the shared shell with the browser's commands.
 * While the filter is open, its input reads the typing and Esc cancels it.
 *
 * @param properties - The parts to lay out.
 * @param properties.children - The header, panes, and status bar.
 * @returns A box the size of the terminal.
 */
export function ModelBrowserFrame({ children }: Readonly<PropsWithChildren>): ReactNode {
	const {
		actions,
		meta: { layout },
		state,
	} = useModelBrowser();

	function captureFilterKeys(_input: string, key: Key): void {
		if (key.escape) {
			actions.cancelFilter();
		}
	}

	return (
		<BrowserShell
			capture={state.isFiltering ? captureFilterKeys : undefined}
			columns={layout.columns}
			commands={getModelCommands(actions)}
			rows={layout.rows}
			status={state.status}
		>
			{children}
		</BrowserShell>
	);
}

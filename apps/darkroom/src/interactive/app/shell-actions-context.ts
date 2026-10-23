import { createContext, use } from "react";

import type { BrowserCommand } from "$interactive/keys/browser-command";

/** Opens a palette of actions over the screen, for something you clicked. */
export interface ShellActions {
	/**
	 * Shows the actions, searchable, as the prompt and image actions are.
	 *
	 * @param title - What was clicked, like `Image`.
	 * @param commands - What can be done with it.
	 */
	readonly showActions: (title: string, commands: ReadonlyArray<BrowserCommand>) => void;
}

/** Set by the browser shell around each screen. */
export const ShellActionsContext = createContext<ShellActions | undefined>(undefined);

ShellActionsContext.displayName = "ShellActionsContext";

/**
 * Reads how to open an actions palette over the screen.
 *
 * @returns The shell's actions, or `undefined` outside a browser shell.
 */
export function useShellActions(): ShellActions | undefined {
	return use(ShellActionsContext);
}

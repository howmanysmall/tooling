import { createContext, use } from "react";

import type { AppTab } from "./app-tab";

/** Which tab is showing, and how to switch. */
export interface AppTabs {
	readonly active: AppTab;
	/** Steps to the next tab, or the previous one for `-1`. */
	readonly cycle: (delta: number) => void;
	readonly select: (tab: AppTab) => void;
}

/** Set by the app; a screen rendered on its own has no tabs. */
export const AppTabsContext = createContext<AppTabs | undefined>(undefined);

AppTabsContext.displayName = "AppTabsContext";

/**
 * Reads the app's tabs.
 *
 * @returns The tabs, or `undefined` outside the app, as in tests.
 */
export function useAppTabs(): AppTabs | undefined {
	return use(AppTabsContext);
}

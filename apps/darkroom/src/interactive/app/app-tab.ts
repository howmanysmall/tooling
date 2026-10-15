/** The screens darkroom's full-screen app switches between. */
export const enum AppTab {
	Generate = "generate",
	History = "history",
	Models = "models",
}

/** The tabs in the order the header shows them and `tab` cycles them. */
export const APP_TABS: ReadonlyArray<AppTab> = [AppTab.Generate, AppTab.History, AppTab.Models];

/**
 * Steps through the tabs, wrapping around at either end.
 *
 * @param tab - The current tab.
 * @param delta - `1` for the next tab, `-1` for the previous one.
 * @returns The tab `delta` steps away.
 */
export function cycleTab(tab: AppTab, delta: number): AppTab {
	const index = APP_TABS.indexOf(tab);
	const count = APP_TABS.length;
	return APP_TABS[(((index + delta) % count) + count) % count] ?? tab;
}

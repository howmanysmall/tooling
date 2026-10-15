import { Activity, Suspense, useReducer } from "react";

import { reduceAppState } from "./app-state";
import { AppTab } from "./app-tab";
import { AppTabsContext } from "./app-tabs-context";
import { CatalogNotice } from "./catalog-notice";
import { GenerateTab } from "./generate-tab";
import { HistoryBrowserScreen } from "./history-browser-screen";
import { getRecentModelIds } from "./model-picker-state";
import { ModelsTab } from "./models-tab";
import { useSession } from "./session-context";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { Dispatch, ReactNode } from "react";
import type { Except } from "type-fest";

import type { HistoryEntry } from "$history/history-entry";
import type { CellBox } from "$preview/cell-fit";
import type { LoadingPreview } from "$preview/load-preview";
import type { ModelSort } from "$utilities/model-filters";

import type { CatalogLoad } from "./app-catalog";
import type { AppAction, AppState } from "./app-state";
import type { AppTabs } from "./app-tabs-context";
import type { GenerateRequest } from "./generate-screen";
import type { BrowserServices } from "./history-browser-services";
import type { ModelBrowserServices } from "./model-browser-services";

/** The history tab's services; re-running is the session's. */
export type HistoryServices = Except<BrowserServices, "requestRerun">;

export interface AppScreensProperties {
	catalog: Promise<CatalogLoad>;
	/** Every run, newest first. */
	entries: ReadonlyArray<HistoryEntry>;
	getPreview: (path: string, box: CellBox) => LoadingPreview | undefined;
	history: HistoryServices;
	initialTab: AppTab;
	now: Date;
	/** Closes the app for the guided session, with references and settings. */
	onGenerateWithOptions: (request: GenerateRequest) => void;
	sort: ModelSort;
}

const GENERATE_LOADING = <CatalogNotice isError={false} message="Loading models…" title="generate" />;
const MODELS_LOADING = <CatalogNotice isError={false} message="Loading models…" title="models" />;

function createInitialState(tab: AppTab): AppState {
	return { tab };
}

function createTabs(active: AppTab, dispatch: Dispatch<AppAction>): AppTabs {
	return {
		active,
		cycle(delta): void {
			dispatch({ delta, type: "cycle" });
		},
		select(tab): void {
			dispatch({ tab, type: "select" });
		},
	};
}

function createModelServices(
	dispatch: Dispatch<AppAction>,
	getPreview: ModelBrowserServices["getPreview"],
): ModelBrowserServices {
	return {
		chooseModel(model): void {
			dispatch({ id: model.id, type: "choose-model" });
		},
		getPreview,
	};
}

function createHistoryServices(
	history: HistoryServices,
	requestRerun: BrowserServices["requestRerun"],
): BrowserServices {
	return { ...history, requestRerun };
}

/**
 * The app's tabs. Every tab stays mounted, hidden in an `Activity`, so
 * switching keeps each one's place and filter, while only the shown tab
 * reads keys. The models load in the background; the tabs that need them
 * wait in Suspense. Re-running a past run sends it to the generate session
 * and shows it there.
 *
 * @param properties - The runs, the loading models, and the services.
 * @param properties.catalog - The models and their prices, loading.
 * @param properties.entries - Every run, newest first.
 * @param properties.getPreview - Loads image previews.
 * @param properties.history - What the history tab's keys act on.
 * @param properties.initialTab - The tab to open on.
 * @param properties.now - When the app opened.
 * @param properties.onGenerateWithOptions - Opens the guided session.
 * @param properties.sort - The order the models tab opens in.
 * @returns Every tab, with only the current one shown.
 */
export function AppScreens({
	catalog,
	entries,
	getPreview,
	history,
	initialTab,
	now,
	onGenerateWithOptions,
	sort,
}: Readonly<AppScreensProperties>): ReactNode {
	const [app, dispatch] = useReducer(reduceAppState, initialTab, createInitialState);
	const session = useSession();
	const recentIds = getRecentModelIds(entries);
	const tabs = createTabs(app.tab, dispatch);
	const modelServices = createModelServices(dispatch, getPreview);

	function getMode(tab: AppTab): "hidden" | "visible" {
		return tab === app.tab ? "visible" : "hidden";
	}

	function handleChooseModel(model: ImageModelListItem): void {
		modelServices.chooseModel(model);
	}

	function handleRerun(entry: HistoryEntry): void {
		session.actions.send({ entry, type: "rerun" });
		tabs.select(AppTab.Generate);
	}

	return (
		<AppTabsContext value={tabs}>
			<Activity mode={getMode(AppTab.Generate)}>
				<Suspense fallback={GENERATE_LOADING}>
					<GenerateTab
						catalog={catalog}
						chosenModelId={app.chosenModelId}
						getPreview={getPreview}
						recentIds={recentIds}
						onChooseModel={handleChooseModel}
						onGenerateWithOptions={onGenerateWithOptions}
					/>
				</Suspense>
			</Activity>
			<Activity mode={getMode(AppTab.History)}>
				{/* Remounted when a run is saved, so the new run is listed. */}
				<HistoryBrowserScreen
					key={entries[0]?.id ?? "empty"}
					entries={entries}
					now={now}
					services={createHistoryServices(history, handleRerun)}
				/>
			</Activity>
			<Activity mode={getMode(AppTab.Models)}>
				<Suspense fallback={MODELS_LOADING}>
					<ModelsTab catalog={catalog} now={now} services={modelServices} sort={sort} />
				</Suspense>
			</Activity>
		</AppTabsContext>
	);
}

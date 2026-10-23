import { use } from "react";

import { CatalogNotice } from "$interactive/app/catalog-notice";
import { ModelNameContext } from "$interactive/session/model-name-context";

import { GenerateScreen } from "./generate-screen";
import { pickModel } from "./model-picker-state";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { ReactNode } from "react";

import type { SessionSummary } from "$history/session-list";
import type { CatalogLoad } from "$interactive/app/app-catalog";
import type { CellBox } from "$preview/cell-fit";
import type { LoadingPreview } from "$preview/load-preview";

import type { GenerateRequest } from "./generate-screen";

export interface GenerateTabProperties {
	catalog: Promise<CatalogLoad>;
	/** The model picked in this session, if any. */
	chosenModelId?: string | undefined;
	getPreview: (path: string, box: CellBox) => LoadingPreview | undefined;
	/** When the app opened. */
	now: Date;
	onChooseModel: (model: ImageModelListItem) => void;
	onGenerateWithOptions: (request: GenerateRequest) => void;
	/** Models you used lately, most recent first. */
	recentIds: ReadonlyArray<string>;
	/** Past sessions, the one used last first. */
	sessions: ReadonlyArray<SessionSummary>;
}

/**
 * The generate tab: the prompt box once the models have loaded, with the
 * model chosen in this session, `DARKROOM_MODEL`, or the one you used last.
 *
 * @param properties - The loading models and the session's choices.
 * @param properties.catalog - Resolves to the models or an error.
 * @param properties.chosenModelId - The model picked in this session.
 * @param properties.getPreview - Loads previews of saved images.
 * @param properties.now - When the app opened.
 * @param properties.onChooseModel - Takes a model picked in the prompt box.
 * @param properties.onGenerateWithOptions - Opens the guided session.
 * @param properties.recentIds - Models used lately.
 * @param properties.sessions - Past sessions.
 * @returns The tab's screen.
 */
export function GenerateTab({
	catalog,
	chosenModelId,
	getPreview,
	now,
	onChooseModel,
	onGenerateWithOptions,
	recentIds,
	sessions,
}: Readonly<GenerateTabProperties>): ReactNode {
	const loaded = use(catalog);
	if ("error" in loaded) return <CatalogNotice isError={true} message={loaded.error} title="generate" />;

	const names = new Map(loaded.catalog.models.map((item) => [item.id, item.name]));

	function getModelName(id: string): string {
		return names.get(id) ?? id;
	}

	const model = pickModel(loaded.catalog.models, {
		chosen: chosenModelId,
		preferred: loaded.preferred,
		recent: recentIds,
	});

	return (
		<ModelNameContext value={getModelName}>
			<GenerateScreen
				catalog={loaded.catalog}
				getPreview={getPreview}
				model={model}
				now={now}
				recentIds={recentIds}
				sessions={sessions}
				onChooseModel={onChooseModel}
				onGenerateWithOptions={onGenerateWithOptions}
			/>
		</ModelNameContext>
	);
}

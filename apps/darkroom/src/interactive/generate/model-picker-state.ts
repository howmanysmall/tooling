import { Fzf } from "fzf";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { FzfResultItem } from "fzf";

import type { HistoryEntry } from "$history/history-entry";

/** A model that matches the picker's query. */
export interface ModelMatch {
	/** Whether you generated with it lately, so it is offered first. */
	readonly isRecent: boolean;
	readonly model: ImageModelListItem;
	/** Which characters of the name matched, to highlight them. */
	readonly positions: ReadonlySet<number>;
}

// How many recently used models the picker lists first.
const RECENT_LIMIT = 5;
const NO_POSITIONS: ReadonlySet<number> = new Set();

/**
 * Lists the models you generated with lately.
 *
 * @param entries - Past runs, newest first.
 * @returns Up to five model IDs, most recent first, each once.
 */
export function getRecentModelIds(entries: ReadonlyArray<HistoryEntry>): Array<string> {
	const recent = new Set<string>();
	for (const { model } of entries) {
		if (recent.size === RECENT_LIMIT) break;
		recent.add(model);
	}
	return [...recent];
}

/** What decides the model the prompt box starts with. */
export interface ModelPreference {
	/** Picked in this session, in the picker or the models tab. */
	readonly chosen?: string | undefined;
	/** `DARKROOM_MODEL`. */
	readonly preferred?: string | undefined;
	/** From {@link getRecentModelIds}. */
	readonly recent: ReadonlyArray<string>;
}

/**
 * Picks the model to generate with: the one chosen in this session, then
 * `DARKROOM_MODEL`, then the one you used last, then the first listed.
 *
 * @param models - The models on offer.
 * @param preference - What was chosen, configured, and used.
 * @param preference.chosen - Picked in this session.
 * @param preference.preferred - `DARKROOM_MODEL`.
 * @param preference.recent - Models used lately, most recent first.
 * @returns The model, or `undefined` when there are none.
 */
export function pickModel(
	models: ReadonlyArray<ImageModelListItem>,
	{ chosen, preferred, recent }: ModelPreference,
): ImageModelListItem | undefined {
	const byId = new Map(models.map((model) => [model.id, model]));
	for (const id of [chosen, preferred, ...recent]) {
		const model = id === undefined ? undefined : byId.get(id);
		if (model !== undefined) return model;
	}
	return models[0];
}

function sortByRecency(
	models: ReadonlyArray<ImageModelListItem>,
	recentIds: ReadonlyArray<string>,
): Array<ImageModelListItem> {
	const ranks = new Map(recentIds.map((id, index) => [id, index]));
	function getRank(model: ImageModelListItem): number {
		return ranks.get(model.id) ?? recentIds.length;
	}
	return models.toSorted(
		(first, second) => getRank(first) - getRank(second) || first.name.localeCompare(second.name),
	);
}

/**
 * Ranks the models against the query by name or ID, the way fzf does. With
 * no query, recently used models come first, then the rest by name.
 *
 * @param models - The models on offer.
 * @param recentIds - From {@link getRecentModelIds}.
 * @param query - What has been typed.
 * @returns The matches, best first.
 */
export function getModelMatches(
	models: ReadonlyArray<ImageModelListItem>,
	recentIds: ReadonlyArray<string>,
	query: string,
): Array<ModelMatch> {
	const recent = new Set(recentIds);
	const trimmed = query.trim();
	if (trimmed.length === 0) {
		return sortByRecency(models, recentIds).map((model) => ({
			isRecent: recent.has(model.id),
			model,
			positions: NO_POSITIONS,
		}));
	}

	// The ID follows the name, so positions past the name are in the ID and
	// aren't highlighted.
	const finder = new Fzf(models, { selector: (model): string => `${model.name} ${model.id}` });
	// Fzf's find returns every match, never undefined.
	const ranked: ReadonlyArray<FzfResultItem<ImageModelListItem>> = finder.find(trimmed);
	return ranked.map(({ item, positions }) => ({
		isRecent: recent.has(item.id),
		model: item,
		positions: new Set([...positions].filter((position) => position < item.name.length)),
	}));
}

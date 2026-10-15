import { TextInput } from "@inkjs/ui";
import { Box, Text } from "ink";

import { getReferenceRange } from "$generation/model-capabilities";
import { describeListPrice, getModelPrices } from "$generation/observed-prices";
import { Dialog } from "$interactive/components/dialog";
import { DialogList } from "$interactive/components/dialog-list";
import { theme } from "$interactive/components/theme";
import { useSearchList } from "$interactive/palette/use-search-list";

import { ModelPickerRow } from "./model-picker-row";
import { getModelMatches } from "./model-picker-state";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { ReactNode } from "react";

import type { KeyHint } from "$interactive/components/key-hints";
import type { ModelCatalog } from "$interactive/models/model-browser-state";

import type { ModelMatch } from "./model-picker-state";

export interface ModelPickerDialogProperties {
	catalog: ModelCatalog;
	columns: number;
	/** The model the prompt box uses now, marked in the list. */
	currentId?: string | undefined;
	/** Lists only models that take images, for editing one. */
	isEditing: boolean;
	/** Closes the picker without changing the model. */
	onClose: () => void;
	/** Takes the picked model; the picker closes after. */
	onPick: (model: ImageModelListItem) => void;
	/** Models you used lately, most recent first. */
	recentIds: ReadonlyArray<string>;
	rows: number;
}

const HINTS: ReadonlyArray<KeyHint> = [
	["↑↓", "choose"],
	["⏎", "use"],
];
function canTakeImages(model: ImageModelListItem): boolean {
	return getReferenceRange(model).max > 0;
}

// Rows of models shown at once.
const VISIBLE_ROWS = 12;

/**
 * Picks the model to generate with. Typing narrows the list by name or ID
 * the way fzf does; recent models come first, each with its price.
 *
 * @param properties - The models and what to do with the pick.
 * @param properties.catalog - The models and what they cost.
 * @param properties.columns - The screen's width.
 * @param properties.currentId - The model in use now.
 * @param properties.onClose - Closes without picking.
 * @param properties.onPick - Takes the picked model.
 * @param properties.recentIds - Models used lately.
 * @param properties.rows - The screen's height.
 * @param properties.isEditing - Whether to list only models that edit.
 * @returns A dialog with a search line and the matching models.
 */
export function ModelPickerDialog({
	catalog,
	columns,
	currentId,
	isEditing,
	onClose,
	onPick,
	recentIds,
	rows,
}: Readonly<ModelPickerDialogProperties>): ReactNode {
	const visibleRows = Math.max(3, Math.min(VISIBLE_ROWS, rows - 12));
	const models = isEditing ? catalog.models.filter(canTakeImages) : catalog.models;
	const list = useSearchList((query) => getModelMatches(models, recentIds, query), visibleRows, onClose);

	function pick(match: ModelMatch | undefined): void {
		if (match === undefined) return;
		onPick(match.model);
		onClose();
	}

	function pickSelected(): void {
		pick(list.selected);
	}

	return (
		<Dialog
			columns={columns}
			hints={HINTS}
			rows={rows}
			title={isEditing ? "Choose a model that can edit" : "Choose a model"}
			width={72}
			onDismiss={onClose}
		>
			<Box marginBottom={1}>
				<Text bold={true} color={theme.accent}>
					{"› "}
				</Text>
				<TextInput placeholder="Search models" onChange={list.handleQueryChange} onSubmit={pickSelected} />
			</Box>
			{list.visible.length === 0 ? <Text color={theme.muted}>{"No models match."}</Text> : null}
			<DialogList target="picker:list" onWheel={list.handleWheel}>
				{list.visible.map((match, index) => (
					<ModelPickerRow
						key={match.model.id}
						isCurrent={match.model.id === currentId}
						isSelected={list.start + index === list.cursor}
						match={match}
						price={describeListPrice(getModelPrices(catalog.pricing, catalog.observed, match.model.id))}
						onChoose={(): void => {
							pick(match);
						}}
						onPoint={(): void => {
							list.pointAt(list.start + index);
						}}
					/>
				))}
			</DialogList>
		</Dialog>
	);
}

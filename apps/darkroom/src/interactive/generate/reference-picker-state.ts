import nodePath from "node:path";
import { toPlural } from "@howmanysmall/english-utilities/to-plural";

import { REFERENCE_EXTENSIONS } from "$generation/media-types";

export const enum EntryKind {
	Directory = "directory",
	File = "file",
	Parent = "parent",
}

export interface PickerEntry {
	readonly name: string;
	readonly kind: EntryKind;
	readonly path: string;
}

export interface DirectoryItem {
	readonly name: string;
	readonly isDirectory: boolean;
}

export interface PickerState {
	readonly cursor: number;
	readonly directory: string;
	readonly entries: ReadonlyArray<PickerEntry>;
	readonly filter: string;
	readonly max: number;
	/** Selected files in the order they were picked. Kept across folders. */
	readonly selected: ReadonlyArray<string>;
	readonly warning?: string | undefined;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function compareByName(first: DirectoryItem, second: DirectoryItem): number {
	return collator.compare(first.name, second.name);
}

/**
 * Lists what the picker shows for a folder: `../`, then folders, then image
 * files, each sorted by name. Dotfiles are hidden.
 *
 * @param directory - The folder.
 * @param items - Its contents.
 * @returns The entries to show.
 */
export function toEntries(directory: string, items: ReadonlyArray<DirectoryItem>): Array<PickerEntry> {
	const visible = items.filter((item) => !item.name.startsWith("."));
	const directories = visible.filter((item) => item.isDirectory).toSorted(compareByName);
	const files = visible
		.filter((item) => !item.isDirectory && REFERENCE_EXTENSIONS.has(nodePath.extname(item.name).toLowerCase()))
		.toSorted(compareByName);

	const parent = nodePath.dirname(directory);
	return [
		...(parent === directory ? [] : [{ name: "../", kind: EntryKind.Parent, path: parent }]),
		...directories.map((item) => ({
			name: `${item.name}/`,
			kind: EntryKind.Directory,
			path: nodePath.join(directory, item.name),
		})),
		...files.map((item) => ({ name: item.name, kind: EntryKind.File, path: nodePath.join(directory, item.name) })),
	];
}

export function createPickerState(directory: string, items: ReadonlyArray<DirectoryItem>, max: number): PickerState {
	return { cursor: 0, directory, entries: toEntries(directory, items), filter: "", max, selected: [] };
}

/**
 * Gets the entries matching the filter. `../` always stays visible.
 *
 * @param state - The picker state.
 * @returns The entries to draw.
 */
export function getVisibleEntries(state: PickerState): Array<PickerEntry> {
	const needle = state.filter.toLowerCase();
	return state.entries.filter(
		(entry) => entry.kind === EntryKind.Parent || entry.name.toLowerCase().includes(needle),
	);
}

export function getCurrentEntry(state: PickerState): PickerEntry | undefined {
	return getVisibleEntries(state)[state.cursor];
}

export function moveCursor(state: PickerState, delta: number): PickerState {
	const count = getVisibleEntries(state).length;
	if (count === 0) return state;
	return { ...state, cursor: (state.cursor + delta + count) % count, warning: undefined };
}

export function setFilter(state: PickerState, filter: string): PickerState {
	return filter === state.filter ? state : { ...state, cursor: 0, filter, warning: undefined };
}

/**
 * Selects or deselects the file under the cursor. At the limit, selecting
 * another file shows a warning instead.
 *
 * @param state - The picker state.
 * @returns The new state.
 */
export function toggleCurrent(state: PickerState): PickerState {
	const entry = getCurrentEntry(state);
	if (entry?.kind !== EntryKind.File) return state;

	if (state.selected.includes(entry.path)) {
		return { ...state, selected: state.selected.filter((path) => path !== entry.path), warning: undefined };
	}

	if (state.selected.length >= state.max) {
		return {
			...state,
			warning: `This model takes at most ${state.max} reference ${toPlural(state.max, "image")}.`,
		};
	}

	return { ...state, selected: [...state.selected, entry.path], warning: undefined };
}

/**
 * Moves into another folder, keeping the selection.
 *
 * @param state - The picker state.
 * @param directory - The folder to show.
 * @param items - Its contents.
 * @returns The new state.
 */
export function enterDirectory(
	state: PickerState,
	directory: string,
	items: ReadonlyArray<DirectoryItem>,
): PickerState {
	return { ...state, cursor: 0, directory, entries: toEntries(directory, items), filter: "", warning: undefined };
}

/**
 * Gets the folder `Tab` or `→` would open.
 *
 * @param state - The picker state.
 * @returns The folder under the cursor, or `undefined` for a file.
 */
export function getOpenTarget(state: PickerState): string | undefined {
	const entry = getCurrentEntry(state);
	return entry === undefined || entry.kind === EntryKind.File ? undefined : entry.path;
}

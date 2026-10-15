import { readdirSync } from "node:fs";
import nodePath from "node:path";
import { stdin } from "node:process";
import { Prompt } from "@clack/core";
import { limitOptions, S_BAR, S_BAR_END, S_CHECKBOX_INACTIVE, S_CHECKBOX_SELECTED, symbol } from "@clack/prompts";
import { formatArrayAsEnglishList } from "@howmanysmall/english-utilities/format-array-as-english-list";
import { cyan, dim, gray, green, yellow } from "ansis";

import { shortenHomePath } from "$utilities/path-utilities";

import {
	createPickerState,
	enterDirectory,
	EntryKind,
	getOpenTarget,
	getVisibleEntries,
	moveCursor,
	setFilter,
	toggleCurrent,
} from "./reference-picker-state";

import type { Key } from "node:readline";
import type { Readable, Writable } from "node:stream";

import type { DirectoryItem, PickerEntry, PickerState } from "./reference-picker-state";

export interface PickerOptions {
	/** Where to start browsing. */
	readonly directory: string;
	readonly input?: Readable | undefined;
	/** The most files that can be selected. */
	readonly max: number;
	readonly message: string;
	readonly output: Writable;
}

const FOLDER_MARK = "▸";

function readDirectory(directory: string): Array<DirectoryItem> {
	try {
		return readdirSync(directory, { withFileTypes: true }).map((entry) => ({
			name: entry.name,
			isDirectory: entry.isDirectory(),
		}));
	} catch {
		return [];
	}
}

function drawEntry(entry: PickerEntry, isActive: boolean, selected: ReadonlyArray<string>): string {
	const name = isActive ? entry.name : dim(entry.name);
	if (entry.kind !== EntryKind.File) return `${isActive ? cyan(FOLDER_MARK) : dim(FOLDER_MARK)} ${name}`;
	const mark = selected.includes(entry.path) ? green(S_CHECKBOX_SELECTED) : dim(S_CHECKBOX_INACTIVE);
	return `${mark} ${name}`;
}

const INSTRUCTIONS = `${dim("Tab:")} open • ${dim("Space:")} toggle • ${dim("←:")} up • ${dim("Enter:")} done`;

/**
 * A folder browser that selects several image files. The stock prompts can't
 * open folders and select at once, so this draws the same rail as they do.
 */
class ReferencePickerPrompt extends Prompt<Array<string>> {
	private filterBeforeKey = "";

	public picker: PickerState;

	public constructor({ directory, input, max, message, output }: PickerOptions) {
		super(
			{
				input: input ?? stdin,
				output,
				render(this: ReferencePickerPrompt) {
					return this.draw(message, output);
				},
			},
			true,
		);
		this.picker = createPickerState(directory, readDirectory(directory), max);
		this.on("userInput", (value) => {
			this.picker = setFilter(this.picker, value);
		});
		this.on("cursor", (action) => {
			this.handleAction(action);
		});
		this.on("key", (_, key) => {
			this.handleKey(key);
		});
	}

	// oxlint-disable eslint/class-methods-use-this -- overrides a Prompt hook that has no use for this
	// biome-ignore lint/nursery/useThisInClassMethods: overrides a Prompt hook that has no use for this.
	protected override _isActionKey(_character: string | undefined, key: Key): boolean {
		// Keep Space and Tab out of the filter text.
		return key.name === "space" || key.name === "tab";
	}
	// oxlint-enable eslint/class-methods-use-this

	protected override _shouldSubmit(): boolean {
		this.value = [...this.picker.selected];
		return true;
	}

	private describeChoice(): string {
		if (this.state === "cancel") return "cancelled";
		const names = this.picker.selected.map((path) => nodePath.basename(path));
		return names.length === 0 ? "none" : formatArrayAsEnglishList(names);
	}

	private draw(message: string, output: Writable): string {
		const count = dim(`(${this.picker.selected.length}/${this.picker.max})`);
		const title = `${symbol(this.state)}  ${message} ${count}`;
		if (this.state === "submit" || this.state === "cancel") {
			return `${gray(S_BAR)}\n${title}\n${gray(S_BAR)}  ${dim(this.describeChoice())}`;
		}

		const bar = cyan(S_BAR);
		const filter = this.picker.filter === "" ? "" : `  ${dim("filter:")} ${this.userInputWithCursor}`;
		const header = [gray(S_BAR), title, `${bar}  ${dim(shortenHomePath(this.picker.directory))}${filter}`];
		const footer = [
			...(this.picker.warning === undefined ? [] : [`${bar}  ${yellow(this.picker.warning)}`]),
			`${bar}  ${INSTRUCTIONS}`,
			cyan(S_BAR_END),
		];
		const visible = getVisibleEntries(this.picker);
		const rows =
			visible.length === 0
				? [dim("No images or folders here.")]
				: limitOptions({
						columnPadding: 3,
						cursor: this.picker.cursor,
						options: visible,
						output,
						rowPadding: header.length + footer.length,
						style: (entry, isActive) => drawEntry(entry, isActive, this.picker.selected),
					});
		return [...header, ...rows.map((row) => `${bar}  ${row}`), ...footer].join("\n");
	}

	private goTo(directory: string | undefined): void {
		if (directory === undefined) return;
		this.picker = enterDirectory(this.picker, directory, readDirectory(directory));
		this._clearUserInput();
	}

	private handleAction(action: string | undefined): void {
		switch (action) {
			case "down": {
				this.picker = moveCursor(this.picker, 1);
				break;
			}

			case "left": {
				this.goTo(nodePath.dirname(this.picker.directory));
				break;
			}

			case "right": {
				this.goTo(getOpenTarget(this.picker));
				break;
			}

			case "space": {
				this.picker = toggleCurrent(this.picker);
				break;
			}

			case "up": {
				this.picker = moveCursor(this.picker, -1);
				break;
			}

			default:
				break;
		}
	}

	private handleKey(key: Key): void {
		if (key.name === "tab") this.goTo(getOpenTarget(this.picker));
		if (key.name === "backspace" && this.filterBeforeKey === "") this.goTo(nodePath.dirname(this.picker.directory));
		this.filterBeforeKey = this.userInput;
	}

	private get userInputWithCursor(): string {
		return `${this.userInput}${dim("_")}`;
	}
}

/**
 * Asks for reference images, starting in the current directory.
 *
 * @param options - The title, selection limit, start folder, and streams.
 * @returns The selected paths, possibly none, or the cancel symbol.
 */
export async function pickReferencesAsync(options: PickerOptions): Promise<Array<string> | symbol | undefined> {
	return new ReferencePickerPrompt(options).prompt();
}

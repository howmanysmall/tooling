import type { SortKey } from "$meta/sort-key";
import type { TableRowKind } from "$meta/table-row-kind";

import type { Counts, LanguageStats } from "./code-types";

export type Paint = (text: string) => string;

export interface RowStyle extends Readonly<Record<SortKey, Paint>> {
	readonly bar: Paint;
	readonly top: Paint | undefined;
}

export interface TableRow extends Counts {
	readonly eighths: number;
	readonly kind: TableRowKind;
	readonly label: string;
	readonly language: string;
	readonly percent: number;
	readonly top: string | undefined;
}

export interface BarParts {
	readonly filled: string;
	readonly track: string;
}

export interface LanguageOwner extends Counts {
	readonly languages: ReadonlyArray<LanguageStats>;
}

export interface RenderOptions {
	/** Whether to color the output. */
	readonly color: boolean;
	/** Whether to list the languages under each project and under the total. */
	readonly withLanguages: boolean;
}

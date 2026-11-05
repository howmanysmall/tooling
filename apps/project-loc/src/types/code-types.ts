import type { SortKey } from "$meta/sort-key";

export type Counts = Readonly<Record<Exclude<SortKey, SortKey.Name>, number>>;

export interface LanguageStats extends Counts {
	readonly name: string;
}

export interface CountedProject {
	readonly languages: ReadonlyArray<LanguageStats>;
	readonly path: string;
}

export type ProjectStats = CountedProject & LanguageStats;

export interface ProjectTotals extends Counts {
	readonly languages: ReadonlyArray<LanguageStats>;
	readonly projects: number;
}

export interface Aggregate {
	readonly projects: ReadonlyArray<ProjectStats>;
	readonly root: string;
	readonly total: ProjectTotals;
}

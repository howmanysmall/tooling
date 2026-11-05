import type { SccStatusKind } from "$meta/scc-status-kind";

export type SccProblem =
	| { readonly kind: SccStatusKind.Broken }
	| { readonly kind: SccStatusKind.Missing }
	| { readonly kind: SccStatusKind.Outdated; readonly version: string };

export type SccStatus = SccProblem | { readonly kind: SccStatusKind.Ok };

export interface InstallHints {
	readonly commands: ReadonlyArray<string>;
	readonly heading: "Install" | "Upgrade";
	readonly notes: ReadonlyArray<string>;
}

import which from "which";

import { SccStatusKind } from "$meta/scc-status-kind";

import { inspectSccAsync } from "./inspect-scc-async";

import type { SccStatus } from "$types/preflight-types";

export async function checkSccAsync(nested: boolean): Promise<SccStatus> {
	const scc = await which("scc", { nothrow: true });
	if (scc === null) {
		return { kind: SccStatusKind.Missing };
	}

	return nested ? inspectSccAsync(true) : { kind: SccStatusKind.Ok };
}

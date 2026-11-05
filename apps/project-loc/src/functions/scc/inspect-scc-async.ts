import { SccStatusKind } from "$meta/scc-status-kind";

import { isSccTooOldForNested } from "./is-scc-too-old-for-nested";
import { parseSccVersion } from "./parse-scc-version";

import type { SccStatus } from "$types/preflight-types";

export async function inspectSccAsync(nested: boolean): Promise<SccStatus> {
	try {
		const { exitCode, stdout } = await import("tinyexec").then(({ exec }) =>
			exec("scc", ["--version"], { nodePath: false }),
		);

		if (exitCode !== 0) {
			return { kind: SccStatusKind.Broken };
		}

		const version = parseSccVersion(stdout);
		if (nested && version !== undefined && isSccTooOldForNested(version)) {
			return { kind: SccStatusKind.Outdated, version };
		}

		return { kind: SccStatusKind.Ok };
	} catch {
		return { kind: SccStatusKind.Broken };
	}
}

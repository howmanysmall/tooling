import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { describe, it } from "vitest";
import { fromPartial } from "@total-typescript/shoehorn";

import { MULTI_MODEL } from "$generation/model-fixture";
import { renderScreen } from "$interactive/app/test-screen";
import { SessionProvider } from "$interactive/session/session-provider.tsx";
import { createSession } from "$interactive/session/session-state";
import { createSessionStore } from "$interactive/session/session-store";
import { createSessionTabs } from "$interactive/session/session-tabs";

import { GenerateScreen } from "./generate-screen.tsx";

import type { SessionSummary } from "$history/session-list";
import type { ModelCatalog } from "$interactive/models/model-browser-state";
import type { SessionRequest, SessionServices } from "$interactive/session/session-services";

const CATALOG: ModelCatalog = {
	models: [MULTI_MODEL],
	observed: new Map(),
	pricing: {},
	shippedExamples: new Map(),
	yourExamples: new Map(),
};
const NO_RECENT: ReadonlyArray<string> = [];
const NO_SESSIONS: ReadonlyArray<SessionSummary> = [];
const NOW = new Date("2026-10-15T12:00:00.000Z");
const SESSION = createSession("01M4YVAAAAAAAAAAAAAAAAAAS1");

function getNoPreview(): undefined {
	return undefined;
}

function ignore(): void {
	// The test doesn't pick models, save runs, or open the guided session.
}

describe("generate screen", () => {
	it("attaches an image pasted as a quoted path, and sends it with the prompt", async ({ expect }) => {
		// oxlint-disable-next-line small-rules/prefer-expect-assertions -- vitest counts expect.poll, this rule does not
		expect.assertions(4);

		const directory = await mkdtemp(nodePath.join(tmpdir(), "darkroom paste "));
		const image = nodePath.join(directory, "fox.png");
		await writeFile(image, "");

		const requests: Array<SessionRequest> = [];
		const services = fromPartial<SessionServices>({
			getRunningCount: () => 0,
			async prepareAsync(request: SessionRequest): Promise<never> {
				requests.push(request);
				throw new Error("The test stops before pricing.");
			},
		});
		const store = createSessionStore(createSessionTabs([SESSION], SESSION.id), async () => undefined);
		const instance = renderScreen(
			<SessionProvider services={services} store={store} onRunSaved={ignore}>
				<GenerateScreen
					catalog={CATALOG}
					getPreview={getNoPreview}
					model={MULTI_MODEL}
					now={NOW}
					recentIds={NO_RECENT}
					sessions={NO_SESSIONS}
					onChooseModel={ignore}
					onGenerateWithOptions={ignore}
				/>
			</SessionProvider>,
		);

		await delay(20);
		instance.stdin.write(`\u001B[200~ '${image}'\n\u001B[201~`);

		await expect.poll(() => String(instance.lastFrame())).toContain("[Image 1]");
		expect(String(instance.lastFrame())).not.toContain("fox.png");

		await delay(30);
		instance.stdin.write(" but red");
		await delay(30);
		instance.stdin.write("\r");

		await expect.poll(() => requests.at(0)).toMatchObject({ attachments: [image], prompt: "[Image 1] but red" });

		instance.unmount();
		await rm(directory, { force: true, recursive: true });

		expect(requests).toHaveLength(1);
	});
});

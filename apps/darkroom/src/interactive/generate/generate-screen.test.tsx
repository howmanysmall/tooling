import { setTimeout as delay } from "node:timers/promises";
import { describe, it } from "vitest";

import { MULTI_MODEL } from "$generation/model-fixture";
import { prepareGenerationAsync } from "$generation/run-generation";
import { renderScreen } from "$interactive/app/test-screen";
import { SessionProvider } from "$interactive/session/session-provider.tsx";
import { createSession } from "$interactive/session/session-state";
import { createSessionStore } from "$interactive/session/session-store";
import { createSessionTabs } from "$interactive/session/session-tabs";

import { GenerateScreen } from "./generate-screen.tsx";

import type { GenerationResult } from "$generation/run-generation";
import type { SessionSummary } from "$history/session-list";
import type { ModelCatalog } from "$interactive/models/model-browser-state";
import type { SessionServices } from "$interactive/session/session-services";
import type { PendingRequest } from "$interactive/session/session-state";
import type { SessionStore } from "$interactive/session/session-store";

const CATALOG: ModelCatalog = {
	models: [MULTI_MODEL],
	observed: new Map(),
	pricing: {},
	shippedExamples: new Map(),
	yourExamples: new Map(),
};
const ENTER = "\r";
const RESULT: GenerationResult = {
	id: "01M4YVAAAAAAAAAAAAAAAAAAA1",
	cost: 0.04,
	created: "2026-10-15T09:00:00.000Z",
	failures: [],
	images: [{ mediaType: "image/png", path: "/tmp/a-red-fox.png" }],
	model: MULTI_MODEL.id,
	prompt: "a red fox",
	requested: 1,
	returned: 1,
};
const CONFIRM = /Generate\?[\s\S]*cost +\$0\.04/u;
const FINISHED = /a red fox[\s\S]*◆ test\/multi · [\d.]+s · \$0\.04[\s\S]*\/tmp\/a-red-fox\.png/u;

const NO_RECENT: ReadonlyArray<string> = [];
const NO_SESSIONS: ReadonlyArray<SessionSummary> = [];
const NOW = new Date("2026-10-15T12:00:00.000Z");

function getNoPreview(): undefined {
	return undefined;
}

function ignore(): void {
	// The test doesn't pick models or open the guided session.
}

interface FakeSession {
	/** Records each saved run in `saved`. */
	readonly handleRunSaved: () => void;
	readonly saved: Array<string>;
	readonly sent: Array<string>;
	readonly services: SessionServices;
}

function createFakeSession(): FakeSession {
	const sent: Array<string> = [];
	const saved: Array<string> = [];
	return {
		handleRunSaved(): void {
			saved.push("saved");
		},
		saved,
		sent,
		services: {
			deleteRunAsync: async () => undefined,
			forkAsync: async () => undefined,
			getRunningCount: () => 0,
			async prepareAsync(request): Promise<PendingRequest> {
				const prepared = await prepareGenerationAsync(
					{
						force: false,
						modelId: MULTI_MODEL.id,
						options: {},
						prompt: request.type === "new" ? request.prompt : request.entry.prompt,
						references: [],
					},
					{ cwd: "/tmp", isDirectoryAsync: async () => false, models: [MULTI_MODEL], stdoutIsTty: false },
				);

				return { cost: "$0.04", prepared };
			},
			restoreAsync: async () => [],
			start(prepared, handlers): void {
				sent.push(prepared.input.prompt);
				handlers.onDone(RESULT);
			},
			waitForRunningAsync: async () => [],
		},
	};
}

function createTestStore(): SessionStore {
	const session = createSession("01M4YVAAAAAAAAAAAAAAAAAAS1");
	return createSessionStore(createSessionTabs([session], session.id), async () => undefined);
}

async function typeAsync(write: (data: string) => void, ...keys: ReadonlyArray<string>): Promise<void> {
	for (const key of keys) {
		write(key);
		// oxlint-disable-next-line no-await-in-loop -- one key at a time, as typed
		await delay(30);
	}
}

describe("generate screen", () => {
	it("asks with the cost before sending, then shows the saved image in the turn", async ({ expect }) => {
		// oxlint-disable-next-line small-rules/prefer-expect-assertions -- vitest counts expect.poll, this rule does not
		expect.assertions(4);

		const { handleRunSaved, saved, sent, services } = createFakeSession();
		const instance = renderScreen(
			<SessionProvider services={services} store={createTestStore()} onRunSaved={handleRunSaved}>
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

		function write(data: string): void {
			instance.stdin.write(data);
		}

		await delay(20);
		await typeAsync(write, "a red fox", ENTER);

		await expect.poll(() => String(instance.lastFrame())).toMatch(CONFIRM);
		expect(sent).toStrictEqual([]);

		// The dialog starts reading keys once its effect runs.
		await delay(300);
		await typeAsync(write, ENTER);

		await expect.poll(() => String(instance.lastFrame())).toMatch(FINISHED);
		expect(saved).toStrictEqual(["saved"]);
	});
});

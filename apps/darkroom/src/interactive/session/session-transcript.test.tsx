import { describe, it } from "vitest";
import { fromPartial } from "@total-typescript/shoehorn";
import { Box } from "@visulima/tui/components/box";

import { renderScreen, TEST_COLUMNS, TEST_ROWS } from "$interactive/app/test-screen";
import { measureElement, MouseRegistryContext } from "$interactive/mouse/mouse-context";
import { MouseAction } from "$interactive/mouse/mouse-input";
import { createMouseRegistry } from "$interactive/mouse/mouse-registry";

import { SessionProvider } from "./session-provider";
import { createSession, TurnPhase } from "./session-state";
import { createSessionStore } from "./session-store";
import { createSessionTabs } from "./session-tabs";
import { SessionTranscript } from "./session-transcript";

import type { GenerationResult } from "$generation/run-generation";

import type { SessionServices } from "./session-services";
import type { SessionTurn } from "./session-state";

const TURNS: ReadonlyArray<SessionTurn> = Array.from({ length: 15 }, (_, index) => ({
	id: index + 1,
	model: "openai/gpt-image-1",
	phase: TurnPhase.Done,
	prompt: `prompt number ${index + 1}`,
	requested: 1,
	result: fromPartial<GenerationResult>({
		id: `RUN${index + 1}`,
		images: [{ mediaType: "image/png", path: `/work/${index + 1}.png` }],
	}),
	warnings: [],
}));

const OLDEST = /prompt number 1(?!\d)/u;
const NEWEST = /prompt number 15/u;

function ignore(): void {
	// The transcript never saves a run here.
}

interface PreviewRecorder {
	readonly getPreview: (path: string) => undefined;
	/** The images the transcript asked to preview. */
	readonly paths: ReadonlySet<string>;
}

function createPreviewRecorder(): PreviewRecorder {
	const paths = new Set<string>();
	return {
		getPreview(path): undefined {
			paths.add(path);
			return undefined;
		},
		paths,
	};
}

interface Transcript extends ReturnType<typeof renderScreen> {
	/** Turns the wheel up a notch over the transcript. */
	readonly scrollUp: () => void;
}

function renderTranscript(recorder: PreviewRecorder): Transcript {
	const registry = createMouseRegistry(measureElement);
	const fresh = createSession("01SESSIONTRANSCRIPT");
	const store = createSessionStore(createSessionTabs([fresh], fresh.id), async () => undefined);
	const instance = renderScreen(
		<SessionProvider services={fromPartial<SessionServices>({})} store={store} onRunSaved={ignore}>
			<MouseRegistryContext value={registry}>
				<Box flexDirection="column" height={TEST_ROWS} width={TEST_COLUMNS}>
					<SessionTranscript
						columns={TEST_COLUMNS}
						getPreview={recorder.getPreview}
						rows={TEST_ROWS}
						turns={TURNS}
					/>
				</Box>
			</MouseRegistryContext>
		</SessionProvider>,
	);

	return {
		...instance,
		scrollUp(): void {
			registry.dispatch({ action: MouseAction.WheelUp, column: 10, row: 10 });
		},
	};
}

describe("session transcript", () => {
	it("follows the newest turn, and the wheel scrolls back to the oldest", async ({ expect, onTestFinished }) => {
		// oxlint-disable-next-line small-rules/prefer-expect-assertions -- vitest counts expect.poll, this rule does not
		expect.assertions(3);

		const transcript = renderTranscript(createPreviewRecorder());
		onTestFinished(transcript.unmount);

		await expect.poll(() => String(transcript.lastFrame())).toMatch(NEWEST);

		expect(String(transcript.lastFrame())).not.toMatch(OLDEST);

		for (let notch = 0; notch < 10; notch += 1) {
			transcript.scrollUp();
		}

		await expect.poll(() => String(transcript.lastFrame()), { timeout: 3000 }).toMatch(OLDEST);
	});

	it("asks for previews of the newest turns only", async ({ expect, onTestFinished }) => {
		// oxlint-disable-next-line small-rules/prefer-expect-assertions -- vitest counts expect.poll, this rule does not
		expect.assertions(2);

		const recorder = createPreviewRecorder();
		const transcript = renderTranscript(recorder);
		onTestFinished(transcript.unmount);

		await expect.poll(() => String(transcript.lastFrame())).toMatch(NEWEST);

		expect(recorder.paths).toStrictEqual(
			new Set(["/work/10.png", "/work/11.png", "/work/12.png", "/work/13.png", "/work/14.png", "/work/15.png"]),
		);
	});
});

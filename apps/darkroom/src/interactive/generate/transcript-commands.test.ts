import { describe, it } from "vitest";
import { fromPartial } from "@total-typescript/shoehorn";

import { TurnPhase } from "$interactive/session/session-state";

import { getImageCommands, getPromptCommands } from "./transcript-commands";

import type { GenerationResult } from "$generation/run-generation";
import type { SessionActions } from "$interactive/session/session-context";
import type { SessionTurn } from "$interactive/session/session-state";

import type { TranscriptEnvironment } from "./transcript-commands";

interface Recorded {
	readonly environment: TranscriptEnvironment;
	/** Everything that happened, in order. */
	readonly events: Array<string>;
}

function record(): Recorded {
	const events: Array<string> = [];
	const actions: Pick<SessionActions, "chooseBase" | "fork" | "rewind"> = {
		chooseBase(image): void {
			events.push(`edit ${image.path}`);
		},
		fork(turnId): void {
			events.push(`fork ${turnId}`);
		},
		rewind(turnId): void {
			events.push(`rewind ${turnId}`);
		},
	};
	const session = fromPartial<SessionActions>(actions);
	const environment: TranscriptEnvironment = {
		askDelete(turn): void {
			events.push(`delete? ${turn.id}`);
		},
		copyImageAsync: async () => undefined,
		fillPrompt(text): void {
			events.push(`fill ${text}`);
		},
		openImagesAsync: async () => undefined,
		reportError(text): void {
			events.push(`error ${text}`);
		},
		reportSuccess(text): void {
			events.push(`success ${text}`);
		},
		session,
		turns: [MADE],
		write(data): void {
			events.push(`write ${data}`);
		},
	};

	return { environment, events };
}

const TURN = { id: 4, model: "m", phase: TurnPhase.Done, prompt: "a cat", requested: 1, warnings: [] };
const IMAGE = { mediaType: "image/png", path: "/work/cat.png" };
const MADE: SessionTurn = {
	...TURN,
	id: 5,
	result: fromPartial<GenerationResult>({ id: "RUN", images: [IMAGE] }),
};

describe("getPromptCommands", () => {
	it("rewinds or forks to before the prompt and puts it back in the box", ({ expect }) => {
		expect.assertions(1);

		const { environment, events } = record();
		const [rewind, fork] = getPromptCommands(TURN, environment);
		rewind?.run();
		fork?.run();

		expect(events).toStrictEqual(["rewind 4", "fill a cat", "fork 4", "fill a cat"]);
	});
});

describe("delete", () => {
	it("asks about the turn that made a clicked image, and not while one runs", ({ expect }) => {
		expect.assertions(2);

		const { environment, events } = record();
		getImageCommands(IMAGE, environment)
			.find((command) => command.title === "Delete")
			?.run();
		const running = getPromptCommands({ ...TURN, phase: TurnPhase.Running }, environment);

		expect(events).toStrictEqual(["delete? 5"]);
		expect(running.map((command) => command.title)).not.toContain("Delete");
	});
});

describe("getImageCommands", () => {
	it("edits the image next, or copies its path with OSC 52", ({ expect }) => {
		expect.assertions(1);

		const { environment, events } = record();
		const commands = getImageCommands(IMAGE, environment);
		commands.find((command) => command.title === "Edit")?.run();
		commands.find((command) => command.title === "Copy path")?.run();

		expect(events).toStrictEqual([
			"edit /work/cat.png",
			`write \u001B]52;c;${Buffer.from("/work/cat.png").toString("base64")}\u0007`,
			"success Copied the path",
		]);
	});
});

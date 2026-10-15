import { describe, it } from "vitest";

import { InterruptAction, InterruptGuard, InterruptPhase } from "./interrupt-guard.ts";

describe("interruptGuard", () => {
	it("aborts the request while it is in flight", ({ expect }) => {
		expect.assertions(2);

		const guard = new InterruptGuard();
		guard.enter(InterruptPhase.Requesting);

		expect(guard.interrupt()).toBe(InterruptAction.Abort);
		expect(guard.signal.aborted).toBe(true);
	});

	it("holds the first Ctrl-C while saving and exits on the second", ({ expect }) => {
		expect.assertions(3);

		const guard = new InterruptGuard();
		guard.enter(InterruptPhase.Saving);

		expect(guard.interrupt()).toBe(InterruptAction.Defer);
		expect(guard.wasInterrupted).toBe(true);
		expect(guard.interrupt()).toBe(InterruptAction.Exit);
	});

	it("exits immediately when nothing is in progress", ({ expect }) => {
		expect.assertions(1);

		expect(new InterruptGuard().interrupt()).toBe(InterruptAction.Exit);
	});
});

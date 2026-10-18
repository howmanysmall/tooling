export const enum InterruptPhase {
	Idle = "idle",
	Requesting = "requesting",
	Saving = "saving",
}

export const enum InterruptAction {
	/** Cancel the in-flight request. */
	Abort = "abort",
	/** Remember the interrupt and exit once saving finishes. */
	Defer = "defer",
	/** Exit right away. */
	Exit = "exit",
}

/**
 * Decides what Ctrl-C does at each point of a run.
 *
 * - While the request is in flight, it aborts the request.
 * - While a paid image is being saved, the first Ctrl-C waits for the files
 *   to be written; a second one exits immediately.
 * - Otherwise it exits.
 */
export class InterruptGuard {
	private interruptCount = 0;
	private phase = InterruptPhase.Idle;

	public readonly controller = new AbortController();

	public enter(phase: InterruptPhase): void {
		this.phase = phase;
	}

	/**
	 * Records one Ctrl-C.
	 *
	 * @returns What the caller should do about it.
	 */
	public interrupt(): InterruptAction {
		this.interruptCount += 1;
		if (this.phase === InterruptPhase.Requesting) {
			this.controller.abort();
			return InterruptAction.Abort;
		}
		if (this.phase === InterruptPhase.Saving && this.interruptCount === 1) return InterruptAction.Defer;
		return InterruptAction.Exit;
	}

	/**
	 * Aborts the request when Ctrl-C arrives while it is in flight.
	 *
	 * @returns The signal to pass to the SDK.
	 */
	public get signal(): AbortSignal {
		return this.controller.signal;
	}

	/**
	 * Whether Ctrl-C was pressed at any point.
	 *
	 * @returns `true` when the run should exit 130 once it finishes.
	 */
	public get wasInterrupted(): boolean {
		return this.interruptCount > 0;
	}
}

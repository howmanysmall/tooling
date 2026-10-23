export const enum ExitCode {
	Api = 1,
	Interrupted = 130,
	/** Stopped by SIGTERM: 128 + 15. */
	Terminated = 143,
}

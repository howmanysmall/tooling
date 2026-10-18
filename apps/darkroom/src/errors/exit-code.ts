export const enum ExitCode {
	Api = 1,
	Configuration = 3,
	Interrupted = 130,
	/** Stopped by SIGTERM: 128 + 15. */
	Terminated = 143,
}

async function settleAsync(task: Promise<void>, onSettled: (failure: string | undefined) => void): Promise<void> {
	try {
		await task;
		onSettled(undefined);
	} catch (error) {
		onSettled(error instanceof Error ? error.message : String(error));
	}
}

/**
 * Lets a key handler start an action that touches the disk without waiting
 * for it. A failure becomes a message for the footer, so a key press never
 * leaves a rejected promise.
 *
 * @param task - The running action.
 * @param onSettled - Called once with the failure's message, or `undefined`
 *   when the action succeeded.
 */
export function runBrowserTask(task: Promise<void>, onSettled: (failure: string | undefined) => void): void {
	// oxlint-disable-next-line eslint/no-void -- settleAsync never rejects, and key handlers can't await
	void settleAsync(task, onSettled);
}

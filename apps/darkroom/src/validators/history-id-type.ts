import { StringType } from "@cliffy/command";

export const historyIdType = new StringType();

export async function getHistoryIdsAsync(): Promise<Array<string>> {
	const [{ formatRunCompletions, readRunSummariesAsync }, { readCompletionContext }] = await Promise.all([
		import("$history/history-completions"),
		import("$utilities/completion-context"),
	]);
	return formatRunCompletions(await readRunSummariesAsync(), readCompletionContext().shell);
}

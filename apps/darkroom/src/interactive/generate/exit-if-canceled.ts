import { exit } from "node:process";
import { cancel, isCancel } from "@clack/prompts";

/**
 * Stops on Ctrl-C at any prompt: prints `Canceled.` and exits 130.
 *
 * @template Value - The answer's type.
 * @param value - A prompt's answer.
 */
export function exitIfCanceled<Value>(value: Value): asserts value is Exclude<Value, symbol> {
	if (!isCancel(value)) return;
	cancel("Canceled.");
	exit(130);
}

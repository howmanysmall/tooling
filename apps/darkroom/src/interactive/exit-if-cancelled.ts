import { exit } from "node:process";
import { cancel, isCancel } from "@clack/prompts";

/**
 * Stops on Ctrl-C at any prompt: prints `Cancelled.` and exits 130.
 *
 * @template Value - The answer's type.
 * @param value - A prompt's answer.
 */
export function exitIfCancelled<Value>(value: Value): asserts value is Exclude<Value, symbol> {
	if (!isCancel(value)) return;
	cancel("Cancelled.");
	exit(130);
}

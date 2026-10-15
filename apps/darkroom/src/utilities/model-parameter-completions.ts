import { env } from "node:process";

import { CompletionKind, getCompletionsAsync } from "./completion-cache-utilities";
import { getOptionValue, readCompletionContext } from "./completion-context";

const MODEL_FLAGS: ReadonlyArray<string> = ["-m", "--model"];

/**
 * Picks the completions for one parameter from the cached
 * `id<Tab>parameter<Tab>value…` lines.
 *
 * @param lines - The cached lines.
 * @param parameter - The wire name, such as `aspect_ratio`.
 * @param modelId - The model on the command line, if known.
 * @returns That model's values when it declares the parameter, otherwise every
 *   value any model declares.
 */
export function selectParameterValues(
	lines: ReadonlyArray<string>,
	parameter: string,
	modelId?: string,
): Array<string> {
	const union = new Set<string>();
	for (const line of lines) {
		const [id, lineParameter, ...values] = line.split("\t");
		if (lineParameter !== parameter) continue;
		if (id === modelId) return values;
		for (const value of values) union.add(value);
	}
	return [...union];
}

/**
 * Completes a model parameter, narrowed to the model given with `-m` or
 * `DARKROOM_MODEL` when there is one.
 *
 * @param parameter - The wire name, such as `aspect_ratio`.
 * @param fallbackModelAsync - Another way to find the model, such as the
 *   stored model of a run being re-run.
 * @returns The values to offer.
 */
export async function getParameterCompletionsAsync(
	parameter: string,
	fallbackModelAsync?: (words: ReadonlyArray<string>) => Promise<string | undefined>,
): Promise<Array<string>> {
	const lines = await getCompletionsAsync(CompletionKind.ModelParameters);
	const { words } = readCompletionContext();
	const modelId =
		getOptionValue(words, MODEL_FLAGS) ??
		(await fallbackModelAsync?.(words)) ??
		// biome-ignore lint/style/noProcessEnv: completions skip the arktype environment to stay fast.
		env.DARKROOM_MODEL;
	return selectParameterValues(lines, parameter, modelId);
}

import { env } from "node:process";

import { CompletionKind, getCompletionsAsync } from "./completion-cache-utilities";
import { getOptionValues, readCompletionContext } from "./completion-context";

const MODEL_FLAGS: ReadonlyArray<string> = ["-m", "--model"];

function intersect(first: ReadonlyArray<string>, others: ReadonlyArray<ReadonlySet<string>>): Array<string> {
	return first.filter((value) => others.every((values) => values.has(value)));
}

/**
 * Picks the completions for one parameter from the cached
 * `id<Tab>parameter<Tab>value…` lines.
 *
 * @param lines - The cached lines.
 * @param parameter - The wire name, such as `aspect_ratio`.
 * @param modelIds - The models on the command line, if any.
 * @returns The values every given model declares, in the first model's
 *   order. Models that don't declare the parameter accept anything, so they
 *   don't narrow it; with no declaring model, every value any model declares.
 */
export function selectParameterValues(
	lines: ReadonlyArray<string>,
	parameter: string,
	modelIds: ReadonlyArray<string> = [],
): Array<string> {
	const union = new Set<string>();
	const declared = new Map<string, Array<string>>();
	for (const line of lines) {
		const [id = "", lineParameter, ...values] = line.split("\t");
		if (lineParameter !== parameter) continue;

		declared.set(id, values);

		for (const value of values) union.add(value);
	}

	const [first, ...rest] = modelIds.flatMap((modelId) => {
		const values = declared.get(modelId);
		return values === undefined ? [] : [values];
	});

	if (first === undefined) return [...union];

	return intersect(
		first,
		rest.map((values) => new Set(values)),
	);
}

/**
 * Completes a model parameter, narrowed to the models given with `-m` (all
 * of them, for `compare`), or else `DARKROOM_MODEL`.
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
	const given = getOptionValues(words, MODEL_FLAGS);
	if (given.length > 0) return selectParameterValues(lines, parameter, given);

	const modelId =
		(await fallbackModelAsync?.(words)) ??
		// biome-ignore lint/style/noProcessEnv: completions skip the arktype environment to stay fast.
		env.DARKROOM_MODEL;

	return selectParameterValues(lines, parameter, modelId === undefined ? [] : [modelId]);
}

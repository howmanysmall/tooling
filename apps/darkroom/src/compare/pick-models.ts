import { stderr } from "node:process";
import { autocompleteMultiselect, isCancel } from "@clack/prompts";

import { InterruptedError } from "$errors/interrupted-error";
import { getCountRange, getReferenceRange } from "$generation/model-capabilities";

import type { ImageModelListItem } from "@openrouter/sdk/models";

function describeModel(model: ImageModelListItem): string {
	return `${model.id} · ≤${getReferenceRange(model).max} refs · n≤${getCountRange(model).max}`;
}

/**
 * Asks which models to compare, on stderr. `DARKROOM_MODEL` starts selected.
 *
 * @returns The chosen model IDs, in list order.
 * @rejects An `InterruptedError` (exit 130) when the prompt is canceled.
 */
export async function pickModelsAsync(): Promise<Array<string>> {
	const [{ getImageModelsAsync }, { getEnvironmentAsync }] = await Promise.all([
		import("$utilities/image-model-utilities"),
		import("$functions/get-environment-async"),
	]);
	const [models, { DARKROOM_MODEL: preferred }] = await Promise.all([getImageModelsAsync(), getEnvironmentAsync()]);
	const picked = await autocompleteMultiselect({
		initialValues: preferred !== undefined && models.some((model) => model.id === preferred) ? [preferred] : [],
		message: "Models to compare",
		options: models.map((model) => ({ hint: describeModel(model), label: model.name, value: model.id })),
		output: stderr,
		required: true,
	});

	if (isCancel(picked)) throw new InterruptedError("Cancelled.");

	return picked;
}

/**
 * Gets the models to compare: the `-m` values, or a picker on a terminal
 * when none were given.
 *
 * @param given - The `-m` values, if any.
 * @param canAsk - Whether stdin and stderr are terminals.
 * @returns The model IDs, in order.
 */
export async function chooseModelsAsync(
	given: ReadonlyArray<string> | undefined,
	canAsk: boolean,
): Promise<Array<string>> {
	if (given !== undefined) return [...given];

	return canAsk ? pickModelsAsync() : [];
}

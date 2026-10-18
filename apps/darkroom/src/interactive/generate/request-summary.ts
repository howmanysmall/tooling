import { previewPrompt } from "$history/format-history";

import type { PreparedGeneration } from "$generation/run-generation";

const LABEL_WIDTH = 13;

/**
 * Describes a prepared request for the confirmation, as `label value`
 * lines.
 *
 * @param prepared - The validated request.
 * @param prepared.input - The prompt and references.
 * @param prepared.model - The chosen model.
 * @param prepared.parameters - The validated settings.
 * @param cost - The estimated cost, already formatted.
 * @returns One `label value` line per setting that is set.
 */
export function summarizeRequest({ input, model, parameters }: PreparedGeneration, cost: string): string {
	const rows: Array<readonly [string, number | string | undefined]> = [
		["model", model.id],
		["prompt", previewPrompt(input.prompt, 60)],
		["count", parameters.count],
		["aspect ratio", parameters.aspectRatio],
		["resolution", parameters.resolution],
		["quality", parameters.quality],
		["references", input.references.length === 0 ? undefined : input.references.length],
		["cost", cost],
	];
	return rows
		.flatMap(([label, value]) => (value === undefined ? [] : [`${label.padEnd(LABEL_WIDTH)}${value}`]))
		.join("\n");
}

import { cwd, env, stdout } from "node:process";
import { autocomplete, intro, log, multiline, select, text } from "@clack/prompts";
import { dim } from "ansis";

import { getCountRange, getEnumValues, getReferenceRange } from "$generation/model-capabilities";
import { describeListPrice, getModelPrices } from "$generation/observed-prices";

import { confirmAndGenerateAsync } from "./confirm-and-generate";
import { editInEditorAsync, getEditor } from "./edit-in-editor";
import { exitIfCancelled } from "./exit-if-cancelled";
import { pickReferencesAsync } from "./reference-picker";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { ObservedPrices } from "$generation/observed-prices";
import type { ReferenceImage } from "$generation/references";
import type { GenerationOptions } from "$generation/validate-request";
import type { ModelPricing } from "$utilities/model-pricing-utilities";

// Rows of models the picker shows at once.
const PICKER_ROWS = 12;

function describeModel(model: ImageModelListItem): string {
	const references = getReferenceRange(model).max;
	return `${model.id} · ≤${references} refs · n≤${getCountRange(model).max}`;
}

interface PickerCatalog {
	readonly models: ReadonlyArray<ImageModelListItem>;
	readonly observed: ObservedPrices;
	/** `DARKROOM_MODEL`, highlighted first. */
	readonly preferred?: string | undefined;
	readonly pricing: ModelPricing;
}

function getNameWidth(models: ReadonlyArray<ImageModelListItem>): number {
	let width = 0;
	for (const { name } of models) width = Math.max(width, name.length);
	return width;
}

async function loadCatalogAsync(): Promise<PickerCatalog> {
	const [{ getImageModelsAsync }, { getModelPricingAsync }, { getEnvironmentAsync }, { readObservedPricesAsync }] =
		await Promise.all([
			import("$utilities/image-model-utilities"),
			import("$utilities/model-pricing-utilities"),
			import("$functions/get-environment-async"),
			import("$generation/cli-runner"),
		]);
	const [models, pricing, observed, { DARKROOM_MODEL }] = await Promise.all([
		getImageModelsAsync(),
		getModelPricingAsync(true, (message) => {
			log.warn(message);
		}),
		readObservedPricesAsync(),
		getEnvironmentAsync(),
	]);
	return { models, observed, preferred: DARKROOM_MODEL, pricing };
}

async function askModelAsync(): Promise<ImageModelListItem> {
	const { models, observed, preferred, pricing } = await loadCatalogAsync();
	// Only the highlighted option shows its hint, so the price goes in every
	// label, lined up in a column after the names.
	const nameWidth = getNameWidth(models);
	const id = await autocomplete({
		initialValue: models.some((model) => model.id === preferred) ? preferred : undefined,
		maxItems: PICKER_ROWS,
		message: "Model",
		options: models.map((model) => ({
			hint: describeModel(model),
			label: `${model.name.padEnd(nameWidth)}  ${dim(describeListPrice(getModelPrices(pricing, observed, model.id)))}`,
			value: model.id,
		})),
	});
	exitIfCancelled(id);
	const model = models.find((item) => item.id === id);
	if (model === undefined) throw new Error(`Unknown model ${id}.`);
	return model;
}

async function askOncePromptAsync(editor?: string): Promise<string | undefined> {
	if (editor !== undefined) {
		const useEditor = await select({
			message: "Prompt",
			options: [
				{ label: "Type it here", value: false },
				{ label: `Open in ${editor}`, value: true },
			],
		});
		exitIfCancelled(useEditor);
		if (useEditor) return editInEditorAsync(editor);
	}

	const typed = await multiline({
		message: "Prompt",
		validate: (value) => ((value ?? "").trim() === "" ? "Write a prompt." : undefined),
	});
	exitIfCancelled(typed);
	return typed;
}

async function askPromptAsync(): Promise<string> {
	const editor = getEditor(env);
	while (true) {
		// oxlint-disable-next-line no-await-in-loop -- ask again until the prompt is not empty
		const prompt = await askOncePromptAsync(editor);
		const trimmed = prompt?.trim() ?? "";
		if (trimmed !== "") return trimmed;
		log.warn("The prompt was empty.");
	}
}

async function askReferencesAsync(model: ImageModelListItem): Promise<Array<ReferenceImage>> {
	const { max } = getReferenceRange(model);
	if (max === 0) return [];

	const picked = await pickReferencesAsync({ directory: cwd(), max, message: "Reference images", output: stdout });
	exitIfCancelled(picked);
	const paths = picked ?? [];
	const { loadReferenceAsync } = await import("$generation/references");
	return Promise.all(paths.map(async (path) => loadReferenceAsync(path)));
}

async function askChoiceAsync(
	model: ImageModelListItem,
	parameter: string,
	message: string,
): Promise<string | undefined> {
	const values = getEnumValues(model, parameter);
	if (values === undefined || values.length === 0) return undefined;
	if (values.length === 1) return values[0];

	const choice = await select({ message, options: values.map((value) => ({ label: value, value })) });
	exitIfCancelled(choice);
	return choice;
}

async function askCountAsync(model: ImageModelListItem): Promise<number> {
	const { max, min } = getCountRange(model);
	if (max <= 1) return 1;
	const answer = await text({
		initialValue: String(min),
		message: `How many images? (${min}–${max})`,
		validate(value) {
			const count = Number(value);
			return Number.isInteger(count) && count >= min && count <= max ? undefined : `Enter ${min} to ${max}.`;
		},
	});
	exitIfCancelled(answer);
	return Number(answer);
}

async function askOptionsAsync(model: ImageModelListItem): Promise<GenerationOptions> {
	return {
		aspectRatio: await askChoiceAsync(model, "aspect_ratio", "Aspect ratio"),
		count: await askCountAsync(model),
		quality: await askChoiceAsync(model, "quality", "Quality"),
		resolution: await askChoiceAsync(model, "resolution", "Resolution"),
	};
}

/**
 * Bare `darkroom` on a terminal: a guided session that asks only what the
 * chosen model can use, shows the estimated cost, and generates through the
 * same code as `generate`, so the run lands in the history too.
 *
 * @param chosen - A model already picked, as in the model browser; the
 *   model question is skipped.
 * @rejects Whatever generation rejects with.
 */
export async function runInteractiveSessionAsync(chosen?: ImageModelListItem): Promise<void> {
	const runner = await import("$generation/cli-runner");
	intro("darkroom");

	// oxlint-disable react-doctor/server-sequential-independent-await -- each question waits for the previous answer on screen
	const model = chosen ?? (await askModelAsync());
	if (chosen !== undefined) log.step(`Model  ${dim(chosen.name)}`);

	const prompt = await askPromptAsync();
	const references = await askReferencesAsync(model);
	const options = await askOptionsAsync(model);
	// oxlint-enable react-doctor/server-sequential-independent-await

	const prepared = await runner.prepareForTerminalAsync({
		force: false,
		modelId: model.id,
		options,
		prompt,
		references,
	});
	await confirmAndGenerateAsync(prepared);
}

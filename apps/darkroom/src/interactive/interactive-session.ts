import { cwd, env, exit, stdout } from "node:process";
import {
	autocomplete,
	cancel,
	confirm,
	intro,
	isCancel,
	log,
	multiline,
	note,
	outro,
	select,
	spinner,
	text,
} from "@clack/prompts";

import { formatResult, formatSummary } from "$generation/format-result";
import { describeProgress } from "$generation/image-stream";
import { getCountRange, getEnumValues, getReferenceRange } from "$generation/model-capabilities";
import { previewPrompt } from "$history/format-history";
import { OutputFormat } from "$validators/output-format-type";

import { editInEditorAsync, getEditor } from "./edit-in-editor";
import { pickReferencesAsync } from "./reference-picker";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { ReferenceImage } from "$generation/references";
import type { GenerationResult } from "$generation/run-generation";
import type { GenerationOptions } from "$generation/validate-request";

/**
 * Stops on Ctrl-C at any prompt: prints `Cancelled.` and exits 130.
 *
 * @template Value - The answer's type.
 * @param value - A prompt's answer.
 */
function exitIfCancelled<Value>(value: Value): asserts value is Exclude<Value, symbol> {
	if (!isCancel(value)) return;
	cancel("Cancelled.");
	exit(130);
}

function describeModel(model: ImageModelListItem): string {
	const references = getReferenceRange(model).max;
	return `${model.id} · ≤${references} refs · n≤${getCountRange(model).max}`;
}

async function askModelAsync(models: ReadonlyArray<ImageModelListItem>): Promise<ImageModelListItem> {
	const { getEnvironmentAsync } = await import("$functions/get-environment-async");
	const { DARKROOM_MODEL: preferred } = await getEnvironmentAsync();
	const id = await autocomplete({
		initialValue: models.some((model) => model.id === preferred) ? preferred : undefined,
		message: "Model",
		options: models.map((model) => ({ hint: describeModel(model), label: model.name, value: model.id })),
	});
	exitIfCancelled(id);
	const model = models.find((item) => item.id === id);
	if (model === undefined) throw new Error(`Unknown model ${id}.`);
	return model;
}

async function askOncePromptAsync(editor: string | undefined): Promise<string | undefined> {
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

function summarize(prompt: string, model: ImageModelListItem, options: GenerationOptions, references: number): string {
	const rows: Array<readonly [string, number | string | undefined]> = [
		["model", model.id],
		["prompt", previewPrompt(prompt, 60)],
		["count", options.count ?? 1],
		["aspect ratio", options.aspectRatio],
		["resolution", options.resolution],
		["quality", options.quality],
		["references", references === 0 ? undefined : references],
	];
	return rows.flatMap(([label, value]) => (value === undefined ? [] : [`${label.padEnd(13)}${value}`])).join("\n");
}

/**
 * Bare `darkroom` on a terminal: a guided session that asks only what the
 * chosen model can use, shows the estimated cost, and generates through the
 * same code as `generate`, so the run lands in the history too.
 *
 * @rejects Whatever generation rejects with, after the spinner is ended.
 */
export async function runInteractiveSessionAsync(): Promise<void> {
	const [{ getImageModelsAsync }, runner] = await Promise.all([
		import("$utilities/image-model-utilities"),
		import("$generation/cli-runner"),
	]);
	intro("darkroom");

	// oxlint-disable react-doctor/server-sequential-independent-await -- each question waits for the previous answer on screen
	const models = await getImageModelsAsync();
	const model = await askModelAsync(models);
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
	const cost = await runner.describeCostAsync(prepared);
	note(`${summarize(prompt, model, options, references.length)}\n${"cost".padEnd(13)}${cost}`, "Request");
	const shouldGenerate = await confirm({ message: "Generate?" });
	exitIfCancelled(shouldGenerate);
	if (!shouldGenerate) {
		outro("Nothing was sent.");
		return;
	}

	const progress = spinner({ indicator: "timer" });
	progress.start("Generating");
	let result: GenerationResult;
	try {
		result = await runner.generateWithInterruptsAsync(prepared, {
			isQuiet: true,
			onProgress(update) {
				progress.message(`Generating · ${describeProgress(update, prepared.parameters.count)}`);
			},
		});
	} catch (error) {
		// End the spinner's line before the error is printed below it.
		progress.error("Failed");
		throw error;
	}
	progress.stop(formatSummary(result));

	const paths = formatResult(result, OutputFormat.Pretty, cwd());
	if (paths !== undefined) note(paths, "Saved");
	outro("Done.");
	runner.throwIfIncomplete(result);
}

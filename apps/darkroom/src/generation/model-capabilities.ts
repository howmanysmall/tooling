import type { ImageModelListItem } from "@openrouter/sdk/models";

export interface Range {
	readonly max: number;
	readonly min: number;
}

/**
 * Gets a model's declared enum values for a parameter.
 *
 * @param model - The image model to inspect.
 * @param parameter - The wire name, such as `aspect_ratio`.
 * @returns The values, or `undefined` when the model doesn't declare an enum.
 */
export function getEnumValues(model: ImageModelListItem, parameter: string): ReadonlyArray<string> | undefined {
	const descriptor = model.supportedParameters[parameter];
	return descriptor?.type === "enum" ? descriptor.values : undefined;
}

/**
 * Gets a model's declared range for a parameter.
 *
 * @param model - The image model to inspect.
 * @param parameter - The wire name, such as `n`.
 * @returns The inclusive range, or `undefined` when none is declared.
 */
export function getRange(model: ImageModelListItem, parameter: string): Range | undefined {
	const descriptor = model.supportedParameters[parameter];
	return descriptor?.type === "range" ? { max: descriptor.max, min: descriptor.min } : undefined;
}

export function isDeclared(model: ImageModelListItem, parameter: string): boolean {
	return model.supportedParameters[parameter] !== undefined;
}

/**
 * How many images one request may ask for. Undeclared means one.
 *
 * @param model - The image model to inspect.
 * @returns The inclusive range for `n`.
 */
export function getCountRange(model: ImageModelListItem): Range {
	return getRange(model, "n") ?? { max: 1, min: 1 };
}

/**
 * How many reference images the model accepts. Undeclared means none.
 *
 * @param model - The image model to inspect.
 * @returns The inclusive range for `input_references`.
 */
export function getReferenceRange(model: ImageModelListItem): Range {
	return getRange(model, "input_references") ?? { max: 0, min: 0 };
}

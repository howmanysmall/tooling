import { createContext, use } from "react";

function keepId(id: string): string {
	return id;
}

/** Turns a model's ID into its name; set where the models are loaded. */
export const ModelNameContext = createContext<(id: string) => string>(keepId);

ModelNameContext.displayName = "ModelNameContext";

/**
 * Reads a model's display name, so turns can store only its ID.
 *
 * @param id - The model's ID, like `google/gemini-2.5-flash-image`.
 * @returns Its name, or the ID when the models aren't loaded.
 */
export function useModelName(id: string): string {
	return use(ModelNameContext)(id);
}

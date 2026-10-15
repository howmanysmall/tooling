import { StringType } from "@cliffy/command";

import { completeModelParameterAsync } from "./generation-parameter-types";

export const aspectRatioType = new StringType();

export async function getAspectRatiosAsync(): Promise<Array<string>> {
	return completeModelParameterAsync("aspect_ratio");
}

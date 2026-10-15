import { env, stdout } from "node:process";

import { getImageProtocol } from "$preview/image-protocol";
import { createPreviewCache } from "$preview/preview-cache";

import type { TerminalEnvironment } from "$preview/image-protocol";
import type { PreviewCache } from "$preview/preview-cache";

function pickTerminalVariables({
	COLORTERM,
	KITTY_WINDOW_ID,
	TERM,
	TERM_PROGRAM,
	TMUX,
}: NodeJS.ProcessEnv): TerminalEnvironment {
	return { COLORTERM, KITTY_WINDOW_ID, TERM, TERM_PROGRAM, TMUX };
}

/**
 * Sets up image previews for this terminal, drawn with kitty graphics or
 * half blocks as it supports, or not at all when `DARKROOM_PREVIEW=off`.
 *
 * @returns The preview cache, or `undefined` when previews are off.
 */
export async function createTerminalPreviewsAsync(): Promise<PreviewCache | undefined> {
	const { getEnvironmentAsync } = await import("$functions/get-environment-async");
	const { DARKROOM_PREVIEW } = await getEnvironmentAsync();
	const protocol = getImageProtocol({ ...pickTerminalVariables(env), DARKROOM_PREVIEW });
	return createPreviewCache(protocol, (sequence) => {
		stdout.write(sequence);
	});
}

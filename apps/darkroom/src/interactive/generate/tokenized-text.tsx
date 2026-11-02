import { Text } from "ink";

import { theme } from "$interactive/components/theme";

import { formatImageToken } from "./prompt-images";

import type { ReactNode } from "react";

import type { PromptImage } from "./prompt-images";

export interface TokenizedTextProperties {
	/** The images pasted in; a token with none behind it is only text. */
	images: ReadonlyArray<PromptImage>;
	text: string;
}

const IMAGE_TOKEN = /\[Image \d+\]/u;

/**
 * Prompt text with its pasted images' tokens standing out, so you can see
 * which ones will be sent.
 *
 * @param properties - The text and the images.
 * @param properties.images - The images pasted into the prompt.
 * @param properties.text - Part of the prompt, inside a `Text`.
 * @returns The text, with each token highlighted.
 */
export function TokenizedText({ images, text }: Readonly<TokenizedTextProperties>): ReactNode {
	const match = IMAGE_TOKEN.exec(text);
	if (match === null) return text;

	const [token] = match;
	const end = match.index + token.length;
	return (
		<>
			{text.slice(0, match.index)}
			{images.some(({ number }) => formatImageToken(number) === token) ? (
				<Text backgroundColor={theme.accent} color={theme.background}>
					{token}
				</Text>
			) : (
				token
			)}
			<TokenizedText images={images} text={text.slice(end)} />
		</>
	);
}

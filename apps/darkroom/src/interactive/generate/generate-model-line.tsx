import { Text } from "ink";

import { describeListPrice } from "$generation/observed-prices";
import { theme } from "$interactive/components/theme";
import { splitModelName } from "$interactive/models/model-facts";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { ReactNode } from "react";

import type { ModelPrices } from "$generation/observed-prices";

export interface GenerateModelLineProperties {
	model: ImageModelListItem;
	prices: ModelPrices;
}

/**
 * The model the prompt box generates with: its name in the accent, then who
 * makes it and what an image costs.
 *
 * @param properties - The model and its prices.
 * @param properties.model - What the prompt box generates with.
 * @param properties.prices - Its published and observed prices.
 * @returns One line, like `Nano Banana 2.1  Google · $0.039/img`.
 */
export function GenerateModelLine({ model, prices }: Readonly<GenerateModelLineProperties>): ReactNode {
	const { name, provider } = splitModelName(model.name);
	const details = [provider, describeListPrice(prices)].filter((part) => part !== undefined).join(" · ");

	return (
		<Text wrap="truncate-end">
			<Text bold={true} color={theme.accent}>
				{name}
			</Text>
			<Text color={theme.muted}>{`  ${details}`}</Text>
		</Text>
	);
}

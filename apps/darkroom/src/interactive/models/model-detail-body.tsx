import { Box, Text } from "ink";

import { FactColumns } from "$interactive/components/fact-columns";
import { FactLines } from "$interactive/components/fact-lines";
import { SectionHeading } from "$interactive/components/section-heading";
import { theme } from "$interactive/components/theme";

import { useModelBrowser } from "./model-browser-context";
import { ModelExampleImage } from "./model-example-image";
import { getModelOptions, getModelStats, getPriceLines, splitModelName } from "./model-facts";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { ReactNode } from "react";

export interface ModelDetailBodyProperties {
	model: ImageModelListItem;
}

const LABEL_WIDTH = 16;

/**
 * Everything about one model: an example image, its name, headline facts,
 * every price it charges, every option it takes, and its description.
 *
 * @param properties - The model to describe.
 * @param properties.model - The selected model.
 * @returns The details, top to bottom.
 */
export function ModelDetailBody({ model }: Readonly<ModelDetailBodyProperties>): ReactNode {
	const {
		meta: { getPrices },
	} = useModelBrowser();
	const modelPrices = getPrices(model);
	const { name, provider } = splitModelName(model.name);
	const options = getModelOptions(model);
	const prices = getPriceLines(modelPrices);

	return (
		<>
			<ModelExampleImage model={model} />
			<Box flexDirection="column" flexShrink={0}>
				<Text bold={true}>{name}</Text>
				<Text color={theme.muted}>{provider === undefined ? model.id : `${provider} · ${model.id}`}</Text>
			</Box>
			<FactColumns facts={getModelStats(model, modelPrices)} />
			{prices.length === 0 ? null : (
				<Box flexDirection="column" flexShrink={0}>
					<SectionHeading label="Pricing" />
					<FactLines facts={prices} labelWidth={LABEL_WIDTH} overflow="truncate-middle" />
				</Box>
			)}
			{options.length === 0 ? null : (
				<Box flexDirection="column" flexShrink={0}>
					<SectionHeading label="Options" />
					<FactLines facts={options} labelWidth={LABEL_WIDTH} overflow="wrap" />
				</Box>
			)}
			<Box flexDirection="column">
				<SectionHeading label="About" />
				<Text color={theme.muted}>{model.description}</Text>
			</Box>
		</>
	);
}

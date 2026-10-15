import { Box, Text } from "ink";

import { FactColumns } from "./fact-columns";
import { FactLines } from "./fact-lines";
import { useModelBrowser } from "./model-browser-context";
import { getModelChoices, getModelStats, getPriceLines, splitModelName } from "./model-facts";
import { SectionHeading } from "./section-heading";
import { theme } from "./theme";

import type { ReactNode } from "react";

const LABEL_WIDTH = 16;

/**
 * The right pane: the selected model's name, headline facts, every price it
 * charges, the choices it offers, and its description.
 *
 * @returns The detail pane, with a hint when nothing is selected.
 */
export function ModelDetail(): ReactNode {
	const {
		meta: { getPrices },
		state: { selected },
	} = useModelBrowser();
	if (selected === undefined) {
		return (
			<Box
				alignItems="center"
				borderColor={theme.border}
				borderStyle="round"
				flexGrow={1}
				justifyContent="center"
			>
				<Text color={theme.muted}>{"Nothing selected"}</Text>
			</Box>
		);
	}

	const modelPrices = getPrices(selected);
	const { name, provider } = splitModelName(selected.name);
	const choices = getModelChoices(selected);
	const prices = getPriceLines(modelPrices);

	return (
		<Box
			borderColor={theme.border}
			borderStyle="round"
			flexDirection="column"
			flexGrow={1}
			overflow="hidden"
			paddingX={2}
			paddingY={1}
			rowGap={1}
		>
			<Box flexDirection="column" flexShrink={0}>
				<Text bold={true}>{name}</Text>
				<Text color={theme.muted}>{provider === undefined ? selected.id : `${provider} · ${selected.id}`}</Text>
			</Box>
			<FactColumns facts={getModelStats(selected, modelPrices)} />
			{prices.length === 0 ? null : (
				<Box flexDirection="column" flexShrink={0}>
					<SectionHeading label="Pricing" />
					<FactLines facts={prices} labelWidth={LABEL_WIDTH} overflow="truncate-middle" />
				</Box>
			)}
			{choices.length === 0 ? null : (
				<Box flexDirection="column" flexShrink={0}>
					<SectionHeading label="Choices" />
					<FactLines facts={choices} labelWidth={LABEL_WIDTH} overflow="wrap" />
				</Box>
			)}
			<Box flexDirection="column">
				<SectionHeading label="About" />
				<Text color={theme.muted}>{selected.description}</Text>
			</Box>
		</Box>
	);
}

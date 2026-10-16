import { Box, Text } from "ink";

import { describeListPrice, UNKNOWN_PRICE } from "$generation/observed-prices";
import { MarqueeText } from "$interactive/components/marquee-text";
import { getRowBackground } from "$interactive/components/row-background";
import { theme } from "$interactive/components/theme";
import { useMouseTarget } from "$interactive/mouse/mouse-context";

import { useModelBrowser } from "./model-browser-context";
import { splitModelName } from "./model-facts";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { ReactNode } from "react";

import type { StyledRun } from "$interactive/components/marquee";

export interface ModelRowProperties {
	model: ImageModelListItem;
}

// Wide enough for prices like `≈ $0.0195/img` and `$30/M tok`.
const PRICE_WIDTH = 13;

function getNameRuns(model: ImageModelListItem, isSelected: boolean): Array<StyledRun> {
	const { name, provider } = splitModelName(model.name);
	const runs: Array<StyledRun> = [{ color: theme.text, isBold: isSelected, text: name }];
	if (provider !== undefined) runs.push({ color: theme.muted, text: `  ${provider}` });
	return runs;
}

/**
 * One model in the list: its name and maker, with its price at the right
 * edge. The selected model gets the accent bar and a bold name; the one
 * under the pointer is lit, and a click selects it.
 *
 * @param properties - What to list.
 * @param properties.model - The image model.
 * @returns One line.
 */
export function ModelRow({ model }: Readonly<ModelRowProperties>): ReactNode {
	const {
		actions: { selectModel },
		meta: { getPrices },
		state: { selected },
	} = useModelBrowser();
	const { attachNode, isHovered } = useMouseTarget(`model:${model.id}`, {
		onClick(): void {
			selectModel(model.id);
		},
	});
	const isSelected = model.id === selected?.id;
	const price = describeListPrice(getPrices(model));
	const nameRuns = getNameRuns(model, isSelected);

	return (
		<Box
			ref={attachNode}
			backgroundColor={getRowBackground(isSelected, isHovered)}
			columnGap={1}
			flexShrink={0}
			paddingRight={1}
		>
			<Box flexBasis={0} flexGrow={1} overflow="hidden">
				<Box flexShrink={0}>
					<Text color={theme.accent}>{isSelected ? "▌ " : "  "}</Text>
				</Box>
				<MarqueeText isScrolling={isSelected || isHovered} runs={nameRuns} />
			</Box>
			<Box flexShrink={0} justifyContent="flex-end" width={PRICE_WIDTH}>
				{/* A row must stay one line, or the list outgrows its pane. */}
				<Text dimColor={price === UNKNOWN_PRICE} wrap="truncate-start">
					{price}
				</Text>
			</Box>
		</Box>
	);
}

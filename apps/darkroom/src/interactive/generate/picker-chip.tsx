import { Box, Text } from "ink";

import { theme } from "$interactive/components/theme";
import { useMouseTarget } from "$interactive/mouse/mouse-context";

import type { ReactNode } from "react";

export interface PickerChipProperties {
	/** Whether the sort or filter is on. */
	isOn: boolean;
	label: string;
	/** Turns it on, or toggles a filter, as a click does. */
	onPress: () => void;
	/** Names its mouse target, unique in the dialog. */
	target: string;
}

function getBackground(isOn: boolean, isHovered: boolean): string {
	if (isOn) return theme.accent;
	return isHovered ? theme.hover : theme.panel;
}

/**
 * A sort or a filter in the model picker, filled with the accent while it
 * is on. Clicking it chooses the sort or toggles the filter.
 *
 * @param properties - What it is and whether it is on.
 * @param properties.isOn - Whether it is on.
 * @param properties.label - What it says.
 * @param properties.onPress - What a click does.
 * @param properties.target - Its mouse target's name.
 * @returns A chip, one line tall.
 */
export function PickerChip({ isOn, label, onPress, target }: Readonly<PickerChipProperties>): ReactNode {
	const { attachNode, isHovered } = useMouseTarget(target, { onClick: onPress });

	return (
		<Box ref={attachNode} backgroundColor={getBackground(isOn, isHovered)} paddingX={1}>
			<Text color={isOn ? theme.background : theme.text}>{label}</Text>
		</Box>
	);
}

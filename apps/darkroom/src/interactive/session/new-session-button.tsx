import { Box, Text } from "ink";

import { theme } from "$interactive/components/theme";
import { useMouseTarget } from "$interactive/mouse/mouse-context";

import type { ReactNode } from "react";

export interface NewSessionButtonProperties {
	/** Opens a new session, as `ctrl+n` does. */
	onPress: () => void;
}

/**
 * The `+` after the tabs, which opens a new session when clicked.
 *
 * @param properties - What a click does.
 * @param properties.onPress - Opens a new session.
 * @returns Three columns.
 */
export function NewSessionButton({ onPress }: Readonly<NewSessionButtonProperties>): ReactNode {
	const { attachNode, isHovered } = useMouseTarget("session-tab:new", { onClick: onPress });

	return (
		<Box ref={attachNode} backgroundColor={isHovered ? theme.hover : theme.background} paddingX={1}>
			<Text color={isHovered ? theme.accent : theme.muted}>{"+"}</Text>
		</Box>
	);
}

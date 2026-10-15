import { cwd } from "node:process";
import { Box, Text } from "ink";

import { toDisplayPath } from "$generation/format-result";
import { theme } from "$interactive/components/theme";
import { useMouseTarget } from "$interactive/mouse/mouse-context";

import { useSession } from "./session-context";
import { getEditBase } from "./session-state";

import type { ReactNode } from "react";

export interface TurnPathLineProperties {
	mediaType: string;
	/** Where the image was saved. */
	path: string;
}

function getColor(isBase: boolean, isHovered: boolean): string {
	if (isBase) return theme.accent;
	return isHovered ? theme.text : theme.muted;
}

/**
 * Where one of a turn's images was saved, relative to the working
 * directory when inside it. A `◧` marks the image the next prompt edits;
 * clicking a path makes its image that one.
 *
 * @param properties - The image.
 * @param properties.mediaType - Its media type.
 * @param properties.path - Where it was saved.
 * @returns One line.
 */
export function TurnPathLine({ mediaType, path }: Readonly<TurnPathLineProperties>): ReactNode {
	const { actions, state } = useSession();
	const isBase = getEditBase(state)?.path === path;
	const { attachNode, isHovered } = useMouseTarget(`turn-path:${path}`, {
		onClick(): void {
			actions.chooseBase({ mediaType, path });
		},
	});

	return (
		<Box ref={attachNode}>
			<Text color={getColor(isBase, isHovered)} wrap="truncate-middle">
				{`${isBase ? "◧" : " "} ${toDisplayPath(path, cwd())}`}
			</Text>
		</Box>
	);
}

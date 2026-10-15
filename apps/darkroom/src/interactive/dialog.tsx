import { Box, Text } from "ink";

import { KeyHints } from "./key-hints";
import { theme } from "./theme";

import type { ReactNode } from "react";

import type { KeyHint } from "./key-hints";

export interface DialogProperties {
	/** The screen's size, so the dialog can center itself over it. */
	columns: number;
	/** The keys the dialog answers to, shown under the body. */
	hints: ReadonlyArray<KeyHint>;
	rows: number;
	title: string;
	/** The widest the dialog may be; narrow screens get less. */
	width: number;
	children: ReactNode;
}

/**
 * A raised box centered over the screen, with a title, a body, and the keys
 * it answers to. Esc closes every dialog, so the title row says so.
 *
 * @param properties - What the dialog says and how big the screen is.
 * @param properties.columns - The screen's width.
 * @param properties.hints - The keys the dialog answers to.
 * @param properties.rows - The screen's height.
 * @param properties.title - The dialog's name.
 * @param properties.width - The widest the dialog may be.
 * @param properties.children - The body.
 * @returns An overlay the size of the screen, with the dialog in its middle.
 */
export function Dialog({ columns, hints, rows, title, width, children }: Readonly<DialogProperties>): ReactNode {
	return (
		<Box
			alignItems="center"
			height={rows}
			justifyContent="center"
			left={0}
			position="absolute"
			top={0}
			width={columns}
		>
			<Box backgroundColor={theme.element} flexDirection="column" width={Math.min(width, columns - 4)}>
				<Box justifyContent="space-between" paddingX={2} paddingY={1}>
					<Text bold={true}>{title}</Text>
					<Text color={theme.muted}>{"esc"}</Text>
				</Box>
				<Box flexDirection="column" paddingX={2}>
					{children}
				</Box>
				<Box paddingX={2} paddingY={1}>
					<KeyHints hints={hints} />
				</Box>
			</Box>
		</Box>
	);
}

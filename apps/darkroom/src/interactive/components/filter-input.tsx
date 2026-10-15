import { TextInput } from "@inkjs/ui";
import { Box, Text } from "ink";

import { theme } from "./theme";

import type { ReactNode } from "react";

export interface FilterInputProperties {
	/** The filter when the input opens. */
	initialValue: string;
	onChange: (text: string) => void;
	onSubmit: () => void;
	/** Says what the filter matches, like `filter by prompt or model`. */
	placeholder: string;
}

/**
 * A footer text input that filters as you type. Enter keeps the filter; the
 * browser's own key handler clears it on Esc.
 *
 * @param properties - The input's text and callbacks.
 * @param properties.initialValue - The filter when the input opens.
 * @param properties.placeholder - Says what the filter matches.
 * @param properties.onChange - Receives the text after each key.
 * @param properties.onSubmit - Called on Enter.
 * @returns The input, with its keys hinted beside it.
 */
export function FilterInput({
	initialValue,
	onChange,
	onSubmit,
	placeholder,
}: Readonly<FilterInputProperties>): ReactNode {
	return (
		<Box columnGap={3}>
			<Box>
				<Text bold={true} color={theme.accent}>
					{"/ "}
				</Text>
				<TextInput
					defaultValue={initialValue}
					placeholder={placeholder}
					onChange={onChange}
					onSubmit={onSubmit}
				/>
			</Box>
			<Text color={theme.muted}>{"⏎ keep · esc clear"}</Text>
		</Box>
	);
}

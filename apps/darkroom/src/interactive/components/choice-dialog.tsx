import { useState } from "react";
import { Box, useInput } from "ink";

import { ChoiceRow } from "./choice-row";
import { Dialog } from "./dialog";

import type { ReactNode } from "react";

import type { KeyHint } from "./key-hints";

export interface ChoiceDialogProperties {
	/** The answers, the first selected to begin with. */
	choices: ReadonlyArray<string>;
	columns: number;
	/** Takes the answer, by its index; Esc picks the last. */
	onChoose: (index: number) => void;
	rows: number;
	title: string;
	/** The widest the dialog may be. */
	width: number;
	/** What the question is about, above the answers. */
	children: ReactNode;
}

const HINTS: ReadonlyArray<KeyHint> = [
	["↑↓", "choose"],
	["⏎", "answer"],
	["esc", "no"],
];

/**
 * Asks a question with numbered answers, as Claude Code does: ↑↓ and Enter
 * pick one, so does its number or a click, and Esc or a click outside
 * picks the last, which should be the answer that changes nothing.
 *
 * @param properties - The question and its answers.
 * @param properties.choices - The answers.
 * @param properties.columns - The screen's width.
 * @param properties.onChoose - Takes the answer's index.
 * @param properties.rows - The screen's height.
 * @param properties.title - The question.
 * @param properties.width - The widest the dialog may be.
 * @param properties.children - What it is about.
 * @returns The question as a dialog.
 */
export function ChoiceDialog({
	choices,
	columns,
	onChoose,
	rows,
	title,
	width,
	children,
}: Readonly<ChoiceDialogProperties>): ReactNode {
	const [cursor, setCursor] = useState(0);
	const last = choices.length - 1;

	function handleDismiss(): void {
		onChoose(last);
	}

	useInput(function onChoiceInput(input, key) {
		const number = Math.trunc(Number(input));
		if (key.escape) onChoose(last);
		else if (key.return) onChoose(cursor);
		else if (key.upArrow) setCursor(Math.max(0, cursor - 1));
		else if (key.downArrow) setCursor(Math.min(last, cursor + 1));
		else if (number >= 1 && number <= choices.length) onChoose(number - 1);
	});

	return (
		<Dialog columns={columns} hints={HINTS} rows={rows} title={title} width={width} onDismiss={handleDismiss}>
			{children}
			<Box flexDirection="column" marginTop={1}>
				{choices.map((label, index) => (
					<ChoiceRow
						key={label}
						isSelected={index === cursor}
						label={label}
						position={index + 1}
						onChoose={(): void => {
							onChoose(index);
						}}
					/>
				))}
			</Box>
		</Dialog>
	);
}

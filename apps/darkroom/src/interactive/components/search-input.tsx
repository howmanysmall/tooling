import { useEffect, useReducer, useRef } from "react";
import { useInput } from "ink";

import { getSingleLineAction, reducePromptEditor } from "$interactive/generate/prompt-editor-state";
import { PromptText } from "$interactive/generate/prompt-text";

import type { ReactNode } from "react";

export interface SearchInputProperties {
	/** The text when the input opens. */
	initialValue?: string | undefined;
	onChange: (text: string) => void;
	onSubmit: () => void;
	/** Shown, muted, while the input is empty. */
	placeholder: string;
}

/**
 * A one-line text input that edits like the prompt box, so `alt+backspace`,
 * `ctrl+w`, and `ctrl+u` work in every search too. ↑↓ and Esc are left to the
 * list it searches.
 *
 * @param properties - The input's text and callbacks.
 * @param properties.initialValue - The text when the input opens.
 * @param properties.onChange - Receives the text whenever it changes.
 * @param properties.onSubmit - Called on Enter.
 * @param properties.placeholder - Shown while the input is empty.
 * @returns The input's text, with its cursor.
 */
export function SearchInput({
	initialValue = "",
	onChange,
	onSubmit,
	placeholder,
}: Readonly<SearchInputProperties>): ReactNode {
	const [editor, dispatch] = useReducer(reducePromptEditor, { cursor: initialValue.length, text: initialValue });
	const reported = useRef(initialValue);

	useEffect(() => {
		if (reported.current !== editor.text) {
			reported.current = editor.text;
			onChange(editor.text);
		}
	}, [editor.text, onChange]);

	useInput(function onSearchInput(input, key) {
		if (key.return) {
			onSubmit();
			return;
		}

		const action = getSingleLineAction(input, key);
		if (action !== undefined) {
			dispatch(action);
		}
	});

	return <PromptText editor={editor} placeholder={placeholder} />;
}

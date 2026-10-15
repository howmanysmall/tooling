// Control characters other than newline and tab. Terminal prompts can leave
// them in typed text (Ctrl-A and Ctrl-E arrive as \x01 and \x05), and printed
// back they move the cursor and garble the screen.
const CONTROL_CHARACTERS = /[^\P{Cc}\n\t]/gu;

/**
 * Removes control characters, keeping newlines and tabs.
 *
 * @param text - Text that may hold stray control characters.
 * @returns The text without them.
 */
export function removeControlCharacters(text: string): string {
	return text.replaceAll(CONTROL_CHARACTERS, "");
}

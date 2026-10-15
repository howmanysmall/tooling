import { useState } from "react";
import { Box, useInput } from "ink";

import { findCommand } from "./browser-command";
import { getBrowserKey } from "./browser-keys";
import { CommandPalette } from "./command-palette";
import { HelpDialog } from "./help-dialog";
import { theme } from "./theme";
import { Toast } from "./toast";

import type { Key } from "ink";
import type { ReactNode } from "react";

import type { BrowserCommand } from "./browser-command";
import type { StatusMessage } from "./status-message";

const enum Overlay {
	Help = "help",
	None = "none",
	Palette = "palette",
}

export interface BrowserShellProperties {
	/**
	 * Takes every key while the screen asks for text or an answer, such as
	 * its filter or a confirmation; the shell's own keys are off meanwhile.
	 */
	capture?: ((input: string, key: Key) => void) | undefined;
	columns: number;
	/** What the screen can do; their keys work whenever nothing is captured. */
	commands: ReadonlyArray<BrowserCommand>;
	rows: number;
	/** The last action's outcome, shown as a toast. */
	status?: StatusMessage | undefined;
	children: ReactNode;
}

/**
 * The frame every full-screen browser shares: the background, the toast,
 * the `?` help and `ctrl+p` command palette, and the key bindings, all
 * driven by the screen's command table.
 *
 * @param properties - The screen's commands, size, and parts.
 * @param properties.capture - Takes every key while the screen needs them.
 * @param properties.columns - The terminal's width.
 * @param properties.commands - What the screen can do.
 * @param properties.rows - The terminal's height.
 * @param properties.status - The last action's outcome, if any.
 * @param properties.children - The header, panes, status bar, and any
 *   dialog of the screen's own.
 * @returns A box the size of the terminal.
 */
export function BrowserShell({
	capture,
	columns,
	commands,
	rows,
	status,
	children,
}: Readonly<BrowserShellProperties>): ReactNode {
	const [overlay, setOverlay] = useState(Overlay.None);

	function closeOverlay(): void {
		setOverlay(Overlay.None);
	}

	useInput(function onShellInput(input, key) {
		// The palette reads its own keys; any key closes help.
		if (overlay === Overlay.Palette) return;
		if (overlay === Overlay.Help) {
			closeOverlay();
			return;
		}

		if (capture !== undefined) capture(input, key);
		else if (input === "p" && key.ctrl) setOverlay(Overlay.Palette);
		else if (input === "?") setOverlay(Overlay.Help);
		else findCommand(commands, getBrowserKey(input, key))?.run();
	});

	return (
		<Box backgroundColor={theme.background} flexDirection="column" height={rows} width={columns}>
			{children}
			{status === undefined ? null : <Toast status={status} />}
			{overlay === Overlay.Help ? <HelpDialog columns={columns} commands={commands} rows={rows} /> : null}
			{overlay === Overlay.Palette ? (
				<CommandPalette columns={columns} commands={commands} rows={rows} onClose={closeOverlay} />
			) : null}
		</Box>
	);
}

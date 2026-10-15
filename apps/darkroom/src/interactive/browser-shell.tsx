import { useState } from "react";
import { Box, useApp, useInput } from "ink";

import { useAppTabs } from "./app-tabs-context";
import { findCommand } from "./browser-command";
import { getBrowserKey } from "./browser-keys";
import { CommandPalette } from "./command-palette";
import { HelpDialog } from "./help-dialog";
import { pickNewerMessage, useNotice } from "./notice-store";
import { getShellCommands } from "./shell-commands";
import { getShellRoute, ShellRoute } from "./shell-route";
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
	/** A dialog of the screen's own is open and reads every key itself. */
	hasDialog?: boolean | undefined;
	/** What `ctrl+c` does, such as clearing the prompt; quits by default. */
	onInterrupt?: (() => void) | undefined;
	rows: number;
	/** The last action's outcome, shown as a toast. */
	status?: StatusMessage | undefined;
	children: ReactNode;
}

/**
 * The frame every full-screen screen shares: the background, the toast, the
 * help and `ctrl+p` command palette, switching tabs, and the key bindings,
 * all driven by the screen's command table.
 *
 * `tab` and `ctrl+p` work even while the screen captures keys, so the
 * prompt box can't trap you; a dialog of the screen's own takes everything.
 *
 * @param properties - The screen's commands, size, and parts.
 * @param properties.capture - Takes every key while the screen needs them.
 * @param properties.columns - The terminal's width.
 * @param properties.commands - What the screen can do.
 * @param properties.hasDialog - Whether a dialog of the screen's own is open.
 * @param properties.onInterrupt - What `ctrl+c` does; quits by default.
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
	hasDialog,
	onInterrupt,
	rows,
	status,
	children,
}: Readonly<BrowserShellProperties>): ReactNode {
	const [overlay, setOverlay] = useState(Overlay.None);
	const notice = useNotice();
	const toast = pickNewerMessage(status, notice);
	const tabs = useAppTabs();
	const { exit } = useApp();
	function showOverlay(next: Overlay): () => void {
		return () => {
			setOverlay(next);
		};
	}

	const closeOverlay = showOverlay(Overlay.None);
	const allCommands = getShellCommands(commands, {
		isTyping: capture !== undefined,
		showKeys: showOverlay(Overlay.Help),
		tabs,
	});

	useInput(function onShellInput(input, key) {
		const route = getShellRoute(input, key, {
			hasDialog: overlay === Overlay.Palette || hasDialog === true,
			hasTabs: tabs !== undefined,
			isCapturing: capture !== undefined,
			isHelpOpen: overlay === Overlay.Help,
		});
		const handlers: Readonly<Record<ShellRoute, () => void>> = {
			[ShellRoute.Capture](): void {
				capture?.(input, key);
			},
			[ShellRoute.CloseHelp]: closeOverlay,
			[ShellRoute.Command](): void {
				findCommand(allCommands, getBrowserKey(input, key))?.run();
			},
			[ShellRoute.Ignore](): void {
				// A dialog has the key.
			},
			[ShellRoute.Interrupt](): void {
				if (onInterrupt === undefined) exit();
				else onInterrupt();
			},
			[ShellRoute.NextTab](): void {
				tabs?.cycle(1);
			},
			[ShellRoute.OpenHelp]: showOverlay(Overlay.Help),
			[ShellRoute.OpenPalette]: showOverlay(Overlay.Palette),
			[ShellRoute.PreviousTab](): void {
				tabs?.cycle(-1);
			},
		};
		handlers[route]();
	});

	return (
		<Box backgroundColor={theme.background} flexDirection="column" height={rows} width={columns}>
			{children}
			{toast === undefined ? null : <Toast status={toast} />}
			{overlay === Overlay.Help ? (
				<HelpDialog columns={columns} commands={allCommands} rows={rows} onClose={closeOverlay} />
			) : null}
			{overlay === Overlay.Palette ? (
				<CommandPalette columns={columns} commands={allCommands} rows={rows} onClose={closeOverlay} />
			) : null}
		</Box>
	);
}

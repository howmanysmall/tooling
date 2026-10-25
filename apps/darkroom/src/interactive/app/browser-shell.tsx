import { useState } from "react";
import { Box, useApp, useInput } from "ink";

import { pickNewerMessage, useNotice } from "$interactive/components/notice-store";
import { theme } from "$interactive/components/theme";
import { Toast } from "$interactive/components/toast";
import { findCommand } from "$interactive/keys/browser-command";
import { getBrowserKey } from "$interactive/keys/browser-keys";
import { CommandPalette } from "$interactive/palette/command-palette";
import { HelpDialog } from "$interactive/palette/help-dialog";

import { useAppTabs } from "./app-tabs-context";
import { ShellActionsContext } from "./shell-actions-context";
import { getShellCommands } from "./shell-commands";
import { getShellRoute, ShellRoute } from "./shell-route";

import type { Key } from "ink";
import type { ReactNode } from "react";

import type { StatusMessage } from "$interactive/components/status-message";
import type { BrowserCommand } from "$interactive/keys/browser-command";

import type { ShellActions } from "./shell-actions-context";

const enum Overlay {
	/** Actions for something clicked, like an image. */
	Actions = "actions",
	Help = "help",
	None = "none",
	Palette = "palette",
}

type ShellOverlay =
	| { readonly commands: ReadonlyArray<BrowserCommand>; readonly kind: Overlay.Actions; readonly title: string }
	| { readonly kind: Exclude<Overlay, Overlay.Actions> };

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
	/** What `shift+tab` does instead of showing the previous tab. */
	onShiftTab?: (() => void) | undefined;
	rows: number;
	/** The last action's outcome, shown as a toast. */
	status?: StatusMessage | undefined;
	children: ReactNode;
}

function createShellActions(setOverlay: (overlay: ShellOverlay) => void): ShellActions {
	return {
		showActions(title, commands): void {
			setOverlay({ commands, kind: Overlay.Actions, title });
		},
	};
}

/**
 * The frame every full-screen screen shares: the background, the toast, the
 * help and `ctrl+p` command palette, the actions for anything clicked,
 * switching tabs, and the key bindings, all driven by the screen's command
 * table.
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
 * @param properties.onShiftTab - What `shift+tab` does, if not the previous tab.
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
	onShiftTab,
	rows,
	status,
	children,
}: Readonly<BrowserShellProperties>): ReactNode {
	const [overlay, setOverlay] = useState<ShellOverlay>({ kind: Overlay.None });
	const notice = useNotice();
	const toast = pickNewerMessage(status, notice);
	const tabs = useAppTabs();
	const { exit } = useApp();

	function showOverlay(kind: Exclude<Overlay, Overlay.Actions>): () => void {
		return () => {
			setOverlay({ kind });
		};
	}

	const shellActions = createShellActions(setOverlay);

	const closeOverlay = showOverlay(Overlay.None);
	const allCommands = getShellCommands(commands, {
		isTyping: capture !== undefined,
		showKeys: showOverlay(Overlay.Help),
		tabs,
	});

	useInput(function onShellInput(input, key) {
		const route = getShellRoute(input, key, {
			hasDialog: overlay.kind === Overlay.Palette || overlay.kind === Overlay.Actions || hasDialog === true,
			hasShiftTab: onShiftTab !== undefined,
			hasTabs: tabs !== undefined,
			isCapturing: capture !== undefined,
			isHelpOpen: overlay.kind === Overlay.Help,
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
				if (onInterrupt === undefined) {
					exit();
				} else {
					onInterrupt();
				}
			},
			[ShellRoute.NextTab](): void {
				tabs?.cycle(1);
			},
			[ShellRoute.OpenHelp]: showOverlay(Overlay.Help),
			[ShellRoute.OpenPalette]: showOverlay(Overlay.Palette),
			[ShellRoute.PreviousTab](): void {
				tabs?.cycle(-1);
			},
			[ShellRoute.ShiftTab](): void {
				onShiftTab?.();
			},
		};

		handlers[route]();
	});

	return (
		<Box backgroundColor={theme.background} flexDirection="column" height={rows} width={columns}>
			<ShellActionsContext value={shellActions}>{children}</ShellActionsContext>
			{toast === undefined ? null : <Toast status={toast} />}
			{overlay.kind === Overlay.Help ? (
				<HelpDialog columns={columns} commands={allCommands} rows={rows} onClose={closeOverlay} />
			) : null}
			{overlay.kind === Overlay.Actions ? (
				<CommandPalette
					columns={columns}
					commands={overlay.commands}
					rows={rows}
					title={overlay.title}
					onClose={closeOverlay}
				/>
			) : null}
			{overlay.kind === Overlay.Palette ? (
				<CommandPalette
					columns={columns}
					commands={allCommands}
					rows={rows}
					title="Commands"
					onClose={closeOverlay}
				/>
			) : null}
		</Box>
	);
}

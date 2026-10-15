import { Box, Text, useWindowSize } from "ink";

import { ScreenHeader } from "$interactive/components/screen-header";
import { StatusBar } from "$interactive/components/status-bar";
import { theme } from "$interactive/components/theme";

import { BrowserShell } from "./browser-shell";

import type { ReactNode } from "react";

import type { BrowserCommand } from "$interactive/keys/browser-command";

export interface CatalogNoticeProperties {
	/** Whether the models failed to load, rather than still loading. */
	isError: boolean;
	message: string;
	/** The tab it stands in for, like `models`. */
	title: string;
}

const NO_COMMANDS: ReadonlyArray<BrowserCommand> = [];

/**
 * Stands in for a tab that needs the models while they load, or says why
 * they couldn't. Tabs and the palette still work around it.
 *
 * @param properties - What to say.
 * @param properties.isError - Whether loading failed.
 * @param properties.message - That they're loading, or why they failed.
 * @param properties.title - The tab it stands in for.
 * @returns The whole screen, sized to the terminal.
 */
export function CatalogNotice({ isError, message, title }: Readonly<CatalogNoticeProperties>): ReactNode {
	const { columns, rows } = useWindowSize();

	return (
		<BrowserShell columns={columns} commands={NO_COMMANDS} rows={rows}>
			<ScreenHeader title={title} />
			<Box alignItems="center" flexDirection="column" flexGrow={1} justifyContent="center" paddingX={4}>
				<Text color={isError ? theme.danger : theme.muted}>{message}</Text>
			</Box>
			<StatusBar commands={NO_COMMANDS} summary="" />
		</BrowserShell>
	);
}

import { Box, Text } from "ink";

import { APP_TABS } from "./app-tab";
import { useAppTabs } from "./app-tabs-context";
import { HeaderTab } from "./header-tab";
import { theme } from "./theme";

import type { ReactNode } from "react";

export interface ScreenHeaderProperties {
	/** What the screen shows, like `history`. */
	title: string;
}

/**
 * A full-screen screen's top line: the brand, then the app's tabs with the
 * current one raised. A screen shown on its own gets just its name.
 *
 * @param properties - The screen's name.
 * @param properties.title - What the screen shows, like `history`.
 * @returns One line.
 */
export function ScreenHeader({ title }: Readonly<ScreenHeaderProperties>): ReactNode {
	const tabs = useAppTabs();

	return (
		<Box columnGap={2} flexShrink={0} paddingX={2}>
			<Text bold={true} color={theme.accent}>
				{"◐ darkroom"}
			</Text>
			{tabs === undefined ? (
				<HeaderTab isActive={true} title={title} />
			) : (
				<Box>
					{APP_TABS.map((tab, index) => (
						<HeaderTab
							key={tab}
							isActive={tab === tabs.active}
							keyLabel={String(index + 1)}
							title={tab}
							onSelect={(): void => {
								tabs.select(tab);
							}}
						/>
					))}
				</Box>
			)}
		</Box>
	);
}

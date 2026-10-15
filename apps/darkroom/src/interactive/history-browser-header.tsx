import { ScreenHeader } from "./screen-header";

import type { ReactNode } from "react";

/**
 * The top line: the brand and the screen's name.
 *
 * @returns `◐ darkroom history`.
 */
export function HistoryBrowserHeader(): ReactNode {
	return <ScreenHeader title="history" />;
}

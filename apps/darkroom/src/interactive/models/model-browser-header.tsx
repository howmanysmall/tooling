import { ScreenHeader } from "$interactive/components/screen-header";

import type { ReactNode } from "react";

/**
 * The top line: the brand and the screen's name.
 *
 * @returns `◐ darkroom models`.
 */
export function ModelBrowserHeader(): ReactNode {
	return <ScreenHeader title="models" />;
}

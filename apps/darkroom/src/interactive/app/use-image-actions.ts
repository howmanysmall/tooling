import { use } from "react";
import { useStdout } from "ink";

import { openFilesAsync } from "$history/open-files";
import { getImageFileCommands } from "$interactive/components/image-commands";
import { NoticeContext } from "$interactive/components/notice-store";
import { copyImageAsync } from "$utilities/copy-image";

import { useShellActions } from "./shell-actions-context";

import type { ImageCommandEnvironment } from "$interactive/components/image-commands";
import type { BrowserCommand } from "$interactive/keys/browser-command";

/**
 * Opens the actions for an image file: copy it, open it, or copy its path,
 * then whatever else the screen offers for it.
 *
 * @param path - The image's absolute path.
 * @param extra - The screen's own actions for it, listed after those.
 */
export type ShowImageActions = (path: string, extra?: ReadonlyArray<BrowserCommand>) => void;

function ignore(): void {
	// No toast outside the app.
}

/**
 * Lets any image on screen open its actions when clicked, as the images in
 * a session do. Results show as an app-wide toast.
 *
 * @returns Opens the actions for an image.
 */
export function useImageActions(): ShowImageActions {
	const shell = useShellActions();
	const notices = use(NoticeContext);
	const { write } = useStdout();
	const environment: ImageCommandEnvironment = {
		copyImageAsync,
		openImagesAsync: openFilesAsync,
		reportError: notices?.reporter.reportError ?? ignore,
		reportSuccess: notices?.reporter.reportSuccess ?? ignore,
		write,
	};

	return (path, extra = []) => {
		shell?.showActions("Image", [...getImageFileCommands(path, environment), ...extra]);
	};
}

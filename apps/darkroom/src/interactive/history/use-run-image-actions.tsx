import { useImageActions } from "$interactive/app/use-image-actions";
import { CommandGroup } from "$interactive/keys/browser-command";
import { BrowserKey } from "$interactive/keys/browser-keys";

import { useHistoryBrowser } from "./history-browser-context";

import type { BrowserCommand } from "$interactive/keys/browser-command";

const group = CommandGroup.Act;

/**
 * Lets an image of the selected run open its actions when clicked: copy,
 * open, or copy its path, then re-run the run or delete it, which asks
 * first.
 *
 * @returns Opens the actions for one of the selected run's images.
 */
export function useRunImageActions(): (path: string) => void {
	const showImage = useImageActions();
	const { actions } = useHistoryBrowser();
	const runCommands: ReadonlyArray<BrowserCommand> = [
		{
			key: BrowserKey.Rerun,
			description: "asks before spending",
			group,
			keyLabel: "r",
			run: actions.rerunSelected,
			title: "Re-run",
		},
		{
			key: BrowserKey.Delete,
			description: "asks first",
			group,
			keyLabel: "d",
			run: actions.askDelete,
			title: "Delete run",
		},
	];

	return (path) => {
		showImage(path, runCommands);
	};
}

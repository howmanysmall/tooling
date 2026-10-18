import type { RunDeletion } from "$history/delete-run";
import type { HistoryEntry } from "$history/history-entry";
import type { CellBox } from "$preview/cell-fit";
import type { LoadingPreview } from "$preview/load-preview";

/**
 * What the browser needs from outside: the history store, the viewer, and
 * previews.
 */
export interface BrowserServices {
	/** Removes a run and its stored files, and its saved images when asked. */
	readonly deleteRunAsync: (entry: HistoryEntry, deletion: RunDeletion) => Promise<void>;
	/** Loads an image preview, or `undefined` when previews are off. */
	readonly getPreview: (path: string, box: CellBox) => LoadingPreview | undefined;
	/** Opens a run's images in the system viewer. */
	readonly openRunAsync: (entry: HistoryEntry) => Promise<void>;
	/** Remembers the run to repeat once the browser has closed. */
	readonly requestRerun: (entry: HistoryEntry) => void;
	/** Turns a stored path into an absolute one. */
	readonly resolve: (stored: string) => string;
}

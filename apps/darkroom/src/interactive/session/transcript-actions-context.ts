import { createContext, use } from "react";

import type { BaseImage, SessionTurn } from "./session-state";

/** What clicking the transcript does: opens the actions for what you hit. */
export interface TranscriptActions {
	/** Offers what to do with an image: edit, copy, open, or copy its path. */
	readonly showImage: (image: BaseImage) => void;
	/** Offers what to do with a prompt: rewind, fork, use again, or copy. */
	readonly showPrompt: (turn: SessionTurn) => void;
}

/** Set by the generate screen; a transcript shown on its own does nothing. */
export const TranscriptActionsContext = createContext<TranscriptActions | undefined>(undefined);
TranscriptActionsContext.displayName = "TranscriptActionsContext";

/**
 * Reads what clicking the transcript does.
 *
 * @returns The actions, or `undefined` outside the generate screen.
 */
export function useTranscriptActions(): TranscriptActions | undefined {
	return use(TranscriptActionsContext);
}

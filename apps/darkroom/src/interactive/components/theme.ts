/**
 * The browsers' colors. A darkroom's safelight is a warm amber-red, so that
 * is the accent; the surfaces are near-black layers so the images stand out.
 * Ink downsamples these on terminals without truecolor.
 */
export const theme = {
	/** The selection bar, the brand, and key caps. */
	accent: "#ff8a5c",
	/** The screen behind everything. */
	background: "#0f0f11",
	/** Rules and quiet dividers. */
	border: "#3d3a39",
	danger: "#f7768e",
	/** Raised surfaces: the selected row, dialogs, and toasts. */
	element: "#26252a",
	/** A row under the mouse pointer, between the panel and the selection. */
	hover: "#201f24",
	/** Secondary text: metadata, labels, and hints. */
	muted: "#8a8580",
	/** The list and detail panes. */
	panel: "#18171b",
	/** Text being selected with the mouse; the safelight, dimmed. */
	selection: "#5c3a2e",
	success: "#9ece6a",
	/** Primary text, a warm off-white. */
	text: "#e8e4df",
	warning: "#e0af68",
} as const;

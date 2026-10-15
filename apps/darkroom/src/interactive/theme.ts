/**
 * The history browser's colours. A darkroom's safelight is a warm amber-red,
 * so that is the accent; everything else stays quiet so the images stand out.
 * Ink downsamples these on terminals without truecolor.
 */
export const theme = {
	/** The selection bar, the brand, and key caps. */
	accent: "#ff8a5c",
	/** Pane borders. */
	border: "#3d3a39",
	danger: "#f7768e",
	/** Secondary text: metadata, labels, and hints. */
	muted: "#8a8580",
	success: "#9ece6a",
	warning: "#e0af68",
} as const;

export const enum ImageProtocol {
	/** Truecolor half blocks: two pixels per cell, works in most terminals. */
	Blocks = "blocks",
	/** The kitty graphics protocol with Unicode placeholders: the real image. */
	Kitty = "kitty",
	Off = "off",
}

export interface TerminalEnvironment {
	readonly COLORTERM?: string | undefined;
	/** `kitty`, `blocks`, or `off`, to override the detection. */
	readonly DARKROOM_PREVIEW?: "blocks" | "kitty" | "off" | undefined;
	readonly KITTY_WINDOW_ID?: string | undefined;
	readonly TERM?: string | undefined;
	readonly TERM_PROGRAM?: string | undefined;
	readonly TMUX?: string | undefined;
}

const OVERRIDES: ReadonlyMap<string, ImageProtocol> = new Map([
	["blocks", ImageProtocol.Blocks],
	["kitty", ImageProtocol.Kitty],
	["off", ImageProtocol.Off],
]);

const KITTY_TERMINAL_REGEXP = /kitty|ghostty/iu;
const TRUECOLOR_REGEXP = /^(?:truecolor|24bit)$/iu;

function isKittyTerminal({ KITTY_WINDOW_ID, TERM, TERM_PROGRAM }: TerminalEnvironment): boolean {
	return KITTY_WINDOW_ID !== undefined || KITTY_TERMINAL_REGEXP.test(`${TERM ?? ""} ${TERM_PROGRAM ?? ""}`);
}

/**
 * Picks how the history browser draws image previews. Kitty placeholders are
 * plain text cells, so they survive Ink's redraws; tmux only forwards the
 * image data with `allow-passthrough`, so it gets half blocks unless
 * `DARKROOM_PREVIEW=kitty` says otherwise.
 *
 * @param environment - The terminal's environment variables.
 * @returns The protocol to draw previews with.
 */
export function getImageProtocol(environment: TerminalEnvironment): ImageProtocol {
	const override = OVERRIDES.get(environment.DARKROOM_PREVIEW ?? "");
	if (override !== undefined) return override;
	if (environment.TMUX === undefined && isKittyTerminal(environment)) return ImageProtocol.Kitty;
	return TRUECOLOR_REGEXP.test(environment.COLORTERM ?? "") ? ImageProtocol.Blocks : ImageProtocol.Off;
}

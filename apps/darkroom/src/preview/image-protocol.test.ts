import { describe, it } from "vitest";

import { getImageProtocol, ImageProtocol } from "./image-protocol";

describe("getImageProtocol", () => {
	it("draws real images in Ghostty and kitty", ({ expect }) => {
		expect.assertions(2);

		expect(getImageProtocol({ TERM: "xterm-ghostty", TERM_PROGRAM: "ghostty" })).toBe(ImageProtocol.Kitty);
		expect(getImageProtocol({ KITTY_WINDOW_ID: "1", TERM: "xterm-256color" })).toBe(ImageProtocol.Kitty);
	});

	it("falls back to half blocks inside tmux and in other truecolor terminals", ({ expect }) => {
		expect.assertions(2);

		expect(getImageProtocol({ COLORTERM: "truecolor", TERM: "xterm-ghostty", TMUX: "/tmp/tmux" })).toBe(
			ImageProtocol.Blocks,
		);
		expect(getImageProtocol({ COLORTERM: "24bit", TERM_PROGRAM: "Apple_Terminal" })).toBe(ImageProtocol.Blocks);
	});

	it("turns previews off without truecolor, and obeys DARKROOM_PREVIEW", ({ expect }) => {
		expect.assertions(2);

		expect(getImageProtocol({ TERM: "xterm-256color" })).toBe(ImageProtocol.Off);
		expect(getImageProtocol({ DARKROOM_PREVIEW: "kitty", TMUX: "/tmp/tmux" })).toBe(ImageProtocol.Kitty);
	});
});

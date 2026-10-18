import { describe, it } from "vitest";

import { getClipboardCommand } from "./copy-image";

describe("getClipboardCommand", () => {
	it("copies through AppleScript on macOS, quoting the path", ({ expect }) => {
		expect.assertions(1);

		expect(getClipboardCommand('/tmp/a "cat".png', "darwin", false)).toStrictEqual({
			command: "osascript",
			parameters: [
				"-e",
				String.raw`set the clipboard to (read (POSIX file "/tmp/a \"cat\".png") as «class PNGf»)`,
			],
		});
	});

	it("uses wl-copy under Wayland and xclip otherwise on Linux", ({ expect }) => {
		expect.assertions(2);

		expect(getClipboardCommand("/tmp/a.png", "linux", true).parameters).toStrictEqual([
			"-c",
			'wl-copy --type image/png < "$1"',
			"sh",
			"/tmp/a.png",
		]);
		expect(getClipboardCommand("/tmp/a.png", "linux", false).command).toBe("xclip");
	});
});

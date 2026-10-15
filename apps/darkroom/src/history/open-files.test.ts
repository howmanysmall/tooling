import { describe, it } from "vitest";

import { getOpenCommands } from "./open-files.ts";

describe("getOpenCommands", () => {
	it("opens everything at once on macOS and one file per process elsewhere", ({ expect }) => {
		expect.assertions(3);

		const paths = ["/a.png", "/b.png"];

		expect(getOpenCommands(paths, "darwin")).toStrictEqual([{ arguments_: paths, command: "open" }]);
		expect(getOpenCommands(paths, "linux")).toHaveLength(2);
		expect(getOpenCommands(["/a.png"], "win32")).toStrictEqual([
			{ arguments_: ["/c", "start", '""', "/a.png"], command: "cmd" },
		]);
	});
});

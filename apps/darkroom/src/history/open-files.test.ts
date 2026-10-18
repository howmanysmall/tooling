import { describe, it } from "vitest";

import { getOpenCommands } from "./open-files";

describe("getOpenCommands", () => {
	it("opens everything at once on macOS and one file per process elsewhere", ({ expect }) => {
		expect.assertions(3);

		const paths = ["/a.png", "/b.png"];

		expect(getOpenCommands(paths, "darwin")).toStrictEqual([{ command: "open", parameters: paths }]);
		expect(getOpenCommands(paths, "linux")).toHaveLength(2);
		expect(getOpenCommands(["/a.png"], "win32")).toStrictEqual([
			{ command: "cmd", parameters: ["/c", "start", '""', "/a.png"] },
		]);
	});
});

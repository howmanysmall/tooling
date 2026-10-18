import { describe, it } from "vitest";

import { getSectionLinks } from "./section-links";

import type { SidebarEntry } from "./section-links";

function link(label: string, href: string, isCurrent = false): SidebarEntry {
	return { href, isCurrent, label, type: "link" };
}

function group(label: string, entries: ReadonlyArray<SidebarEntry>): SidebarEntry {
	return { entries, label, type: "group" };
}

describe("getSectionLinks", () => {
	it("links each group to its first page and marks the one holding the current page", ({ expect }) => {
		expect.assertions(1);

		const sidebar = [
			group("Guide", [link("Install", "/guide/install/"), link("First image", "/guide/first-image/")]),
			group("Commands", [link("generate", "/commands/generate/"), link("compare", "/commands/compare/", true)]),
		];

		expect(getSectionLinks(sidebar)).toStrictEqual([
			{ href: "/guide/install/", isCurrent: false, label: "Guide" },
			{ href: "/commands/generate/", isCurrent: true, label: "Commands" },
		]);
	});

	it("looks inside nested groups, keeps top-level links, and skips empty groups", ({ expect }) => {
		expect.assertions(1);

		const sidebar = [
			group("The app", [group("Tabs", [link("History", "/app/history/", true)])]),
			group("Empty", []),
			link("Models", "/models/"),
		];

		expect(getSectionLinks(sidebar)).toStrictEqual([
			{ href: "/app/history/", isCurrent: true, label: "The app" },
			{ href: "/models/", isCurrent: false, label: "Models" },
		]);
	});
});

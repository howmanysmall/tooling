/** A sidebar link, as much of it as the header reads. */
interface SidebarLink {
	readonly href: string;
	readonly isCurrent: boolean;
	readonly label: string;
	readonly type: "link";
}

/** A sidebar group, as much of it as the header reads. */
interface SidebarGroup {
	readonly entries: ReadonlyArray<SidebarEntry>;
	readonly label: string;
	readonly type: "group";
}

/** One entry of Starlight's sidebar. */
export type SidebarEntry = SidebarGroup | SidebarLink;

/** Where a group of pages starts, and whether the reader is inside it. */
interface GroupSummary {
	/** The first page's address, when the group has a page. */
	readonly href: string | undefined;
	/** Whether any page in the group is the current one. */
	readonly isCurrent: boolean;
}

/** One link in the header: a sidebar section, opened at its first page. */
export interface SectionLink {
	readonly href: string;
	/** Whether the current page is in this section. */
	readonly isCurrent: boolean;
	readonly label: string;
}

/**
 * Finds where a group of pages starts and whether it holds the current page.
 *
 * @param entries - The links and nested groups inside the group.
 * @returns The group's first page and whether the reader is inside it.
 */
function summarizeGroup(entries: ReadonlyArray<SidebarEntry>): GroupSummary {
	let href: string | undefined;
	let isCurrent = false;
	for (const entry of entries) {
		const found: GroupSummary =
			entry.type === "link" ? { href: entry.href, isCurrent: entry.isCurrent } : summarizeGroup(entry.entries);

		href ??= found.href;
		isCurrent ||= found.isCurrent;
	}

	return { href, isCurrent };
}

/**
 * Turns the sidebar's top level into the header's section links. A group
 * links to its first page; a top-level link stays as it is.
 *
 * @param sidebar - Starlight's sidebar for the current page.
 * @returns One link per top-level entry that leads somewhere.
 */
export function getSectionLinks(sidebar: ReadonlyArray<SidebarEntry>): Array<SectionLink> {
	const links: Array<SectionLink> = [];
	for (const entry of sidebar) {
		if (entry.type === "link") {
			links.push({ href: entry.href, isCurrent: entry.isCurrent, label: entry.label });
			continue;
		}

		const { href, isCurrent } = summarizeGroup(entry.entries);
		if (href !== undefined) {
			links.push({ href, isCurrent, label: entry.label });
		}
	}

	return links;
}

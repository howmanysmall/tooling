// oxlint-disable vitest/no-hooks -- temp fixture tree

import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { afterAll, beforeAll, describe, it } from "vitest";

import { listSubdirectoriesAsync } from "./list-subdirectories-async";

let root = "";

function at(...segments: ReadonlyArray<string>): string {
	return nodePath.join(root, ...segments);
}

beforeAll(async () => {
	root = await mkdtemp(nodePath.join(tmpdir(), "project-loc-subdirectories-"));

	await mkdir(at("alpha"));
	await mkdir(at("zeta"));
	await mkdir(at(".hidden"));
	await writeFile(at("notes.txt"), "");
	await symlink(at("alpha"), at("linked"));
	await symlink(at("notes.txt"), at("file-link"));
	await symlink(at("missing"), at("dangling"));
});

afterAll(async () => {
	await rm(root, { force: true, recursive: true });
});

describe("listSubdirectoriesAsync", () => {
	it("should list directories and links to directories, sorted", async ({ expect }) => {
		expect.assertions(1);

		expect(await listSubdirectoriesAsync(root)).toStrictEqual([at("alpha"), at("linked"), at("zeta")]);
	});

	it("should ignore files, links to files, and dangling links", async ({ expect }) => {
		expect.assertions(4);

		const directories = await listSubdirectoriesAsync(root);

		expect(directories).not.toContain(at(".hidden"));
		expect(directories).not.toContain(at("notes.txt"));
		expect(directories).not.toContain(at("file-link"));
		expect(directories).not.toContain(at("dangling"));
	});
});

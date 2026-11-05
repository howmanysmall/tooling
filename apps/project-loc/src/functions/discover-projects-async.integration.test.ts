// oxlint-disable vitest/no-hooks -- temp fixture tree

import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { afterAll, beforeAll, describe, it } from "vitest";

import { DiscoveryMode } from "$meta/discovery-mode";

import { discoverProjectsAsync } from "./discover-projects-async";

let root = "";

async function touchAsync(...segments: ReadonlyArray<string>): Promise<void> {
	const file = nodePath.join(root, ...segments);
	await mkdir(nodePath.dirname(file), { recursive: true });
	await writeFile(file, "");
}

function at(...segments: ReadonlyArray<string>): string {
	return nodePath.join(root, ...segments);
}

beforeAll(async () => {
	root = await mkdtemp(nodePath.join(tmpdir(), "project-loc-"));

	await touchAsync("apps", "web", "package.json");
	await touchAsync("apps", "web", "node_modules", "dependency", "package.json");
	await touchAsync("apps", "web", "packages", "ui", "package.json");
	await touchAsync("tools", "cli", "Cargo.toml");
	await touchAsync("lib", "App.csproj");
	await touchAsync("docs", "readme.md");
	await touchAsync(".hidden", "package.json");
	await touchAsync("notes.txt");
	await symlink(at("docs"), at("linked"));
	await symlink(at("does-not-exist"), at("dangling"));
});

afterAll(async () => {
	await rm(root, { force: true, recursive: true });
});

describe("project-loc-utilities discovery", () => {
	describe("subdirectories", () => {
		it("should list the immediate directories, following links to directories", async ({ expect }) => {
			expect.assertions(1);

			expect(await discoverProjectsAsync(root, DiscoveryMode.Subdirectories, 4, false)).toStrictEqual([
				at("apps"),
				at("docs"),
				at("lib"),
				at("linked"),
				at("tools"),
			]);
		});

		it("should skip hidden directories, files and dangling links", async ({ expect }) => {
			expect.assertions(3);

			const projects = await discoverProjectsAsync(root, DiscoveryMode.Subdirectories, 4, false);

			expect(projects).not.toContain(at(".hidden"));
			expect(projects).not.toContain(at("notes.txt"));
			expect(projects).not.toContain(at("dangling"));
		});
	});

	describe("manifests", () => {
		it("should keep only the outermost directory of a monorepo", async ({ expect }) => {
			expect.assertions(1);

			expect(await discoverProjectsAsync(root, DiscoveryMode.Manifests, 6, false)).toStrictEqual([
				at(".hidden"),
				at("apps", "web"),
				at("lib"),
				at("tools", "cli"),
			]);
		});

		it("should report nested packages on their own when asked", async ({ expect }) => {
			expect.assertions(1);

			expect(await discoverProjectsAsync(root, DiscoveryMode.Manifests, 6, true)).toStrictEqual([
				at(".hidden"),
				at("apps", "web"),
				at("apps", "web", "packages", "ui"),
				at("lib"),
				at("tools", "cli"),
			]);
		});

		it("should not look inside pruned directories", async ({ expect }) => {
			expect.assertions(1);

			const projects = await discoverProjectsAsync(root, DiscoveryMode.Manifests, 9, true);

			expect(projects.some((project) => project.includes("node_modules"))).toBe(false);
		});

		it("should recognise a .csproj as a manifest", async ({ expect }) => {
			expect.assertions(1);

			expect(await discoverProjectsAsync(root, DiscoveryMode.Manifests, 2, false)).toContain(at("lib"));
		});

		it("should only look as deep as the depth allows", async ({ expect }) => {
			expect.assertions(3);

			// A manifest at root/a/b/package.json is three levels down, as find
			// counts them.
			expect(await discoverProjectsAsync(root, DiscoveryMode.Manifests, 2, false)).toStrictEqual([
				at(".hidden"),
				at("lib"),
			]);
			expect(await discoverProjectsAsync(root, DiscoveryMode.Manifests, 3, false)).toStrictEqual([
				at(".hidden"),
				at("apps", "web"),
				at("lib"),
				at("tools", "cli"),
			]);
			expect(await discoverProjectsAsync(root, DiscoveryMode.Manifests, 3, true)).not.toContain(
				at("apps", "web", "packages", "ui"),
			);
		});

		it("should find nothing in a directory with no manifests", async ({ expect }) => {
			expect.assertions(1);

			expect(await discoverProjectsAsync(at("docs"), DiscoveryMode.Manifests, 4, false)).toStrictEqual([]);
		});
	});
});

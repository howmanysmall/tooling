import { existsSync } from "node:fs";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import { cwd, stdout } from "node:process";
import { CliError } from "@howmanysmall/cli-utilities/cli-error";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name";

import { DOCUMENTATION_DIRECTORY, getSitesAsync } from "./documentation-sites";

import type { DocumentationSiteEntry } from "./documentation-sites";

const scriptName = getScriptName(true);

function escapeHtml(value: string): string {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function renderIndex(sites: ReadonlyArray<DocumentationSiteEntry>): string {
	const rows = sites
		.map(({ name, description }) => {
			const link = `<a href="./${escapeHtml(name)}/">${escapeHtml(name)}</a>`;
			return `\t\t\t<li>${link}<span>${escapeHtml(description)}</span></li>`;
		})
		.join("\n");

	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Documentation</title>
		<style>
			:root { --paper: #fafaf9; --ink: #1a1c20; --ink-2: #555a63; --rule: #e2e1dc; color-scheme: light dark; }
			@media (prefers-color-scheme: dark) { :root { --paper: #111315; --ink: #eeeeec; --ink-2: #a9adb4; --rule: #2c3035; } }
			body { margin: 0; padding: 3rem clamp(1rem, 6vw, 4.5rem); background: var(--paper); color: var(--ink); font: 400 0.9375rem / 1.5rem system-ui, sans-serif; }
			h1 { margin: 0 0 2rem; font: 400 3.25rem / 3.625rem Georgia, serif; }
			ul { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--rule); }
			li { display: grid; gap: 0.25rem 1.5rem; grid-template-columns: minmax(0, 12.5rem) minmax(0, 1fr); padding: 1rem 0; border-bottom: 1px solid var(--rule); }
			a { color: var(--ink); font: 400 1.375rem / 1.75rem Georgia, serif; }
			span { color: var(--ink-2); font-size: 0.8125rem; }
		</style>
	</head>
	<body>
		<h1>Documentation</h1>
		<ul>
${rows}
		</ul>
	</body>
</html>
`;
}

export const assembleCommand = createBaseCommand(
	scriptName,
	undefined,
	"Gather every built site into one folder for GitHub Pages, with a page that lists them.",
)
	.option("-o, --output <directory:string>", "Where the folder goes.", { default: "_site" })
	.action(async ({ output }) => {
		const rootDirectory = cwd();
		const sites = await getSitesAsync(rootDirectory);
		const missing = sites.filter(
			({ name }) => !existsSync(nodePath.join(rootDirectory, DOCUMENTATION_DIRECTORY, name, "dist")),
		);

		if (missing.length > 0) {
			const names = missing.map(({ name }) => `documentation/${name}`).join(", ");
			throw new CliError(
				`Not built yet: ${names}. Run: node --run turbo -- run build --filter=./documentation/*`,
				1,
			);
		}

		const outputDirectory = nodePath.resolve(rootDirectory, output);
		await rm(outputDirectory, { force: true, recursive: true });
		await mkdir(outputDirectory, { recursive: true });
		await Promise.all(
			sites.map(async ({ name }) =>
				cp(
					nodePath.join(rootDirectory, DOCUMENTATION_DIRECTORY, name, "dist"),
					nodePath.join(outputDirectory, name),
					{
						recursive: true,
					},
				),
			),
		);
		await writeFile(nodePath.join(outputDirectory, "index.html"), renderIndex(sites), "utf8");
		await writeFile(nodePath.join(outputDirectory, ".nojekyll"), "", "utf8");
		stdout.write(`${nodePath.relative(rootDirectory, outputDirectory)}\n`);
	});

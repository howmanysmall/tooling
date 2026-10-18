import { createRequire } from "node:module";
import nodePath from "node:path";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import { createDocumentationTheme } from "@howmanysmall/documentation-theme";
import { getDocumentationSite } from "@howmanysmall/documentation-theme/site";
import { defineConfig } from "astro/config";

import type { AstroIntegration } from "astro";

/**
 * Whether the value is a non-null object, as a type predicate so the checks
 * below narrow instead of tripping `no-unnecessary-condition`.
 *
 * @param value - The value to check.
 * @returns Whether the value is a non-null object.
 */
function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/**
 * Narrows an integration to the shape Astro reads, so the integrations array
 * keeps a precise type instead of widening to `any`.
 *
 * @template Integration - The integration's type, kept so its hooks and name stay precise.
 * @param integration - The integration to narrow.
 * @returns The integration's name and hooks.
 */
function ensureAstroIntegration<Integration extends AstroIntegration>(
	integration: Integration,
): AstroIntegration & Pick<Integration, "hooks" | "name"> {
	if (!isObject(integration)) {
		throw new TypeError(
			`Expected Astro integration to be an object, received: ${Object.prototype.toString.call(integration)}`,
		);
	}

	const name = "name" in integration ? integration.name : undefined;
	if (name === undefined || name.length === 0) {
		throw new Error(
			`Expected Astro integration to have a non-empty string "name" property, received: ${String(name)}`,
		);
	}

	const hooks = "hooks" in integration ? integration.hooks : undefined;
	if (!isObject(hooks)) {
		throw new TypeError(
			`Expected Astro integration "${name}" to have a "hooks" object, received: ${String(hooks)}`,
		);
	}

	return { name, hooks };
}

const { base, site } = getDocumentationSite("darkroom");

/**
 * The darkroom package's example images, found through the package so the
 * site never reaches into another workspace folder. `import.meta.glob` can't
 * take a package name, so it reads them through this alias.
 */
const examplesDirectory = nodePath.join(
	nodePath.dirname(createRequire(import.meta.url).resolve("@pobammer-ts/darkroom/package.json")),
	"examples",
);

const documentationTheme = createDocumentationTheme({ palette: "./src/styles/palette.css" });

export default defineConfig({
	base,
	integrations: [
		ensureAstroIntegration(
			starlight({
				description:
					"Generate images with any model on OpenRouter, compare models side by side, and keep every run.",
				disable404Route: true,
				editLink: { baseUrl: "https://github.com/howmanysmall/tooling/edit/main/documentation/darkroom/" },
				favicon: "/favicon.svg",
				lastUpdated: true,
				plugins: [documentationTheme],
				sidebar: [
					{
						items: [
							{ label: "Install and set up", slug: "guide/install" },
							{ label: "Your first image", slug: "guide/first-image" },
							{ label: "Compare models", slug: "guide/compare" },
							{ label: "Keep and revisit runs", slug: "guide/history" },
							{ label: "Costs and paid requests", slug: "guide/costs" },
						],
						label: "Guide",
					},
					{
						items: [
							{ label: "generate", slug: "commands/generate" },
							{ label: "compare", slug: "commands/compare" },
							{ label: "history", slug: "commands/history" },
							{ label: "models", slug: "commands/models" },
							{ label: "cache", slug: "commands/cache" },
							{ label: "completions", slug: "commands/completions" },
							{ label: "Output and exit codes", slug: "commands/output" },
						],
						label: "Commands",
					},
					{
						items: [
							{ label: "Tabs and keys", slug: "app/overview" },
							{ label: "Generating and editing", slug: "app/generate" },
							{ label: "Sessions", slug: "app/sessions" },
							{ label: "The model picker", slug: "app/model-picker" },
						],
						label: "The app",
					},
					{
						items: [{ label: "The MCP server", slug: "agents/mcp" }],
						label: "Agent tools",
					},
					{ label: "Models", slug: "models" },
				],
				social: [
					{
						href: "https://github.com/howmanysmall/tooling/tree/main/apps/darkroom",
						icon: "github",
						label: "GitHub",
					},
				],
				title: "darkroom",
			}),
		),
		ensureAstroIntegration(react({ compiler: true })),
	],
	site,
	vite: {
		resolve: {
			alias: {
				$components: fileURLToPath(new URL("src/components/", import.meta.url)),
				"$darkroom-examples": examplesDirectory,
			},
		},
	},
});

import { createRequire } from "node:module";
import nodePath from "node:path";
import starlight from "@astrojs/starlight";
import { createDocumentationTheme } from "@howmanysmall/documentation-theme";
import { getDocumentationSite } from "@howmanysmall/documentation-theme/site";
import { defineConfig } from "astro/config";

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

export default defineConfig({
	base,
	integrations: [
		starlight({
			description:
				"Generate images with any model on OpenRouter, compare models side by side, and keep every run.",
			disable404Route: true,
			editLink: { baseUrl: "https://github.com/howmanysmall/tooling/edit/main/documentation/darkroom/" },
			favicon: "/favicon.svg",
			lastUpdated: true,
			plugins: [createDocumentationTheme({ palette: "./src/styles/palette.css" })],
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
	],
	site,
	vite: {
		resolve: { alias: { "$darkroom-examples": examplesDirectory } },
	},
});

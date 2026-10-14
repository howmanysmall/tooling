import { defineConfig } from "bumpp";

// Shared defaults for `node --run release -- <tool>`. Each tool versions on
// its own, so `scripts/release.ts` sets `cwd`, `files`, `commit`, and `tag`.
const configuration = defineConfig({
	all: true,
	confirm: true,
	noGitCheck: false,
	push: true,
});

export default configuration;

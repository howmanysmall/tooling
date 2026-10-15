import type { SourceMap } from "oxc-transform-react";
import type { Plugin } from "rolldown";

const REACT_SOURCE_REGEXP = /\.[cm]?[jt]sx?$/u;

export interface ReactCompilerOptions {
	/** Whether to emit source maps for the compiled modules. */
	readonly sourcemap?: boolean | undefined;
}

interface CompiledModule {
	readonly code: string;
	readonly map: SourceMap;
}

function isReactSource(id: string): boolean {
	return !id.includes("/node_modules/") && REACT_SOURCE_REGEXP.test(id);
}

/**
 * Compiles React components and hooks with the Oxc port of React Compiler
 * (`oxc-transform-react`), targeting React 19. It runs before the other
 * transforms so the compiler sees the original source.
 *
 * @param options - Source map settings.
 * @returns A rolldown plugin for a tsdown `plugins` list.
 * @rejects When React Compiler reports a fatal error, from the plugin's
 *   transform hook, with the code frames as the message.
 */
export function createReactCompilerPlugin(options: ReactCompilerOptions = {}): Plugin {
	const sourcemap = options.sourcemap ?? true;

	async function compileModuleAsync(code: string, id: string): Promise<CompiledModule | string | undefined> {
		if (!isReactSource(id)) return undefined;

		const { transform } = await import("oxc-transform-react");
		const result = await transform(id, code, { reactCompiler: { target: "19" }, sourcemap });
		if (result.fatal) throw new Error(result.errors.map((error) => error.codeframe ?? error.message).join("\n"));
		return result.map === undefined ? result.code : { code: result.code, map: result.map };
	}

	return {
		name: "oxc-react-compiler",
		transform: { handler: compileModuleAsync, order: "pre" },
	};
}

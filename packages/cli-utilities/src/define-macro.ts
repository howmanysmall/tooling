import type { MacroContext } from "unplugin-macros";

// oxlint-disable-next-line jsdoc-js/require-template -- shut up
/**
 * Types a function as a build-time macro, like `defineMacro` from
 * `unplugin-macros`.
 *
 * That `defineMacro` returns its argument unchanged, but importing it at
 * runtime makes every bundle that reaches a macro module (even for a sibling
 * export such as `renderHighlight`) pull in all of `unplugin-macros`. This
 * copy only imports types, so the published bundle never sees it.
 *
 * @param macro - The macro. `this` is the macro context at build time and
 *   `undefined` when the function is called at runtime.
 * @returns The same function, typed without its `this` parameter.
 * @__NO_SIDE_EFFECTS__
 */
export function defineMacro<Arguments extends Array<unknown>, Return>(
	macro: (this: MacroContext | undefined, ...parameters: Arguments) => Return,
): (...parameters: Arguments) => Return {
	return macro;
}

import { Predicate } from "effect";

// `globalThis.Temporal`, not a bare `Temporal`: a bare reference throws a
// `ReferenceError` at module-evaluation time on runtimes without it (Node 22/24),
// which kills the process before the `temporal-polyfill` fallback below can run.

// oxlint-disable-next-line unicorn-js/no-unnecessary-global-this -- coal
const nativeTemporal = globalThis.Temporal;
export type TemporalNative = typeof globalThis.Temporal;

export async function getTemporalAsync(): Promise<TemporalNative> {
	// oxlint-disable-next-line typescript/no-unnecessary-condition -- it is required, lol.
	if (Predicate.isFunction(nativeTemporal?.Now?.timeZoneId)) return nativeTemporal;

	try {
		// External optional peer: never bundled, so native runtimes pay nothing.
		const { Temporal } = await import("temporal-polyfill");
		return Temporal;
	} catch (error) {
		throw new Error(
			"Missing `Temporal` support: upgrade to Node 26+ or a recent Bun, or install the optional `temporal-polyfill` peer.",
			{ cause: error },
		);
	}
}

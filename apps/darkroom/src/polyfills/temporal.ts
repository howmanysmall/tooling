// Side-effect shim: install `temporal-polyfill` only on runtimes without native
// `Temporal` (Node <26, older Bun). Native runtimes skip the import entirely.

// oxlint-disable-next-line typescript/no-unnecessary-condition small-rules/no-runtime-typeof -- this is a polyfill lol
if (typeof globalThis.Temporal?.Now?.timeZoneId !== "function") {
	// oxlint-disable-next-line antfu/no-top-level-await -- polyfill is only needed on runtimes without native `Temporal`.
	const { Temporal } = await import("temporal-polyfill");
	// oxlint-disable-next-line unicorn-js/no-global-object-property-assignment -- polyfill is needed.
	globalThis.Temporal = Temporal;
}

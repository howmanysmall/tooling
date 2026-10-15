import { Predicate } from "effect";
import { Temporal, Intl as TemporalIntl } from "temporal-polyfill";

// oxlint-disable-next-line typescript/no-unnecessary-condition -- you are WRONG!
if (!Predicate.isFunction(globalThis.Temporal?.Now?.timeZoneId)) {
	Reflect.set(globalThis, "Temporal", Temporal);
	// oxlint-disable-next-line unicorn-js/no-unnecessary-global-this -- pretty sure it is.
	Reflect.set(globalThis.Intl, "DateTimeFormat", TemporalIntl.DateTimeFormat);
}

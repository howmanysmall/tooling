/**
 * Subscribes to a store that never changes, for `useSyncExternalStore`
 * when there is no store, as in screens rendered on their own.
 *
 * @returns An unsubscribe that does nothing.
 */
export function subscribeToNothing(): () => void {
	return () => undefined;
}

/**
 * Reads the store that isn't there.
 *
 * @returns Always `undefined`.
 */
export function getNothing(): undefined {
	return undefined;
}

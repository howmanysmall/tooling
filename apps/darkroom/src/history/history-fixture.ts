import type { HistoryEntry } from "./history-entry";

/**
 * Builds a stored run for tests.
 *
 * @param id - A 26-character ULID.
 * @param overrides - Fields to change.
 * @returns A valid history entry.
 */
export function createEntry(id: string, overrides: Partial<HistoryEntry> = {}): HistoryEntry {
	return {
		id,
		cost: 0.04,
		created: "2026-10-14T20:00:00.000Z",
		images: [{ mediaType: "image/png", output: `/work/${id}.png`, stored: `images/${id}/1.png` }],
		model: "openai/gpt-image-1",
		prompt: `prompt for ${id}`,
		references: [],
		// oxlint-disable-next-line id-length -- the API calls this field n
		request: { aspectRatio: "1:1", n: 1 },
		requested: 1,
		returned: 1,
		...overrides,
	};
}

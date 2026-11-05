import type { BarParts } from "$types/rendering-types";

export function getBarParts(eighths: number, width: number): BarParts {
	const halves = eighths > 0 ? Math.max(1, Math.round(((eighths / 8) * width * 2) / 10)) : 0;
	const full = Math.floor(halves / 2);
	const hasHalf = halves % 2 === 1;
	const used = full + (hasHalf ? 1 : 0);

	return {
		filled: "━".repeat(full) + (hasHalf ? "╸" : ""),
		track: "─".repeat(Math.max(0, width - used)),
	};
}

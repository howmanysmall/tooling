export function getPercent(part: number, whole: number): number {
	return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

export function getEighths(part: number, whole: number): number {
	if (part <= 0 || whole <= 0) return 0;
	return Math.max(1, Math.round((part / whole) * 80));
}

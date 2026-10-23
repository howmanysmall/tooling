import { describe, it, vi } from "vitest";
import { fromAny } from "@total-typescript/shoehorn";

import { TimestampFormat } from "$validators/timestamp-format-type";

vi.stubEnv("TZ", "America/Denver");

const { formatTimestampAsync } = await import("./format-timestamp.ts");

// 2026-10-05T20:26:57Z, which is 14:26:57 MDT (UTC-6) in America/Denver.
const TIMESTAMP = 1_791_232_017;
const HOUR = 3600;
const DAY = 24 * HOUR;

const SHORT_WEEKDAY_PATTERN = /^Mon, Oct 5(?:,| at) 2:26 PM MDT$/u;
const MEDIUM_DATE_TIME_PATTERN = /^Oct 5, 2026(?:,| at) 2:26 PM$/u;

const isEnglish = Intl.DateTimeFormat().resolvedOptions().locale.startsWith("en");

function normalizeSpaces(value: string): string {
	return value.replaceAll(/\s/gu, " ");
}

function nowInSeconds(): number {
	return Date.now() / 1000;
}

describe("formatTimestamp", () => {
	describe("iso formats", () => {
		it("formats an ISO instant in UTC", async ({ expect }) => {
			expect.assertions(2);

			await expect(formatTimestampAsync(TIMESTAMP, TimestampFormat.IsoInstant)).resolves.toBe(
				"2026-10-05T20:26:57Z",
			);
			await expect(formatTimestampAsync(0, TimestampFormat.IsoInstant)).resolves.toBe("1970-01-01T00:00:00Z");
		});

		it("formats local ISO date and time in the system time zone", async ({ expect }) => {
			expect.assertions(2);

			await expect(formatTimestampAsync(TIMESTAMP, TimestampFormat.IsoDate)).resolves.toBe("2026-10-05");
			await expect(formatTimestampAsync(TIMESTAMP, TimestampFormat.IsoTime)).resolves.toBe("14:26:57");
		});

		// Catches the UTC date leaking through (02:00Z is still evening in
		// Denver).
		it("uses the local calendar date rather than the UTC date", async ({ expect }) => {
			expect.assertions(1);

			const utcEarlyMorning = Date.UTC(2026, 9, 6, 2, 0, 0) / 1000;

			await expect(formatTimestampAsync(utcEarlyMorning, TimestampFormat.IsoDate)).resolves.toBe("2026-10-05");
		});

		it("formats ISO local without an offset or zone name", async ({ expect }) => {
			expect.assertions(1);

			await expect(formatTimestampAsync(TIMESTAMP, TimestampFormat.IsoLocal)).resolves.toBe(
				"2026-10-05T14:26:57",
			);
		});

		it("formats ISO zoned with the offset and zone name", async ({ expect }) => {
			expect.assertions(1);

			await expect(formatTimestampAsync(TIMESTAMP, TimestampFormat.IsoZoned)).resolves.toBe(
				"2026-10-05T14:26:57-06:00[America/Denver]",
			);
		});

		it("applies standard time offset outside daylight saving", async ({ expect }) => {
			expect.assertions(1);

			const winter = Date.UTC(2026, 0, 15, 19, 0, 0) / 1000;

			await expect(formatTimestampAsync(winter, TimestampFormat.IsoZoned)).resolves.toBe(
				"2026-01-15T12:00:00-07:00[America/Denver]",
			);
		});
	});

	describe("sub-second timestamps", () => {
		it("keeps millisecond precision", async ({ expect }) => {
			expect.assertions(1);

			await expect(formatTimestampAsync(TIMESTAMP + 0.25, TimestampFormat.IsoInstant)).resolves.toBe(
				"2026-10-05T20:26:57.25Z",
			);
		});

		it("rounds below a millisecond to the nearest millisecond", async ({ expect }) => {
			expect.assertions(1);

			await expect(formatTimestampAsync(TIMESTAMP + 0.000_6, TimestampFormat.IsoInstant)).resolves.toBe(
				"2026-10-05T20:26:57.001Z",
			);
		});
	});

	describe.skipIf(!isEnglish)("locale formats (en)", () => {
		it("formats the full date", async ({ expect }) => {
			expect.assertions(1);

			await expect(formatTimestampAsync(TIMESTAMP, TimestampFormat.FullDate)).resolves.toBe(
				"Monday, October 5, 2026",
			);
		});

		it("formats the long date", async ({ expect }) => {
			expect.assertions(1);

			await expect(formatTimestampAsync(TIMESTAMP, TimestampFormat.LongDate)).resolves.toBe("October 5, 2026");
		});

		it("formats the full date and time with the zone name", async ({ expect }) => {
			expect.assertions(1);

			await expect(
				formatTimestampAsync(TIMESTAMP, TimestampFormat.FullDateTime).then(normalizeSpaces),
			).resolves.toBe("Monday, October 5, 2026 at 2:26:57 PM MDT");
		});

		it("formats the medium date and time", async ({ expect }) => {
			expect.assertions(1);

			await expect(
				formatTimestampAsync(TIMESTAMP, TimestampFormat.MediumDateTime).then(normalizeSpaces),
			).resolves.toMatch(MEDIUM_DATE_TIME_PATTERN);
		});

		it("formats the short weekday date and time with the zone name", async ({ expect }) => {
			expect.assertions(1);

			await expect(
				formatTimestampAsync(TIMESTAMP, TimestampFormat.ShortWeekdayDateTime).then(normalizeSpaces),
			).resolves.toMatch(SHORT_WEEKDAY_PATTERN);
		});
	});

	describe.skipIf(!isEnglish)("relative format (en)", () => {
		// Offsets carry a spare hour so units stay stable during the run.
		it("describes past times", async ({ expect }) => {
			expect.assertions(3);

			await expect(formatTimestampAsync(nowInSeconds() - 3 * DAY - HOUR, TimestampFormat.Relative)).resolves.toBe(
				"3 days ago",
			);
			await expect(formatTimestampAsync(nowInSeconds() - 2 * HOUR - 60, TimestampFormat.Relative)).resolves.toBe(
				"2 hours ago",
			);
			await expect(formatTimestampAsync(nowInSeconds() - 5 * 60 - 5, TimestampFormat.Relative)).resolves.toBe(
				"5 minutes ago",
			);
		});

		it("describes future times", async ({ expect }) => {
			expect.assertions(2);

			await expect(formatTimestampAsync(nowInSeconds() + 3 * DAY + HOUR, TimestampFormat.Relative)).resolves.toBe(
				"in 3 days",
			);
			await expect(formatTimestampAsync(nowInSeconds() + 2 * HOUR + 60, TimestampFormat.Relative)).resolves.toBe(
				"in 2 hours",
			);
		});

		it("says now for the current moment", async ({ expect }) => {
			expect.assertions(1);

			await expect(formatTimestampAsync(nowInSeconds(), TimestampFormat.Relative)).resolves.toBe("now");
		});

		it("uses the largest non-zero unit", async ({ expect }) => {
			expect.assertions(1);

			const twoYearsAgo = nowInSeconds() - 2 * 366 * DAY - 10 * DAY;

			await expect(formatTimestampAsync(twoYearsAgo, TimestampFormat.Relative)).resolves.toBe("2 years ago");
		});
	});

	describe("invalid input", () => {
		it("throws for an unknown format", async ({ expect }) => {
			expect.assertions(1);

			await expect(async () => formatTimestampAsync(TIMESTAMP, fromAny("nope"))).rejects.toThrow(
				"Unknown timestamp format kind: nope",
			);
		});
	});
});

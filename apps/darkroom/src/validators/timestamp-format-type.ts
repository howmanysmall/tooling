import { EnumType } from "@cliffy/command";

export const enum TimestampFormat {
	/** Formats as `Monday, October 5, 2026`. */
	FullDate = "full-date",
	/**
	 * Formats as `Monday, October 5, 2026 at 2:26:57 PM MDT`.`.
	 */
	FullDateTime = "full-date-time",
	/** Formats as `2026-10-05`. */
	IsoDate = "iso-date",
	/** Formats as `2026-10-05T20:26:57Z`. */
	IsoInstant = "iso-instant",
	/**
	 * Formats as `2026-10-05T14:26:57`.
	 */
	IsoLocal = "iso-local",
	/** Formats as `14:26:57`. */
	IsoTime = "iso-time",
	/** Formats as `2026-10-05T14:26:57-06:00[America/Denver]`. */
	IsoZoned = "iso-zoned",
	/** Formats as `October 5, 2026`. */
	LongDate = "long-date",
	/** Formats as `Oct 5, 2026, 2:26 PM`. */
	MediumDateTime = "medium-date-time",
	/** Formats as `9 days ago`. */
	Relative = "relative",
	/**
	 * Formats as `Mon, Oct 5, 2:26 PM MDT`.
	 */
	ShortWeekdayDateTime = "short-weekday-date-time",
}

export const timestampFormatType = new EnumType([
	TimestampFormat.FullDate,
	TimestampFormat.FullDateTime,
	TimestampFormat.IsoDate,
	TimestampFormat.IsoInstant,
	TimestampFormat.IsoLocal,
	TimestampFormat.IsoTime,
	TimestampFormat.IsoZoned,
	TimestampFormat.LongDate,
	TimestampFormat.MediumDateTime,
	TimestampFormat.Relative,
	TimestampFormat.ShortWeekdayDateTime,
]);

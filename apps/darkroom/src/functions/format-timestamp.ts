import { TimestampFormat } from "$validators/timestamp-format-type";

const timeZoneId = Temporal.Now.timeZoneId();

const fullDateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeZone: timeZoneId });
const fullDateTimeFormat = new Intl.DateTimeFormat(undefined, {
	dateStyle: "full",
	timeStyle: "long",
	timeZone: timeZoneId,
});
const longDateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeZone: timeZoneId });
const mediumDateTimeFormat = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: timeZoneId,
});
const shortWeekdayDateTimeFormat = new Intl.DateTimeFormat(undefined, {
	day: "numeric",
	hour: "numeric",
	minute: "2-digit",
	month: "short",
	timeZone: timeZoneId,
	timeZoneName: "short",
	weekday: "short",
});
const relativeTimeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

const BOTH_NEVER = { offset: "never", timeZoneName: "never" } as const;
const RELATIVE_UNITS = ["years", "months", "days", "hours", "minutes", "seconds"] as const;
const YEARS = { largestUnit: "years" } as const;

function formatRelative(zonedDateTime: Temporal.ZonedDateTime): string {
	const now = Temporal.Now.zonedDateTimeISO(timeZoneId);
	const duration = zonedDateTime.since(now, YEARS);

	for (const unit of RELATIVE_UNITS) {
		if (duration[unit] === 0) continue;
		const rounded = duration.round({ largestUnit: unit, relativeTo: now, smallestUnit: unit });
		return relativeTimeFormat.format(rounded[unit], unit);
	}

	return relativeTimeFormat.format(0, "seconds");
}

export function formatTimestamp(timestamp: number, timestampFormat: TimestampFormat): string {
	const instant = Temporal.Instant.fromEpochMilliseconds(Math.round(timestamp * 1000));

	switch (timestampFormat) {
		case TimestampFormat.FullDate:
			return fullDateFormat.format(instant);

		case TimestampFormat.FullDateTime:
			return fullDateTimeFormat.format(instant);

		case TimestampFormat.IsoDate:
			return instant.toZonedDateTimeISO(timeZoneId).toPlainDate().toString();

		case TimestampFormat.IsoInstant:
			return instant.toString();

		case TimestampFormat.IsoLocal:
			return instant.toZonedDateTimeISO(timeZoneId).toString(BOTH_NEVER);

		case TimestampFormat.IsoTime:
			return instant.toZonedDateTimeISO(timeZoneId).toPlainTime().toString();

		case TimestampFormat.IsoZoned:
			return instant.toZonedDateTimeISO(timeZoneId).toString();

		case TimestampFormat.LongDate:
			return longDateFormat.format(instant);

		case TimestampFormat.MediumDateTime:
			return mediumDateTimeFormat.format(instant);

		case TimestampFormat.Relative:
			return formatRelative(instant.toZonedDateTimeISO(timeZoneId));

		case TimestampFormat.ShortWeekdayDateTime:
			return shortWeekdayDateTimeFormat.format(instant);

		default:
			throw new Error(`Unknown timestamp format kind: ${String(timestampFormat)}`);
	}
}

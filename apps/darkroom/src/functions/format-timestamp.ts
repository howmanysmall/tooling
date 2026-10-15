import { TimestampFormat } from "$validators/timestamp-format-type";

const relativeTimeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

const BOTH_NEVER = { offset: "never", timeZoneName: "never" } as const;
const RELATIVE_UNITS = ["years", "months", "days", "hours", "minutes", "seconds"] as const;
const YEARS = { largestUnit: "years" } as const;

interface DateFormatters {
	fullDateFormat: Intl.DateTimeFormat;
	fullDateTimeFormat: Intl.DateTimeFormat;
	longDateFormat: Intl.DateTimeFormat;
	mediumDateTimeFormat: Intl.DateTimeFormat;
	shortWeekdayDateTimeFormat: Intl.DateTimeFormat;
}

const formatterCache = new Map<string, DateFormatters>();

function getDateFormatters(timeZoneId: string): DateFormatters {
	const cached = formatterCache.get(timeZoneId);
	if (cached !== undefined) return cached;

	const formatters: DateFormatters = {
		fullDateFormat: new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeZone: timeZoneId }),
		fullDateTimeFormat: new Intl.DateTimeFormat(undefined, {
			dateStyle: "full",
			timeStyle: "long",
			timeZone: timeZoneId,
		}),
		longDateFormat: new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeZone: timeZoneId }),
		mediumDateTimeFormat: new Intl.DateTimeFormat(undefined, {
			dateStyle: "medium",
			timeStyle: "short",
			timeZone: timeZoneId,
		}),
		shortWeekdayDateTimeFormat: new Intl.DateTimeFormat(undefined, {
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			month: "short",
			timeZone: timeZoneId,
			timeZoneName: "short",
			weekday: "short",
		}),
	};
	formatterCache.set(timeZoneId, formatters);
	return formatters;
}

function formatRelative(zonedDateTime: Temporal.ZonedDateTime): string {
	const { timeZoneId } = zonedDateTime;
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
	const timeZoneId = Temporal.Now.timeZoneId();
	const { fullDateFormat, fullDateTimeFormat, longDateFormat, mediumDateTimeFormat, shortWeekdayDateTimeFormat } =
		getDateFormatters(timeZoneId);
	const instant = Temporal.Instant.fromEpochMilliseconds(Math.round(timestamp * 1000));
	// Native `Intl.DateTimeFormat` formats `Date`; only the polyfilled variant
	// accepts `Temporal` instances directly. Going through `Date` keeps the
	// runtime shim to `Temporal` alone.
	const date = new Date(instant.epochMilliseconds);

	switch (timestampFormat) {
		case TimestampFormat.FullDate:
			return fullDateFormat.format(date);

		case TimestampFormat.FullDateTime:
			return fullDateTimeFormat.format(date);

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
			return longDateFormat.format(date);

		case TimestampFormat.MediumDateTime:
			return mediumDateTimeFormat.format(date);

		case TimestampFormat.Relative:
			return formatRelative(instant.toZonedDateTimeISO(timeZoneId));

		case TimestampFormat.ShortWeekdayDateTime:
			return shortWeekdayDateTimeFormat.format(date);

		default:
			throw new Error(`Unknown timestamp format kind: ${String(timestampFormat)}`);
	}
}

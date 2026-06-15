const DATE_ONLY_PATTERN = /^(\d{4})[-/](\d{2})[-/](\d{2})$/;
const DATE_TIME_LOCAL_BARE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:\d{2})?$/;
const DATE_TIME_WITH_TZ_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;
const DISPLAY_DATE_TIME_PATTERN = /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/;

export const getStartOfToday = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
};

export const normalizeTaskDateInput = (value) => {
    if (value === undefined) {
        return { shouldUpdate: false };
    }

    if (value === null || value === '') {
        return {
            shouldUpdate: true,
            value: null
        };
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime())
            ? { error: "Invalid date value" }
            : { shouldUpdate: true, value };
    }

    if (typeof value === 'string') {
        const dateOnlyMatch = value.match(DATE_ONLY_PATTERN);
        if (dateOnlyMatch) {
            const [, year, month, day] = dateOnlyMatch;
            return {
                shouldUpdate: true,
                value: new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0)
            };
        }

        // If the string has a timezone offset (e.g. +07:00 or Z), parse it
        // with new Date() which correctly handles the offset.
        const dateTimeWithTzMatch = value.match(DATE_TIME_WITH_TZ_PATTERN);
        if (dateTimeWithTzMatch) {
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime())
                ? { error: "Invalid date value" }
                : { shouldUpdate: true, value: parsed };
        }

        // Bare datetime-local (no timezone offset) — use component extraction
        // to construct date in server local time.
        const dateTimeLocalMatch = value.match(DATE_TIME_LOCAL_BARE_PATTERN);
        if (dateTimeLocalMatch) {
            const [, year, month, day, hour, minute] = dateTimeLocalMatch;
            return {
                shouldUpdate: true,
                value: new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0)
            };
        }

        const displayDateTimeMatch = value.match(DISPLAY_DATE_TIME_PATTERN);
        if (displayDateTimeMatch) {
            const [, year, month, day, hour, minute] = displayDateTimeMatch;
            return {
                shouldUpdate: true,
                value: new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0)
            };
        }
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        return { error: "Invalid date value" };
    }

    return {
        shouldUpdate: true,
        value: parsedDate
    };
};

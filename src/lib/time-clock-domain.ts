export const TIME_CLOCK_TIME_ZONE = "America/Sao_Paulo";

export type TimeClockEntryTypeValue = "ENTRY" | "EXIT";

type TimeClockEntryLike = {
  occurredAt: Date;
  type: TimeClockEntryTypeValue;
};

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  const representedAsUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );

  return representedAsUtc - date.getTime();
}

function localMidnightToUtc(year: number, month: number, day: number) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day));
  const firstOffset = getTimeZoneOffsetMilliseconds(
    utcGuess,
    TIME_CLOCK_TIME_ZONE,
  );
  const firstResult = new Date(utcGuess.getTime() - firstOffset);
  const correctedOffset = getTimeZoneOffsetMilliseconds(
    firstResult,
    TIME_CLOCK_TIME_ZONE,
  );

  return new Date(utcGuess.getTime() - correctedOffset);
}

function localDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const firstOffset = getTimeZoneOffsetMilliseconds(
    utcGuess,
    TIME_CLOCK_TIME_ZONE,
  );
  const firstResult = new Date(utcGuess.getTime() - firstOffset);
  const correctedOffset = getTimeZoneOffsetMilliseconds(
    firstResult,
    TIME_CLOCK_TIME_ZONE,
  );

  return new Date(utcGuess.getTime() - correctedOffset);
}

export function getNextTimeClockEntryType(
  lastType: TimeClockEntryTypeValue | null | undefined,
): TimeClockEntryTypeValue {
  return lastType === "ENTRY" ? "EXIT" : "ENTRY";
}

export function getCurrentSaoPauloYearMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    timeZone: TIME_CLOCK_TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);

  return {
    month: Number(parts.find((part) => part.type === "month")?.value),
    year: Number(parts.find((part) => part.type === "year")?.value),
  };
}

export function getSaoPauloMonthRange(year: number, month: number) {
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  return {
    end: localMidnightToUtc(nextYear, nextMonth, 1),
    start: localMidnightToUtc(year, month, 1),
  };
}

export function parseSaoPauloDateTimeInput(value: string) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const date = localDateTimeToUtc(
    Number(year),
    Number(month),
    Number(day),
    Number(hour),
    Number(minute),
  );
  const formatted = formatSaoPauloDateTimeInput(date);

  return formatted === value ? date : null;
}

export function formatSaoPauloDateTimeInput(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: TIME_CLOCK_TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function summarizeTimeClockEntries(entries: TimeClockEntryLike[]) {
  const orderedEntries = [...entries].sort(
    (left, right) => left.occurredAt.getTime() - right.occurredAt.getTime(),
  );
  let completedPairs = 0;
  let inconsistentEntries = 0;
  let openEntryAt: Date | null = null;
  let workedMilliseconds = 0;

  for (const entry of orderedEntries) {
    if (entry.type === "ENTRY") {
      if (openEntryAt) {
        inconsistentEntries += 1;
      }

      openEntryAt = entry.occurredAt;
      continue;
    }

    if (!openEntryAt || entry.occurredAt < openEntryAt) {
      inconsistentEntries += 1;
      continue;
    }

    workedMilliseconds += entry.occurredAt.getTime() - openEntryAt.getTime();
    completedPairs += 1;
    openEntryAt = null;
  }

  return {
    completedPairs,
    inconsistentEntries,
    openEntryAt,
    workedMilliseconds,
  };
}

export function formatWorkedDuration(milliseconds: number) {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${String(minutes).padStart(2, "0")}min`;
}

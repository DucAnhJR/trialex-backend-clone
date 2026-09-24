export type ScheduleRule = 'days_after' | 'weeks_after' | 'months_after';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

type LocalDate = { year: number; month: number; day: number };

const parseDateOnly = (value: string): LocalDate => {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) throw new Error('Invalid date-only value');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new Error('Invalid date-only value');
  }
  return { year, month, day };
};

const formatDateOnly = ({ year, month, day }: LocalDate) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

const getFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

const getOffsetMilliseconds = (instant: Date, timeZone: string) => {
  const parts = getFormatter(timeZone).formatToParts(instant);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;
  const localAsUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );
  return localAsUtc - instant.getTime();
};

/**
 * Converts a local calendar date/time in an IANA timezone to an instant.
 * The two offset reads handle daylight-saving changes between UTC and local
 * time without treating a calendar month as a fixed number of milliseconds.
 */
const localDateTimeToUtc = (
  date: LocalDate,
  dueTime: string,
  timeZone: string,
) => {
  const match = TIME_PATTERN.exec(dueTime);
  if (!match) throw new Error('Invalid due time');
  const localEpoch = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    Number(match[1]),
    Number(match[2]),
  );
  let instant = new Date(localEpoch);
  for (let iteration = 0; iteration < 2; iteration += 1) {
    instant = new Date(localEpoch - getOffsetMilliseconds(instant, timeZone));
  }
  return instant;
};

export const isValidIanaTimeZone = (timeZone: unknown): timeZone is string => {
  if (typeof timeZone !== 'string' || !timeZone.trim()) return false;
  try {
    getFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
};

export const isValidDueTime = (dueTime: unknown): dueTime is string =>
  typeof dueTime === 'string' && TIME_PATTERN.test(dueTime);

export const getLocalDueTime = (instant: Date, timeZone: string) => {
  const values = Object.fromEntries(
    getFormatter(timeZone)
      .formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  return `${values.hour}:${values.minute}`;
};

export const calculateScheduledDate = (
  anchor: string,
  rule: ScheduleRule,
  offset: number,
  timeZone: string,
  dueTime = '00:00',
) => {
  const date = parseDateOnly(anchor);
  let result: LocalDate;

  if (rule === 'days_after' || rule === 'weeks_after') {
    const shifted = new Date(
      Date.UTC(
        date.year,
        date.month - 1,
        date.day + offset * (rule === 'weeks_after' ? 7 : 1),
      ),
    );
    result = {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
    };
  } else if (rule === 'months_after') {
    const monthIndex = date.year * 12 + (date.month - 1) + offset;
    const year = Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    result = { year, month, day: Math.min(date.day, daysInMonth(year, month)) };
  } else {
    throw new Error('Unsupported questionnaire schedule rule');
  }

  return {
    scheduledLocalDate: formatDateOnly(result),
    dueAt: localDateTimeToUtc(result, dueTime, timeZone),
  };
};

/**
 * Calculates "N local calendar days after due" without treating a day as a
 * fixed 24-hour duration. This preserves the configured local due time across
 * daylight-saving transitions.
 */
export const calculateCompletionPromptAt = (
  scheduledLocalDate: string,
  dueAt: Date,
  daysAfterDue: number,
  timeZone: string,
) =>
  calculateScheduledDate(
    scheduledLocalDate,
    'days_after',
    daysAfterDue,
    timeZone,
    getLocalDueTime(dueAt, timeZone),
  ).dueAt;

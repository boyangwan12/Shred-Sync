import Papa from 'papaparse';

/**
 * AutoSleep CSV parser.
 *
 * Strict 35-column header check; embedded commas in `tags`/`notes` handled by papaparse.
 * Parses each data row into a ParsedSleepRow. Date-key convention: we key rows by
 * `toDate` (morning-after — "the day you lived"), parsed via parseToDateToIso in system
 * local timezone so dates align with the user's lived experience.
 */

export const AUTOSLEEP_HEADERS = [
  "ISO8601","fromDate","toDate","bedtime","waketime","inBed","awake","fellAsleepIn","sessions",
  "asleep","asleepAvg7","efficiency","efficiencyAvg7","quality","qualityAvg7","deep","deepAvg7",
  "sleepBPM","sleepBPMAvg7","dayBPM","dayBPMAvg7","wakingBPM","wakingBPMAvg7","hrv","hrvAvg7",
  "sleepHRV","sleepHRVAvg7","SpO2Avg","SpO2Min","SpO2Max","respAvg","respMin","respMax","apnea","tags","notes"
] as const;

export interface ParsedSleepRow {
  date: string | null;            // YYYY-MM-DD from toDate
  sleepMinutes: number | null;
  deepSleepMinutes: number | null;
  hrvMs: number | null;
  sleepBpm: number | null;
  wakingBpm: number | null;
  sleepMinutesAvg7: number | null;
  deepSleepMinutesAvg7: number | null;
  hrvMsAvg7: number | null;
  sleepBpmAvg7: number | null;
  wakingBpmAvg7: number | null;
}

export interface ParseError {
  row: number;
  message: string;
  code?: string;
}

export interface ParseResult {
  rows: ParsedSleepRow[];
  errors: ParseError[];
  headerMismatch?: { expected: string[]; got: string[] };
  duplicateDate?: string;
}

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/**
 * Parse AutoSleep's `toDate` like "Tuesday, Mar 17, 2026" → "2026-03-17".
 * Uses system local timezone (AutoSleep dates are naive wall-clock).
 */
export function parseToDateToIso(s: string | null | undefined): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  // "Tuesday, Mar 17, 2026"
  const m = /^[A-Za-z]+,\s*([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/.exec(trimmed);
  if (!m) return null;
  const monthIdx = MONTHS[m[1]];
  if (monthIdx === undefined) return null;
  const day = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (!Number.isFinite(day) || !Number.isFinite(year)) return null;
  const mm = String(monthIdx + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Parse "HH:MM:SS" → minutes rounded half-up. "" or null → null.
 */
export function parseHhMmSs(s: string | null | undefined): number | null {
  if (s === null || s === undefined) return null;
  const v = s.trim();
  if (v === '') return null;
  const m = /^(\d{1,3}):(\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mi = parseInt(m[2], 10);
  const sec = parseInt(m[3], 10);
  if (!Number.isFinite(h) || !Number.isFinite(mi) || !Number.isFinite(sec)) return null;
  const totalMin = h * 60 + mi + sec / 60;
  return Math.round(totalMin);
}

function parseNumOrNull(s: string | null | undefined): number | null {
  if (s === null || s === undefined) return null;
  const v = s.trim();
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function parseAutoSleepRow(row: Record<string, string>): ParsedSleepRow {
  return {
    date: parseToDateToIso(row.toDate),
    sleepMinutes: parseHhMmSs(row.asleep),
    deepSleepMinutes: parseHhMmSs(row.deep),
    hrvMs: parseNumOrNull(row.hrv),
    sleepBpm: parseNumOrNull(row.sleepBPM),
    wakingBpm: parseNumOrNull(row.wakingBPM),
    sleepMinutesAvg7: parseHhMmSs(row.asleepAvg7),
    deepSleepMinutesAvg7: parseHhMmSs(row.deepAvg7),
    hrvMsAvg7: parseNumOrNull(row.hrvAvg7),
    sleepBpmAvg7: parseNumOrNull(row.sleepBPMAvg7),
    wakingBpmAvg7: parseNumOrNull(row.wakingBPMAvg7),
  };
}

export function parseAutoSleepCsv(text: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const errors: ParseError[] = [];
  for (const e of result.errors) {
    // reject unmatched quotes explicitly (AC-I9)
    if (e.code === 'MissingQuotes' || e.code === 'InvalidQuotes') {
      errors.push({ row: (e.row ?? -1) + 2, message: `unmatched quotes at row ${(e.row ?? -1) + 2}`, code: e.code });
    } else {
      errors.push({ row: (e.row ?? -1) + 2, message: e.message, code: e.code });
    }
  }

  // header validation (strict order + names)
  const got = (result.meta.fields ?? []) as string[];
  if (got.length !== AUTOSLEEP_HEADERS.length || got.some((h, i) => h !== AUTOSLEEP_HEADERS[i])) {
    return { rows: [], errors, headerMismatch: { expected: [...AUTOSLEEP_HEADERS], got } };
  }

  // If quote errors exist, stop early (caller returns 400)
  if (errors.length > 0) {
    return { rows: [], errors };
  }

  const rows: ParsedSleepRow[] = [];
  const seenDates = new Set<string>();
  let duplicateDate: string | undefined;

  for (const raw of result.data) {
    const parsed = parseAutoSleepRow(raw);
    if (parsed.date) {
      if (seenDates.has(parsed.date)) {
        duplicateDate = parsed.date;
        break;
      }
      seenDates.add(parsed.date);
    }
    rows.push(parsed);
  }

  return { rows, errors, duplicateDate };
}

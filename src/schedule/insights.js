import { DAY_NAMES } from "../constants/dates.js";
import { formatDate, formatDateRange } from "../utils/dates.js";
import { countConsecutiveShifts, getMaxShiftStreakLimit, getMaxStreakLimit } from "./engine.js";

/**
 * Derives warnings and highlights from a schedule.
 * @param {import("../types.js").Schedule | null} schedule
 * @param {number} month
 * @param {number} year
 * @param {import("../types.js").Worker[]} workers
 * @param {import("../types.js").Settings} settings
 * @returns {{
 *  coverage: { missingDayIndexes: number[]; warnings: string[] };
 *  nightToDay: { cells: Array<{ rowId: string; dayIndex: number }>; warnings: string[] };
 *  blockedDay: { cells: Array<{ rowId: string; dayIndex: number }>; warnings: string[] };
 *  streaks: { cells: Array<{ rowId: string; dayIndex: number }>; warnings: string[] };
 *  summary: import("../types.js").SummaryEntry[];
 *  warnings: string[];
 * }}
 */
export function deriveScheduleInsights(schedule, month, year, workers, settings) {
  const coverage = computeCoverage(schedule, month, year);
  const nightToDay = computeNightToDayWarnings(schedule, month, year);
  const blockedDay = computeBlockedDayWarnings(schedule, workers);
  const streaks = computeStreakWarnings(schedule, settings);
  const summary = schedule ? schedule.summary : [];
  const summaryWarnings = summary.flatMap((entry) => entry.warnings);
  return {
    coverage,
    nightToDay,
    blockedDay,
    streaks,
    summary,
    warnings: [
      ...(schedule?.warnings || []),
      ...coverage.warnings,
      ...nightToDay.warnings,
      ...blockedDay.warnings,
      ...streaks.warnings,
      ...summaryWarnings,
    ],
  };
}

function computeCoverage(schedule, month, year) {
  if (!schedule) {
    return { missingDayIndexes: [], warnings: [] };
  }
  const missingDayIndexes = [];
  const warnings = [];

  schedule.days.forEach((dayMeta, index) => {
    const hasDayShift = schedule.rows.some((row) => row.slots[index] === "D");
    const hasNightShift = schedule.rows.some((row) => row.slots[index] === "N");
    if (!hasDayShift || !hasNightShift) {
      missingDayIndexes.push(index);
      const date = dayMeta.date || new Date(year, month - 1, dayMeta.day);
      const missing = [];
      if (!hasDayShift) {
        missing.push("D");
      }
      if (!hasNightShift) {
        missing.push("N");
      }
      warnings.push(`${formatDate(date)} brak obsady (${missing.join(" i ")}).`);
    }
  });

  return { missingDayIndexes, warnings };
}

function computeNightToDayWarnings(schedule, month, year) {
  if (!schedule) {
    return { cells: [], warnings: [] };
  }
  const cellKeys = new Set();
  const cells = [];
  const warnings = [];

  schedule.rows.forEach((row) => {
    row.slots.forEach((slot, index) => {
      if (index === 0 || !slot) {
        return;
      }
      const prev = row.slots[index - 1];
      if (prev !== "N" || slot !== "D") {
        return;
      }
      const dayMeta = schedule.days[index];
      const date = dayMeta?.date || new Date(year, month - 1, dayMeta?.day);
      const currentKey = `${row.id}:${index}`;
      const prevKey = `${row.id}:${index - 1}`;
      if (!cellKeys.has(currentKey)) {
        cellKeys.add(currentKey);
        cells.push({ rowId: row.id, dayIndex: index });
      }
      if (!cellKeys.has(prevKey)) {
        cellKeys.add(prevKey);
        cells.push({ rowId: row.id, dayIndex: index - 1 });
      }
      warnings.push(`${formatDate(date)} zmiana N→D dla ${row.name}.`);
    });
  });

  return { cells, warnings };
}

function computeBlockedDayWarnings(schedule, workers) {
  if (!schedule) {
    return { cells: [], warnings: [] };
  }
  const warnings = [];
  const cells = [];
  const forcedSet = new Set(
    Array.isArray(schedule.forcedCells)
      ? schedule.forcedCells.map((cell) => `${cell.rowId}:${cell.dayIndex}`)
      : [],
  );
  const workerMap = new Map();
  workers.forEach((worker) => {
    workerMap.set(worker.id, worker);
  });

  schedule.rows.forEach((row) => {
    const worker = workerMap.get(row.id);
    if (!worker || !worker.blockedShifts) {
      return;
    }
    row.slots.forEach((slot, index) => {
      if (slot !== "D" && slot !== "N") {
        return;
      }
      const dayMeta = schedule.days[index];
      if (!dayMeta) {
        return;
      }
      const dowIndex = dayMeta.date ? dayMeta.date.getDay() : DAY_NAMES.indexOf(dayMeta.dow);
      const dayBlocked = worker.blockedShifts[dowIndex];
      if (Array.isArray(dayBlocked) && dayBlocked.includes(slot)) {
        cells.push({ rowId: row.id, dayIndex: index });
        const key = `${row.id}:${index}`;
        const date =
          dayMeta.date || new Date(dayMeta.year || new Date().getFullYear(), dowIndex, dayMeta.day);
        if (!forcedSet.has(key)) {
          warnings.push(
            `${formatDate(date)} ${worker.name} ma blokadę na zmianę ${slot} w ten dzień.`,
          );
        }
      }
    });
  });

  return { cells, warnings };
}

function computeStreakWarnings(schedule, settings) {
  if (!schedule) {
    return { cells: [], warnings: [] };
  }
  const cells = [];
  const warnings = [];
  const dayLimit = Math.max(getMaxStreakLimit("D", settings), 1);
  const nightLimit = Math.max(getMaxStreakLimit("N", settings), 1);
  const anyLimit = Math.max(getMaxShiftStreakLimit(settings), 1);

  schedule.rows.forEach((row) => {
    const slots = Array.isArray(row.slots) ? row.slots : [];
    let current = null;
    let startIndex = 0;
    let length = 0;

    const flush = (endIndex) => {
      if (!current || length <= 0) {
        return;
      }
      const limit = current === "D" ? dayLimit : current === "N" ? nightLimit : null;
      if (!limit || length <= limit) {
        return;
      }
      for (let i = startIndex; i <= endIndex; i += 1) {
        cells.push({ rowId: row.id, dayIndex: i });
      }
      const startMeta = schedule.days[startIndex];
      const endMeta = schedule.days[endIndex];
      const rangeText =
        startMeta?.date && endMeta?.date
          ? formatDateRange(startMeta.date, endMeta.date)
          : `${startIndex + 1}-${endIndex + 1}`;
      const label = current === "D" ? "dni" : "nocy";
      warnings.push(`${row.name} ma ${length} ${label} z rzędu (${rangeText}).`);
    };

    slots.forEach((slot, index) => {
      if (slot === "D" || slot === "N") {
        if (slot === current) {
          length += 1;
        } else {
          flush(index - 1);
          current = slot;
          startIndex = index;
          length = 1;
        }
      } else {
        flush(index - 1);
        current = null;
        length = 0;
      }
    });

    flush(slots.length - 1);

    // Combined streaks (any shifts back-to-back)
    let anyStart = null;
    let anyLength = 0;
    const flushAny = (endIndex) => {
      if (anyStart === null || anyLength <= anyLimit) {
        return;
      }
      for (let i = anyStart; i <= endIndex; i += 1) {
        cells.push({ rowId: row.id, dayIndex: i });
      }
      const startMeta = schedule.days[anyStart];
      const endMeta = schedule.days[endIndex];
      const rangeText =
        startMeta?.date && endMeta?.date
          ? formatDateRange(startMeta.date, endMeta.date)
          : `${anyStart + 1}-${endIndex + 1}`;
      warnings.push(`${row.name} ma ${anyLength} zmian z rzędu (${rangeText}).`);
    };

    slots.forEach((slot, index) => {
      if (slot === "D" || slot === "N") {
        if (anyStart === null) {
          anyStart = index;
          anyLength = 1;
        } else {
          anyLength += 1;
        }
      } else {
        flushAny(index - 1);
        anyStart = null;
        anyLength = 0;
      }
    });
    flushAny(slots.length - 1);
  });

  return { cells, warnings };
}

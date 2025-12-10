import { DEFAULT_FORM_NUMBERS, DEFAULT_FORM_VALUES } from "../constants/defaults.js";
import { DAY_NAMES } from "../constants/dates.js";
import { isHexColor, randomHexColor } from "../utils/colors.js";
import { sanitizeNumber } from "../utils/numbers.js";

/**
 * Imports schedule/workers payload into state.
 * @param {unknown} data
 * @param {import("../state/appState.js").AppState} appState
 * @param {{ monthSelect: HTMLSelectElement; yearSelect: HTMLSelectElement }} controls
 * @param {{
 *  persistWorkers: (state: import("../state/appState.js").AppState) => void;
 *  persistNotes?: (state: import("../state/appState.js").AppState) => void;
 * }} persistence
 * @returns {boolean}
 */
export function importScheduleFromJson(data, appState, controls, persistence = {}) {
  try {
    if (!data || typeof data !== "object") {
      throw new Error("Struktura JSON jest nieprawidłowa.");
    }
    const { persistWorkers, persistNotes } = persistence;
    if (typeof persistWorkers !== "function") {
      throw new Error("Brakuje wymaganej funkcji zapisu pracowników.");
    }
    const { workers, schedule, month, year, notes } = /** @type {any} */ (data);
    if (!Array.isArray(workers) || !schedule) {
      throw new Error("Brakuje wymaganych pól (workers/schedule).");
    }
    const targetMonth = Number(month) || Number(controls.monthSelect.value) || new Date().getMonth() + 1;
    const targetYear = Number(year) || Number(controls.yearSelect.value) || new Date().getFullYear();
    const normalizedWorkers = normalizeImportedWorkers(workers);
    const colorMap = new Map(normalizedWorkers.map((worker) => [worker.id, worker.color]));
    const normalizedSchedule = normalizeImportedSchedule(schedule, targetMonth, targetYear, colorMap);

    appState.workers = normalizedWorkers;
    persistWorkers(appState);

    controls.monthSelect.value = String(targetMonth);
    controls.yearSelect.value = String(targetYear);

    appState.currentSchedule = {
      schedule: normalizedSchedule,
      month: targetMonth,
      year: targetYear,
    };
    const hasImportedNotes = typeof notes === "string";
    if (hasImportedNotes) {
      appState.notes = notes;
      if (typeof persistNotes === "function") {
        persistNotes(appState);
      }
    }
    return true;
  } catch (error) {
    alert("Nie udało się wczytać pliku JSON.");
    console.error(error);
    return false;
  }
}

/**
 * Normalizes workers from import payload.
 * @param {unknown[]} list
 * @returns {import("../types.js").Worker[]}
 */
export function normalizeImportedWorkers(list) {
  return list
    .filter((item) => item && typeof item.id === "string" && typeof item.name === "string")
    .map((item, index) => ({
      id: item.id,
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
      name: item.name,
      maxHours: sanitizeNumber(item.maxHours, DEFAULT_FORM_NUMBERS.maxHours, { min: 12 }),
      shiftHours: sanitizeNumber(item.shiftHours, DEFAULT_FORM_NUMBERS.shiftHours, { min: 4 }),
      preference:
        typeof item.preference === "string" ? item.preference : DEFAULT_FORM_VALUES.preference,
      enforceHourCap: Boolean(item.enforceHourCap),
      blockedShifts: normalizeBlockedShifts(item.blockedShifts),
      noWeekends: false,
      color: isHexColor(item.color) ? item.color : randomHexColor(),
    }))
    .sort((a, b) => a.order - b.order);
}

/**
 * Normalizes schedule structure from import payload.
 * @param {any} rawSchedule
 * @param {number} month
 * @param {number} year
 * @param {Map<string, string>} [colorMap]
 * @returns {import("../types.js").Schedule}
 */
export function normalizeImportedSchedule(rawSchedule, month, year, colorMap = new Map()) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, idx) => {
    const dayNum = rawSchedule?.days?.[idx]?.day ?? idx + 1;
    const date = new Date(year, month - 1, dayNum);
    const dowIndex = date.getDay();
    return {
      day: dayNum,
      dow: DAY_NAMES[dowIndex],
      date,
      isSaturday: dowIndex === 6,
      isSunday: dowIndex === 0,
    };
  });

  const rows = Array.isArray(rawSchedule?.rows)
    ? rawSchedule.rows
        .filter((row) => row && typeof row.id === "string" && typeof row.name === "string")
        .map((row) => {
          const slots = Array.isArray(row.slots) ? row.slots.slice(0, daysInMonth) : [];
          const locks = Array.isArray(row.locks) ? row.locks.slice(0, daysInMonth) : [];
          const normalizedSlots = Array.from({ length: daysInMonth }, (_, idx) => {
            const value = slots[idx];
            return value === "D" || value === "N" || value === "U" ? value : null;
          });
          const normalizedLocks = Array.from({ length: daysInMonth }, (_, idx) =>
            Boolean(locks[idx]),
          );
          return {
            id: row.id,
            name: row.name,
            slots: normalizedSlots,
            locks: normalizedLocks,
            color: colorMap.get(row.id),
          };
        })
    : [];

  return {
    days,
    rows,
    summary: [],
    warnings: [],
  };
}

function normalizeBlockedShifts(raw) {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const map = {};
  Object.entries(raw).forEach(([key, value]) => {
    const day = Number(key);
    if (!Number.isFinite(day)) {
      return;
    }
    const shifts = Array.isArray(value) ? value.filter((v) => v === "D" || v === "N") : [];
    if (shifts.length) {
      map[day] = shifts;
    }
  });
  return map;
}

import { DEFAULT_FORM_NUMBERS, DEFAULT_FORM_VALUES } from "../constants/defaults.js";
import * as storageKeys from "../constants/storageKeys.js";
import { sanitizeNumber } from "../utils/numbers.js";
import { createDefaultSettings } from "./appState.js";
import { isHexColor, randomHexColor } from "../utils/colors.js";

/**
 * Hydrates settings from localStorage into appState.
 * @param {import("./appState.js").AppState} appState
 */
export function hydrateSettingsFromStorage(appState) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    appState.settings = createDefaultSettings();
    return;
  }
  try {
    const stored = window.localStorage.getItem(storageKeys.SETTINGS_STORAGE_KEY);
    if (!stored) {
      appState.settings = createDefaultSettings();
      return;
    }
    const parsed = JSON.parse(stored);
    const day = sanitizeNumber(parsed?.maxStreak?.D, appState.settings.maxStreak.D, { min: 1 });
    const night = sanitizeNumber(parsed?.maxStreak?.N, appState.settings.maxStreak.N, { min: 1 });
    const any = sanitizeNumber(parsed?.maxStreak?.ANY, appState.settings.maxStreak.ANY, { min: 1 });
    const useWorkerColors = Boolean(parsed?.useWorkerColors);
    appState.settings = {
      maxStreak: {
        D: day,
        N: night,
        ANY: any,
      },
      useWorkerColors,
    };
  } catch {
    appState.settings = createDefaultSettings();
  }
}

/**
 * Persists current settings to localStorage.
 * @param {import("./appState.js").AppState} appState
 */
export function persistSettings(appState) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(storageKeys.SETTINGS_STORAGE_KEY, JSON.stringify(appState.settings));
  } catch {
    // ignore storage failures
  }
}

/**
 * Hydrates notes from localStorage into appState.
 * @param {import("./appState.js").AppState} appState
 */
export function hydrateNotesFromStorage(appState) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    appState.notes = "";
    return;
  }
  try {
    const stored = window.localStorage.getItem(
      storageKeys.NOTES_STORAGE_KEY || "receptionAgendaNotes",
    );
    appState.notes = typeof stored === "string" ? stored : "";
  } catch {
    appState.notes = "";
  }
}

/**
 * Persists notes to localStorage.
 * @param {import("./appState.js").AppState} appState
 */
export function persistNotes(appState) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      storageKeys.NOTES_STORAGE_KEY || "receptionAgendaNotes",
      appState.notes || "",
    );
  } catch {
    // ignore storage failures
  }
}

/**
 * Hydrates workers from localStorage into appState.
 * @param {import("./appState.js").AppState} appState
 */
export function hydrateWorkersFromStorage(appState) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }
  try {
    const stored = window.localStorage.getItem(storageKeys.STORAGE_KEY);
    if (!stored) {
      return;
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return;
    }
    let assignedColors = false;
    const normalized = parsed
      .filter((item) => item && typeof item.id === "string")
      .map((item, index) => {
        const orderValue = Number(item.order);
        const color = isHexColor(item.color) ? item.color : randomHexColor();
        if (!isHexColor(item.color)) {
          assignedColors = true;
        }
        return {
          id: item.id,
          order: Number.isFinite(orderValue) ? orderValue : index,
          name: typeof item.name === "string" ? item.name : "",
          maxHours: sanitizeNumber(item.maxHours, DEFAULT_FORM_NUMBERS.maxHours, { min: 12 }),
          shiftHours: sanitizeNumber(item.shiftHours, DEFAULT_FORM_NUMBERS.shiftHours, { min: 4 }),
          preference:
            typeof item.preference === "string" ? item.preference : DEFAULT_FORM_VALUES.preference,
          noWeekends: false,
          enforceHourCap: Boolean(item.enforceHourCap),
          blockedShifts: normalizeBlockedShifts(item.blockedShifts),
          color,
        };
      });
    normalized.sort((a, b) => a.order - b.order);
    appState.workers = normalized;
    if (assignedColors) {
      persistWorkers(appState);
    }
  } catch {
    // ignore storage failures
  }
}

/**
 * Persists workers to localStorage.
 * @param {import("./appState.js").AppState} appState
 */
export function persistWorkers(appState) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(storageKeys.STORAGE_KEY, JSON.stringify(appState.workers));
  } catch {
    // ignore storage failures
  }
}

/**
 * Normalizes blocked shifts map.
 * @param {unknown} raw
 * @returns {Record<number, Array<"D" | "N">>}
 */
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

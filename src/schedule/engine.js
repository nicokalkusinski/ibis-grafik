import { BLOCK_TARGETS, DEFAULT_FORM_NUMBERS, DEFAULT_MAX_STREAK } from "../constants/defaults.js";
import { DAY_NAMES } from "../constants/dates.js";
import { formatDate } from "../utils/dates.js";
import { randomInt } from "../utils/numbers.js";

/**
 * Generates a schedule matrix for given workers and month/year.
 * Pure logic: no DOM access.
 * @param {import("../types.js").Worker[]} workers
 * @param {number} month
 * @param {number} year
 * @param {import("../types.js").ScheduleRow[]} [lockedRows]
 * @param {import("../types.js").Settings} settings
 * @returns {import("../types.js").Schedule}
 */
export function buildSchedule(workers, month, year, lockedRows = [], settings) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayMetadata = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month - 1, index + 1);
    return {
      index,
      date,
      day: index + 1,
      dow: DAY_NAMES[date.getDay()],
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    };
  });

  const lockedMap = new Map();
  lockedRows.forEach((row) => {
    if (!row || !row.id || !Array.isArray(row.slots)) {
      return;
    }
    lockedMap.set(row.id, {
      slots: row.slots,
      locks: Array.isArray(row.locks) ? row.locks : Array(row.slots.length).fill(false),
    });
  });

  const assignmentMap = new Map();
  workers.forEach((worker, order) => {
    const lockedEntry = lockedMap.get(worker.id);
    const baseSlots = Array(daysInMonth).fill(null);
    const baseLocks = Array(daysInMonth).fill(false);
    if (lockedEntry) {
      for (let i = 0; i < daysInMonth; i += 1) {
        const locked = Boolean(lockedEntry.locks[i]);
        baseLocks[i] = locked;
        baseSlots[i] = locked ? lockedEntry.slots[i] || null : null;
      }
    }
    assignmentMap.set(worker.id, {
      worker,
      order,
      slots: baseSlots,
      locks: baseLocks,
      totalHours: 0,
      nightsAssigned: 0,
      lastAssignedIndex: -5,
      dayAssignments: 0,
      nightAssignments: 0,
      block: { type: null, length: 0, target: 0 },
    });
  });

  const averageShiftHours =
    workers.length > 0
      ? workers.reduce((acc, w) => acc + w.shiftHours, 0) / workers.length
      : DEFAULT_FORM_NUMBERS.shiftHours;
  const targetHours = (daysInMonth * 2 * averageShiftHours) / Math.max(workers.length, 1);

  // Seed totals and counts for locked assignments
  assignmentMap.forEach((entry) => {
    entry.slots.forEach((slot, index) => {
      if ((slot === "D" || slot === "N") && entry.locks[index]) {
        entry.totalHours += entry.worker.shiftHours;
        if (slot === "D") {
          entry.dayAssignments += 1;
        }
        if (slot === "N") {
          entry.nightAssignments += 1;
          entry.nightsAssigned += 1;
        }
        entry.lastAssignedIndex = index;
      }
    });
  });

  const forcedWarnings = [];
  const forcedCells = [];

  dayMetadata.forEach((meta) => {
    assignShift("day", meta);
    assignShift("night", meta);
  });

  const rows = workers.map((worker) => {
    const entry = assignmentMap.get(worker.id);
    return {
      id: worker.id,
      name: worker.name,
      slots: entry ? entry.slots : Array(daysInMonth).fill(null),
      locks: entry ? entry.locks : Array(daysInMonth).fill(false),
    };
  });

  const summary = workers.map((worker) => {
    const entry = assignmentMap.get(worker.id);
    return {
      name: worker.name,
      totalHours: entry ? entry.totalHours : 0,
      nightsAssigned: entry ? entry.nightsAssigned : 0,
      dayCount: entry ? entry.dayAssignments : 0,
      nightCount: entry ? entry.nightAssignments : 0,
      warnings: [],
      holidayCount: 0,
      overtimeHours: 0,
    };
  });

  return {
    days: dayMetadata.map(({ day, dow, date }) => ({
      day,
      dow,
      date,
      isSaturday: date.getDay() === 6,
      isSunday: date.getDay() === 0,
    })),
    rows,
    summary,
    warnings: forcedWarnings,
    forcedCells,
  };

  function assignShift(kind, meta) {
    const symbol = kind === "day" ? "D" : "N";
    const alreadyAssigned = Array.from(assignmentMap.values()).some(
      (entry) => entry.slots[meta.index] === symbol,
    );
    if (alreadyAssigned) {
      return;
    }
    const respectingCap = pickCandidate(kind, meta, true, false);
    const candidate =
      respectingCap !== null && respectingCap !== undefined
        ? respectingCap
        : pickCandidate(kind, meta, false, false);
    let chosen = candidate;
    let forced = false;
    if (!chosen) {
      const forcedCandidate = pickCandidate(kind, meta, false, true);
      if (forcedCandidate) {
        chosen = forcedCandidate;
        forced = true;
      }
    }
    if (!chosen) {
      return;
    }
    chosen.slots[meta.index] = symbol;
    chosen.totalHours += chosen.worker.shiftHours;
    if (kind === "night") {
      chosen.nightsAssigned += 1;
      chosen.nightAssignments += 1;
    }
    if (kind === "day") {
      chosen.dayAssignments += 1;
    }
    if (forced) {
      const label = kind === "day" ? "D" : "N";
      forcedWarnings.push(
        `${formatDate(meta.date)} przydzielono zmianę ${label} dla ${chosen.worker.name} pomimo blokady.`,
      );
      forcedCells.push({ rowId: chosen.worker.id, dayIndex: meta.index });
    }
    updateBlockState(chosen, symbol, meta.index, settings);
    chosen.lastAssignedIndex = meta.index;
  }

  function pickCandidate(kind, meta, respectCap, allowBlocked) {
    const candidates = workers
      .map((worker) => assignmentMap.get(worker.id))
      .filter((entry) => isAvailable(entry, kind, meta, respectCap, allowBlocked));
    candidates.sort(
      (a, b) => computeScore(a, kind, meta) - computeScore(b, kind, meta),
    );
    return candidates.length > 0 ? candidates[0] : null;
  }

  function isAvailable(entry, kind, meta, respectCap, allowBlocked) {
    if (!entry) {
      return false;
    }
    const { worker, slots, totalHours } = entry;
    if (entry.locks && entry.locks[meta.index]) {
      return false;
    }
    if (slots[meta.index]) {
      return false;
    }
    if (worker.noWeekends && meta.isWeekend) {
      return false;
    }
    if (kind === "day" && exceedsConsecutiveLimit(slots, meta.index, "D", settings)) {
      return false;
    }
    if (kind === "night" && exceedsConsecutiveLimit(slots, meta.index, "N", settings)) {
      return false;
    }
    if (kind === "day" && meta.index > 0 && slots[meta.index - 1] === "N") {
      return false;
    }
    if (kind === "night" && slots[meta.index] === "D") {
      return false;
    }
    if (kind === "day" && worker.preference === "only-nights") {
      return false;
    }
    if (kind === "night" && worker.preference === "only-days") {
      return false;
    }
    const isBlockedShift = isShiftBlocked(worker, kind, meta.date.getDay());
    if (isBlockedShift && !allowBlocked) {
      return false;
    }
    const wouldExceed = totalHours + worker.shiftHours > worker.maxHours;
    if (respectCap && wouldExceed) {
      return false;
    }
    if (!respectCap && worker.enforceHourCap && wouldExceed) {
      return false;
    }
    return true;
  }

  function computeScore(entry, kind, meta) {
    let score = entry.totalHours;
    const { worker, nightsAssigned, slots, dayAssignments, nightAssignments, block } = entry;
    const loadGap = entry.totalHours - targetHours;
    score += loadGap * 12;
    if (loadGap < 0) {
      score -= Math.min(Math.abs(loadGap), 12);
    }
    const idleDays = meta.index - entry.lastAssignedIndex;
    if (idleDays > 0) {
      score -= Math.min(idleDays, 5) * 4;
    }
    const symbol = kind === "day" ? "D" : "N";
    const consecutiveSame = countConsecutiveShifts(slots, meta.index, symbol);
    const isConsecutiveBlock = consecutiveSame > 0 && entry.lastAssignedIndex === meta.index - 1;
    if (isConsecutiveBlock) {
      if (block.type === symbol && block.length < block.target) {
        score -= 35;
      } else {
        score += 30;
      }
    } else if (idleDays <= 1) {
      score += 12;
    }
    if (symbol === "N" && consecutiveSame >= 1) {
      score += consecutiveSame * 18;
    }
    const balanceGap = dayAssignments - nightAssignments;
    if (kind === "day") {
      score += Math.max(balanceGap, 0) * 12;
      score += dayAssignments * 1;
      if (worker.preference === "prefer-days") {
        score -= 12;
      } else if (worker.preference === "prefer-nights") {
        score += 10;
      } else if (worker.preference === "only-nights") {
        score += 70;
      } else if (worker.preference === "only-days") {
        score -= 40;
      }
    } else if (kind === "night") {
      score += Math.max(-balanceGap, 0) * 12;
      score += nightAssignments * 1.2;
      if (worker.preference === "prefer-nights") {
        score -= 20;
      } else if (worker.preference === "only-nights") {
        score -= 60;
      } else if (worker.preference === "prefer-days") {
        score += 10;
      } else if (worker.preference === "only-days") {
        score += 80;
      }
      if (meta.index > 0 && slots[meta.index - 1] === "N") {
        score += 10;
      }
    }
    if (meta.index > 0 && slots[meta.index - 1] === "D" && kind === "day") {
      score += 5;
    }
    score += entry.order * 0.01;
    return score;
  }
}

/**
 * Resolves maximum streak limit for a shift symbol with defaults.
 * @param {"D" | "N"} symbol
 * @param {import("../types.js").Settings} settings
 * @returns {number}
 */
export function getMaxStreakLimit(symbol, settings) {
  const maxStreak = settings?.maxStreak || DEFAULT_MAX_STREAK;
  const limit = maxStreak[symbol];
  if (!Number.isFinite(limit)) {
    return DEFAULT_MAX_STREAK[symbol] || 3;
  }
  return limit;
}

/**
 * Resolves maximum combined streak limit (any shift).
 * @param {import("../types.js").Settings} settings
 * @returns {number}
 */
export function getMaxShiftStreakLimit(settings) {
  const maxStreak = settings?.maxStreak || DEFAULT_MAX_STREAK;
  const limit = maxStreak.ANY;
  if (!Number.isFinite(limit)) {
    return DEFAULT_MAX_STREAK.ANY;
  }
  return limit;
}

function updateBlockState(entry, symbol, index, settings) {
  const isConsecutive = entry.lastAssignedIndex === index - 1 && entry.block.type === symbol;
  if (isConsecutive) {
    entry.block.length += 1;
  } else {
    entry.block = {
      type: symbol,
      length: 1,
      target: getRandomBlockLength(symbol, settings),
    };
  }
}

function getRandomBlockLength(symbol, settings) {
  const range = BLOCK_TARGETS[symbol];
  const streakLimit = Math.max(getMaxStreakLimit(symbol, settings), 1);
  if (!range) {
    return streakLimit;
  }
  const min = Math.min(range.min, streakLimit);
  const max = streakLimit;
  return randomInt(min, max);
}

/**
 * Counts consecutive shifts of given symbol preceding index.
 * @param {Array<"D" | "N" | "U" | null>} slots
 * @param {number} index
 * @param {"D" | "N"} symbol
 * @returns {number}
 */
export function countConsecutiveShifts(slots, index, symbol) {
  if (!Array.isArray(slots) || index <= 0) {
    return 0;
  }
  let count = 0;
  for (let i = index - 1; i >= 0; i -= 1) {
    if (slots[i] === symbol) {
      count += 1;
      continue;
    }
    break;
  }
  return count;
}

function exceedsConsecutiveLimit(slots, index, symbol, settings) {
  const limit = Math.max(getMaxStreakLimit(symbol, settings), 1);
  return countConsecutiveShifts(slots, index, symbol) >= limit;
}

function isShiftBlocked(worker, kind, dow) {
  const blocked = worker?.blockedShifts || {};
  const shifts = blocked[dow];
  if (!Array.isArray(shifts) || shifts.length === 0) {
    return false;
  }
  const symbol = kind === "day" ? "D" : "N";
  return shifts.includes(symbol);
}

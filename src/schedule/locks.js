/**
 * Updates slot value if editable.
 * @param {import("../state/appState.js").AppState} appState
 * @param {string} rowId
 * @param {number} dayIndex
 * @param {"D" | "N" | "U" | null} value
 */
export function updateSlotValue(appState, rowId, dayIndex, value) {
  if (!appState.currentSchedule) {
    return;
  }
  const { schedule } = appState.currentSchedule;
  const row = schedule.rows.find((item) => item.id === rowId);
  if (
    !row ||
    !Array.isArray(row.slots) ||
    dayIndex < 0 ||
    dayIndex >= row.slots.length ||
    (Array.isArray(row.locks) && row.locks[dayIndex])
  ) {
    return;
  }
  row.slots[dayIndex] = value === "D" || value === "N" || value === "U" ? value : null;
}

/**
 * Toggles lock on a schedule cell.
 * @param {import("../state/appState.js").AppState} appState
 * @param {string} rowId
 * @param {number} dayIndex
 */
export function toggleCellLock(appState, rowId, dayIndex) {
  if (!appState.currentSchedule) {
    return;
  }
  const { schedule } = appState.currentSchedule;
  const row = schedule.rows.find((item) => item.id === rowId);
  if (!row || dayIndex < 0 || dayIndex >= row.slots.length) {
    return;
  }
  if (!Array.isArray(row.locks)) {
    row.locks = Array(row.slots.length).fill(false);
  }
  row.locks[dayIndex] = !row.locks[dayIndex];
}

/**
 * Sets lock state for all cells in the current schedule.
 * @param {import("../state/appState.js").AppState} appState
 * @param {boolean} locked
 */
export function setAllLocks(appState, locked) {
  if (!appState.currentSchedule) {
    return;
  }
  const { schedule } = appState.currentSchedule;
  schedule.rows.forEach((row) => {
    const size = Array.isArray(row.slots) ? row.slots.length : 0;
    row.locks = Array.from({ length: size }, () => locked);
  });
}

/**
 * Toggles lock state for all cells in a given column (day index).
 * @param {import("../state/appState.js").AppState} appState
 * @param {number} dayIndex
 */
export function toggleColumnLock(appState, dayIndex) {
  if (!appState.currentSchedule) {
    return;
  }
  const { schedule } = appState.currentSchedule;
  const allLocked = schedule.rows.length
    ? schedule.rows.every((row) => Array.isArray(row.locks) && row.locks[dayIndex])
    : false;
  const target = !allLocked;
  schedule.rows.forEach((row) => {
    if (!Array.isArray(row.locks)) {
      row.locks = Array(row.slots.length).fill(false);
    }
    if (dayIndex >= 0 && dayIndex < row.locks.length) {
      row.locks[dayIndex] = target;
    }
  });
}

/**
 * Toggles lock state for all cells in a worker row.
 * @param {import("../state/appState.js").AppState} appState
 * @param {string} rowId
 */
export function toggleRowLock(appState, rowId) {
  if (!appState.currentSchedule) {
    return;
  }
  const { schedule } = appState.currentSchedule;
  const row = schedule.rows.find((item) => item.id === rowId);
  if (!row) {
    return;
  }
  const allLocked = Array.isArray(row.locks) && row.locks.length
    ? row.locks.every(Boolean)
    : false;
  const target = !allLocked;
  const size = Array.isArray(row.slots) ? row.slots.length : 0;
  row.locks = Array.from({ length: size }, () => target);
}

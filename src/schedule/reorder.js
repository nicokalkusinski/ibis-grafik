import { persistWorkers } from "../state/persistence.js";

/**
 * Moves a schedule row (and matching worker) relative to the target row.
 * @param {import("../state/appState.js").AppState} appState
 * @param {string} sourceRowId
 * @param {string} targetRowId
 * @param {"before" | "after"} [placement="before"]
 * @returns {boolean}
 */
export function reorderScheduleRows(appState, sourceRowId, targetRowId, placement = "before") {
  if (
    !appState.currentSchedule ||
    !appState.currentSchedule.schedule ||
    !sourceRowId ||
    !targetRowId ||
    sourceRowId === targetRowId
  ) {
    return false;
  }
  const normalizedPlacement = placement === "after" ? "after" : "before";
  const { schedule } = appState.currentSchedule;
  const moved = moveByIds(schedule.rows, sourceRowId, targetRowId, normalizedPlacement);
  if (!moved) {
    return false;
  }

  const movedWorker = moveByIds(appState.workers, sourceRowId, targetRowId, normalizedPlacement);
  if (movedWorker) {
    appState.workers.forEach((worker, index) => {
      worker.order = index;
    });
    persistWorkers(appState);
  }
  return true;
}

/**
 * @param {Array<{ id: string }>} list
 * @param {string} sourceId
 * @param {string} targetId
 * @param {"before" | "after"} placement
 * @returns {boolean}
 */
function moveByIds(list, sourceId, targetId, placement) {
  const fromIndex = list.findIndex((item) => item.id === sourceId);
  const targetIndex = list.findIndex((item) => item.id === targetId);
  if (fromIndex === -1 || targetIndex === -1) {
    return false;
  }
  const [item] = list.splice(fromIndex, 1);
  const baseIndex = targetIndex - (fromIndex < targetIndex ? 1 : 0);
  const insertIndex = placement === "after" ? baseIndex + 1 : baseIndex;
  const boundedIndex = Math.min(Math.max(insertIndex, 0), list.length);
  list.splice(boundedIndex, 0, item);
  return true;
}

import { MONTHS } from "../constants/dates.js";
import { computeSummaryFromSchedule } from "../schedule/summary.js";

/**
 * Builds a JSON-safe export payload from state.
 * @param {import("../state/appState.js").AppState} appState
 * @returns {{
 *  version: string;
 *  exportedAt: string;
 *  month: number;
 *  year: number;
 *  notes: string;
 *  workers: import("../types.js").Worker[];
 *  schedule: import("../types.js").Schedule;
 * }}
 */
export function createExportPayload(appState) {
  if (!appState.currentSchedule) {
    throw new Error("Brak grafiku do eksportu.");
  }
  const rawNotes = appState.notes ?? "";
  const notes = typeof rawNotes === "string" ? rawNotes : String(rawNotes);
  return {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    month: appState.currentSchedule.month,
    year: appState.currentSchedule.year,
    notes,
    workers: appState.workers,
    schedule: appState.currentSchedule.schedule,
  };
}

/**
 * Exports current schedule to PNG using canvas rendering.
 * @param {import("../state/appState.js").AppState} appState
 */
export function exportScheduleToPng(appState) {
  if (!appState.currentSchedule) {
    alert("Brak grafiku do eksportu.");
    return;
  }
  const { schedule, month, year } = appState.currentSchedule;
  const summary = computeSummaryFromSchedule(schedule, appState.workers);

  const padding = 20;
  const nameColWidth = 200;
  const cellWidth = 50;
  const rowHeight = 26;
  const headerHeight = 36;
  const summaryRowHeight = 24;
  const summaryHeaderHeight = 28;
  const gapAfterTable = 18;
  const titleHeight = 30;

  const tableWidth = nameColWidth + schedule.days.length * cellWidth;
  const tableHeight = headerHeight + schedule.rows.length * rowHeight;
  const summaryHeight =
    (summary.length > 0 ? summaryHeaderHeight + summary.length * summaryRowHeight : 0);

  const canvasWidth = padding * 2 + tableWidth;
  const canvasHeight = padding * 2 + titleHeight + tableHeight + gapAfterTable + summaryHeight;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = "#0b1425";
  ctx.font = "600 18px Arial, sans-serif";
  ctx.fillText(`Grafik ${MONTHS[month - 1]} ${year}`, padding, padding + titleHeight - 8);

  const tableStartY = padding + titleHeight;
  const tableStartX = padding;

  // Header
  ctx.font = "700 12px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f5f7ff";
  ctx.fillRect(tableStartX, tableStartY, nameColWidth, headerHeight);
  ctx.strokeStyle = "#e8ecfb";
  ctx.strokeRect(tableStartX, tableStartY, nameColWidth, headerHeight);
  ctx.fillStyle = "#0b1425";
  ctx.fillText("Pracownik", tableStartX + 10, tableStartY + headerHeight / 2);

  schedule.days.forEach((day, index) => {
    const x = tableStartX + nameColWidth + index * cellWidth;
    ctx.fillStyle = day.isSunday ? "#ffe0e5" : day.isSaturday ? "#d4f1df" : "#f5f7ff";
    ctx.fillRect(x, tableStartY, cellWidth, headerHeight);
    ctx.strokeStyle = "#e8ecfb";
    ctx.strokeRect(x, tableStartY, cellWidth, headerHeight);
    ctx.fillStyle = "#475569";
    ctx.font = "600 11px Arial, sans-serif";
    ctx.fillText(day.dow, x + 6, tableStartY + 12);
    ctx.font = "700 12px Arial, sans-serif";
    ctx.fillStyle = "#0b1425";
    ctx.fillText(String(day.day), x + 6, tableStartY + headerHeight - 10);
  });

  // Body
  const symbolColor = {
    D: "#0c6b2c",
    N: "#673ab7",
    U: "#0f4c81",
  };
  ctx.font = "600 12px Arial, sans-serif";
  schedule.rows.forEach((row, rowIndex) => {
    const y = tableStartY + headerHeight + rowIndex * rowHeight;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(tableStartX, y, nameColWidth, rowHeight);
    ctx.strokeStyle = "#e8ecfb";
    ctx.strokeRect(tableStartX, y, nameColWidth, rowHeight);
    ctx.fillStyle = "#0b1425";
    ctx.fillText(row.name, tableStartX + 10, y + rowHeight / 2);

    row.slots.forEach((slot, index) => {
      const x = tableStartX + nameColWidth + index * cellWidth;
      ctx.fillStyle =
        schedule.days[index].isSunday && !slot
          ? "#fff3f5"
          : schedule.days[index].isSaturday && !slot
            ? "#f2fbf6"
            : "#ffffff";
      ctx.fillRect(x, y, cellWidth, rowHeight);
      ctx.strokeStyle = "#e8ecfb";
      ctx.strokeRect(x, y, cellWidth, rowHeight);
      if (slot) {
        ctx.fillStyle = symbolColor[slot] || "#0b1425";
        ctx.fillText(slot, x + cellWidth / 2 - 4, y + rowHeight / 2);
      }
    });
  });

  if (summary.length > 0) {
    const summaryStartY = tableStartY + tableHeight + gapAfterTable;
    const colWidths = [180, 80, 60, 60, 80];
    const headers = ["Pracownik", "Godziny", "Dzień", "Noc", "Urlop"];

    let xCursor = padding;
    headers.forEach((label, i) => {
      const width = colWidths[i];
      ctx.fillStyle = "#f5f7ff";
      ctx.fillRect(xCursor, summaryStartY, width, summaryHeaderHeight);
      ctx.strokeStyle = "#e8ecfb";
      ctx.strokeRect(xCursor, summaryStartY, width, summaryHeaderHeight);
      ctx.fillStyle = "#0b1425";
      ctx.font = "700 12px Arial, sans-serif";
      ctx.fillText(label, xCursor + 8, summaryStartY + summaryHeaderHeight / 2);
      xCursor += width;
    });

    summary.forEach((item, idx) => {
      const rowY = summaryStartY + summaryHeaderHeight + idx * summaryRowHeight;
      xCursor = padding;
      const values = [
        item.name,
        `${item.totalHours}h`,
        String(item.dayCount),
        String(item.nightCount),
        String(item.holidayCount ?? 0),
      ];
      values.forEach((val, i) => {
        const width = colWidths[i];
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(xCursor, rowY, width, summaryRowHeight);
        ctx.strokeStyle = "#e8ecfb";
        ctx.strokeRect(xCursor, rowY, width, summaryRowHeight);
        ctx.fillStyle = "#0b1425";
        ctx.font = "600 12px Arial, sans-serif";
        ctx.fillText(val, xCursor + 8, rowY + summaryRowHeight / 2);
        xCursor += width;
      });
    });
  }

  canvas.toBlob((blob) => {
    if (!blob) {
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const monthLabel = MONTHS[month - 1] || "grafik";
    link.download = `grafik-${monthLabel}-${year}.png`;
    link.click();
    URL.revokeObjectURL(url);
  });
}

/**
 * Exports schedule to JSON file.
 * @param {import("../state/appState.js").AppState} appState
 */
export function exportScheduleToJson(appState) {
  if (!appState.currentSchedule) {
    alert("Brak grafiku do eksportu.");
    return;
  }
  const payload = createExportPayload(appState);
  payload.notes = typeof appState.notes === "string" ? appState.notes : payload.notes;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const monthLabel = MONTHS[appState.currentSchedule.month - 1] || "grafik";
  link.download = `grafik-${monthLabel}-${appState.currentSchedule.year}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Renders schedule table with highlights and interactive controls.
 * @param {import("../types.js").Schedule | null} schedule
 * @param {{ columns?: number[]; cells?: Array<{ rowId: string; dayIndex: number }> }} highlights
 * @param {{
 *  onSlotChange: (rowId: string, dayIndex: number, value: string | null) => void;
 *  onToggleLock: (rowId: string, dayIndex: number) => void;
 *  onToggleColumnLock: (dayIndex: number) => void;
 *  onToggleRowLock: (rowId: string) => void;
 *  onReorderRow?: (
 *    sourceRowId: string,
 *    targetRowId: string,
 *    placement: "before" | "after",
 *  ) => void;
 * }} handlers
 * @param {{ scheduleOutput: HTMLElement; summaryCardsContainer: HTMLElement }} targets
 * @param {{ useWorkerColors?: boolean }} [options]
 */
export function renderSchedule(schedule, highlights, handlers, targets, options = {}) {
  const { scheduleOutput, summaryCardsContainer } = targets;
  const {
    onSlotChange,
    onToggleLock,
    onToggleColumnLock,
    onToggleRowLock,
    onReorderRow,
  } = handlers;
  scheduleOutput.innerHTML = "";
  const shouldUseWorkerColors = Boolean(options.useWorkerColors);
  if (!schedule) {
    scheduleOutput.classList.add("empty-state");
    scheduleOutput.innerHTML = "<p>Dodaj recepcjonistów przed generowaniem.</p>";
    summaryCardsContainer.innerHTML = "";
    return;
  }
  scheduleOutput.classList.remove("empty-state");
  let draggingRowId = null;

  const highlightedColumns = new Set(highlights.columns || []);
  const highlightedCells = new Set(
    (highlights.cells || []).map((cell) => `${cell.rowId}:${cell.dayIndex}`),
  );
  const columnLockStates = schedule.days.map((_, index) =>
    schedule.rows.length
      ? schedule.rows.every((row) => Array.isArray(row.locks) && row.locks[index])
      : false,
  );
  const table = document.createElement("table");
  table.className = "schedule-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const firstHeaderCell = document.createElement("th");
  firstHeaderCell.textContent = "Recepcjonista";
  headRow.append(firstHeaderCell);

  schedule.days.forEach((day, index) => {
    const th = document.createElement("th");
    const headerContent = document.createElement("div");
    headerContent.className = "day-header";
    const lockButton = document.createElement("button");
    lockButton.type = "button";
    const isLockedCol = columnLockStates[index];
    lockButton.className = isLockedCol ? "lock-btn locked header-lock-btn" : "lock-btn header-lock-btn";
    lockButton.innerHTML = isLockedCol ? "🔒" : "🔓";
    lockButton.title = isLockedCol ? "Odblokuj dzień" : "Zablokuj dzień";
    lockButton.addEventListener("click", () => {
      onToggleColumnLock(index);
    });
    headerContent.append(lockButton);

    const label = document.createElement("div");
    label.innerHTML = `<span class="day-name">${day.dow}</span><span class="day-number">${day.day}</span>`;
    headerContent.append(label);
    th.append(headerContent);
    if (day.isSaturday) {
      th.classList.add("day-saturday-header");
    }
    if (day.isSunday) {
      th.classList.add("day-sunday-header");
    }
    if (highlightedColumns.has(index)) {
      th.classList.add("day-warning");
    }
    headRow.append(th);
  });
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  const clearDragStyles = () => {
    tbody.querySelectorAll(".drop-target-before, .drop-target-after").forEach((el) => {
      el.classList.remove("drop-target-before", "drop-target-after");
    });
    tbody.querySelectorAll(".dragging").forEach((el) => {
      el.classList.remove("dragging");
    });
  };
  schedule.rows.forEach((row) => {
    const tr = document.createElement("tr");
    const rowColor = shouldUseWorkerColors && row.color ? row.color : null;
    if (rowColor) {
      tr.classList.add("row-colored");
      tr.style.setProperty("--worker-color", rowColor);
    }
    tr.dataset.rowId = row.id;
    const th = document.createElement("th");
    const rowHeader = document.createElement("div");
    rowHeader.className = "row-header";
    const rowHeaderTitle = document.createElement("div");
    rowHeaderTitle.className = "row-header__title";

    const dragHandle = document.createElement("button");
    dragHandle.type = "button";
    dragHandle.className = "drag-handle";
    dragHandle.title = "Przeciągnij, aby zmienić kolejność";
    dragHandle.setAttribute("aria-label", "Przeciągnij, aby zmienić kolejność");
    dragHandle.textContent = "⋮⋮";
    dragHandle.draggable = true;
    dragHandle.addEventListener("dragstart", (event) => {
      draggingRowId = row.id;
      clearDragStyles();
      tr.classList.add("dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", row.id);
      }
    });
    dragHandle.addEventListener("dragend", () => {
      draggingRowId = null;
      clearDragStyles();
    });

    const nameSpan = document.createElement("span");
    nameSpan.textContent = row.name;
    rowHeaderTitle.append(dragHandle);
    rowHeaderTitle.append(nameSpan);
    rowHeader.append(rowHeaderTitle);
    const rowLocked = Array.isArray(row.locks) && row.locks.length ? row.locks.every(Boolean) : false;
    const rowLockButton = document.createElement("button");
    rowLockButton.type = "button";
    rowLockButton.className = rowLocked ? "lock-btn locked header-lock-btn" : "lock-btn header-lock-btn";
    rowLockButton.innerHTML = rowLocked ? "🔒" : "🔓";
    rowLockButton.title = rowLocked ? "Odblokuj osobę" : "Zablokuj osobę";
    rowLockButton.addEventListener("click", () => {
      onToggleRowLock(row.id);
    });
    rowHeader.append(rowLockButton);
    th.append(rowHeader);
    tr.append(th);
    const getPlacement = (event) => {
      const rect = tr.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      return event.clientY > midpoint ? "after" : "before";
    };
    tr.addEventListener("dragover", (event) => {
      if (!draggingRowId || draggingRowId === row.id) {
        return;
      }
      event.preventDefault();
      const placement = getPlacement(event);
      tr.classList.remove("drop-target-before", "drop-target-after");
      tr.classList.add(placement === "after" ? "drop-target-after" : "drop-target-before");
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    });
    tr.addEventListener("dragleave", () => {
      tr.classList.remove("drop-target-before", "drop-target-after");
    });
    tr.addEventListener("drop", (event) => {
      if (!draggingRowId || draggingRowId === row.id) {
        clearDragStyles();
        return;
      }
      event.preventDefault();
      const placement = getPlacement(event);
      const sourceId =
        draggingRowId || (event.dataTransfer ? event.dataTransfer.getData("text/plain") : "");
      clearDragStyles();
      if (sourceId && typeof onReorderRow === "function") {
        onReorderRow(sourceId, row.id, placement);
      }
      draggingRowId = null;
    });
    row.slots.forEach((slot, index) => {
      const td = document.createElement("td");
      const isLocked = Array.isArray(row.locks) ? Boolean(row.locks[index]) : false;
      const dayMeta = schedule.days[index];
      if (dayMeta?.isSaturday) {
        td.classList.add("day-saturday");
      }
      if (dayMeta?.isSunday) {
        td.classList.add("day-sunday");
      }
      const cellKey = `${row.id}:${index}`;
      const isHighlighted = highlightedColumns.has(index) || highlightedCells.has(cellKey);
      if (isHighlighted) {
        td.classList.add("day-warning");
      }
      if (isLocked) {
        td.classList.add("cell-locked");
      }
      const cellWrapper = document.createElement("div");
      cellWrapper.className = "cell-wrapper";

      const lockButton = document.createElement("button");
      lockButton.type = "button";
      lockButton.className = isLocked ? "lock-btn locked" : "lock-btn";
      lockButton.textContent = isLocked ? "🔒" : "🔓";
      lockButton.title = isLocked ? "Odblokuj komórkę" : "Zablokuj komórkę";
      lockButton.addEventListener("click", () => {
        onToggleLock(row.id, index);
      });

      const select = document.createElement("select");
      select.className = "slot-select";
      [
        { value: "", label: "–" },
        { value: "D", label: "D" },
        { value: "N", label: "N" },
        { value: "U", label: "U" },
      ].forEach((optionDef) => {
        const option = document.createElement("option");
        option.value = optionDef.value;
        option.textContent = optionDef.label;
        select.append(option);
      });
      select.value = slot || "";
      select.disabled = isLocked;
      select.addEventListener("change", (event) => {
        const newValue = event.target.value;
        onSlotChange(row.id, index, newValue === "" ? null : newValue);
      });
      applySlotClasses(td, select.value);
      cellWrapper.append(lockButton);
      cellWrapper.append(select);
      td.append(cellWrapper);
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody);
  scheduleOutput.append(table);
}

/**
 * Applies color classes for schedule cells.
 * @param {HTMLElement} cell
 * @param {string | null} value
 */
export function applySlotClasses(cell, value) {
  cell.classList.remove("shift-day", "shift-night", "shift-off", "shift-holiday");
  if (value === "D") {
    cell.classList.add("shift-day");
  } else if (value === "N") {
    cell.classList.add("shift-night");
  } else if (value === "U") {
    cell.classList.add("shift-holiday");
  } else {
    cell.classList.add("shift-off");
  }
}

/**
 * Renders warnings list and toggles visibility section.
 * @param {string[]} warnings
 * @param {{ list: HTMLElement; section: HTMLElement | null }} targets
 */
export function renderWarnings(warnings, targets) {
  const { list } = targets;
  list.innerHTML = "";
  if (!warnings.length) {
    return;
  }
  warnings.forEach((warning) => {
    const li = document.createElement("li");
    li.textContent = warning;
    list.append(li);
  });
}

/**
 * Renders summary table.
 * @param {import("../types.js").SummaryEntry[]} summary
 * @param {HTMLElement} container
 */
export function renderSummary(summary, container) {
  container.innerHTML = "";
  if (!summary.length) {
    return;
  }
  const table = document.createElement("table");
  table.className = "summary-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Recepcjonista", "Godziny", "Dzień", "Noc", "Urlop", "Nadgodziny", "Uwagi"].forEach(
    (label) => {
      const th = document.createElement("th");
      th.textContent = label;
      headRow.append(th);
    },
  );
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  summary.forEach((item) => {
    const tr = document.createElement("tr");
    const overtime = item.overtimeHours > 0 ? `${item.overtimeHours}h` : "0h";
    const holidayCount = item.holidayCount ?? 0;
    const warningsText = item.warnings.length ? item.warnings.join("; ") : "—";
    [
      item.name,
      `${item.totalHours}h`,
      String(item.dayCount),
      String(item.nightCount),
      String(holidayCount),
      overtime,
      warningsText,
    ].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody);
  container.append(table);
}

/**
 * Updates schedule period text based on month/year.
 * @param {number} month
 * @param {number} year
 * @param {HTMLElement | null} target
 * @param {string[]} months
 */
export function updateSchedulePeriodText(month, year, target, months) {
  if (!target) {
    return;
  }
  const monthLabel = months[month - 1] || "";
  if (!monthLabel || !year) {
    target.textContent = "";
    return;
  }
  target.textContent = `${monthLabel} ${year}`;
}

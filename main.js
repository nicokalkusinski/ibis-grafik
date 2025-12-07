const monthSelect = document.querySelector("#month-select");
const yearSelect = document.querySelector("#year-select");
const workerForm = document.querySelector("#worker-form");
const workerSubmitButton = document.querySelector("#worker-submit-btn");
const cancelEditButton = document.querySelector("#cancel-edit-btn");
const workerListElement = document.querySelector("#worker-list");
const generateButton = document.querySelector("#generate-btn");
const exportButton = document.querySelector("#export-btn");
const exportJsonButton = document.querySelector("#export-json-btn");
const importJsonInput = document.querySelector("#import-json-input");
const scheduleOutput = document.querySelector("#schedule-output");
const schedulePeriod = document.querySelector("#schedule-period");
const warningsList = document.querySelector("#warnings-list");
const summaryCardsContainer = document.querySelector("#summary-cards");
const workerRowTemplate = document.querySelector("#worker-row-template");
const warningsSection = document.querySelector("#warnings-section");
const workerModal = document.querySelector("#worker-modal");
const workerModalTitle = document.querySelector("#modal-title");
const openWorkerModalButton = document.querySelector("#open-worker-modal");
const closeWorkerModalButton = document.querySelector("#close-worker-modal");

const MONTHS = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

const DAY_NAMES = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];

const STORAGE_KEY = "receptionAgendaWorkers";
const BUTTON_LABELS = {
  add: "Dodaj recepcjonistę",
  save: "Zapisz zmiany",
};
const MAX_STREAK = {
  D: 3,
  N: 2,
};
const BLOCK_TARGETS = {
  D: { min: 1, max: 3 },
  N: { min: 1, max: 2 },
};
const DEFAULT_FORM_NUMBERS = {
  maxHours: 168,
  shiftHours: 12,
};

const DEFAULT_FORM_VALUES = {
  maxHours: String(DEFAULT_FORM_NUMBERS.maxHours),
  shiftHours: String(DEFAULT_FORM_NUMBERS.shiftHours),
  preference: "balanced",
  blockedWeekdays: [],
};

const appState = {
  workers: [],
  editingWorkerId: null,
  currentSchedule: null,
};

hydrateWorkersFromStorage();
initSelectors();
workerForm.reset();
setDefaultFormValues();
renderWorkers();
updateSchedulePeriodText(Number(monthSelect.value), Number(yearSelect.value));
scheduleOutput.classList.add("empty-state");

if (openWorkerModalButton) {
  openWorkerModalButton.addEventListener("click", () => {
    showWorkerModal("add");
  });
}

if (closeWorkerModalButton) {
  closeWorkerModalButton.addEventListener("click", () => {
    closeWorkerModal();
  });
}

if (workerModal) {
  workerModal.addEventListener("click", (event) => {
    if (event.target === workerModal) {
      closeWorkerModal();
    }
  });
  workerModal.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeWorkerModal();
  });
}

workerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(workerForm);
  const payload = extractWorkerPayload(formData);
  if (!payload.name) {
    return;
  }

  if (appState.editingWorkerId) {
    appState.workers = appState.workers.map((existing) =>
      existing.id === appState.editingWorkerId ? { ...existing, ...payload } : existing,
    );
    persistWorkers();
    renderWorkers();
    exitEditingMode();
    return;
  }

  const worker = {
    id: createWorkerId(),
    order: appState.workers.length,
    ...payload,
  };

  appState.workers.push(worker);
  persistWorkers();
  renderWorkers();
  workerForm.reset();
  setDefaultFormValues();
});

cancelEditButton.addEventListener("click", () => {
  exitEditingMode();
});

generateButton.addEventListener("click", () => {
  if (appState.workers.length === 0) {
    appState.currentSchedule = null;
    renderSchedule(null);
    renderWarnings(["Najpierw dodaj co najmniej jednego recepcjonistę."]);
    return;
  }
  const month = Number(monthSelect.value);
  const year = Number(yearSelect.value);
  const existingLocks = appState.currentSchedule ? appState.currentSchedule.schedule.rows : [];
  const schedule = buildSchedule(appState.workers, month, year, existingLocks);
  appState.currentSchedule = { schedule, month, year };
  renderAppSchedule();
});

monthSelect.addEventListener("change", () => {
  updateSchedulePeriodText(Number(monthSelect.value), Number(yearSelect.value));
});

yearSelect.addEventListener("change", () => {
  updateSchedulePeriodText(Number(monthSelect.value), Number(yearSelect.value));
});

if (exportButton) {
  exportButton.addEventListener("click", () => {
    exportScheduleToPng();
  });
}

if (exportJsonButton) {
  exportJsonButton.addEventListener("click", () => {
    exportScheduleToJson();
  });
}

if (importJsonInput) {
  importJsonInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      importScheduleFromJson(data);
    } catch (error) {
      alert("Nie udało się wczytać pliku JSON.");
      console.error(error);
    } finally {
      importJsonInput.value = "";
    }
  });
}

function initSelectors() {
  const now = new Date();
  MONTHS.forEach((label, index) => {
    const option = document.createElement("option");
    option.value = String(index + 1);
    option.textContent = label;
    if (index === now.getMonth()) {
      option.selected = true;
    }
    monthSelect.append(option);
  });

  const currentYear = now.getFullYear();
  for (let year = currentYear - 1; year <= currentYear + 3; year += 1) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    if (year === currentYear) {
      option.selected = true;
    }
    yearSelect.append(option);
  }
}

function renderWorkers() {
  workerListElement.innerHTML = "";
  if (appState.workers.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Brak recepcjonistów.";
    empty.style.color = "#5f6c8f";
    workerListElement.append(empty);
    return;
  }

  appState.workers.forEach((worker) => {
    const row = workerRowTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector("[data-worker-name]").textContent = worker.name;
    const details = `${worker.shiftHours}h zmiana • ≤${worker.maxHours}h / miesiąc`;
    row.querySelector("[data-worker-details]").textContent = details;
    row.querySelector("[data-worker-preference]").textContent = formatPreference(worker.preference);
    const blockedTags = [];
    if (Array.isArray(worker.blockedWeekdays) && worker.blockedWeekdays.length) {
      const names = worker.blockedWeekdays
        .map((dow) => DAY_NAMES[dow] || "")
        .filter(Boolean)
        .join(", ");
      blockedTags.push(`Nie pracuje: ${names}`);
    }
    if (blockedTags.length) {
      const tagGrid = row.querySelector(".tag-grid");
      blockedTags.forEach((text) => {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = text;
        tagGrid.append(tag);
      });
    }
    const editButton = row.querySelector(".edit-btn");
    editButton.addEventListener("click", () => {
      startEditing(worker);
    });
    const deleteButton = row.querySelector(".delete-btn");
    deleteButton.addEventListener("click", () => {
      deleteWorker(worker.id);
    });
    workerListElement.append(row);
  });
}

function renderAppSchedule() {
  const selectedMonth = appState.currentSchedule ? appState.currentSchedule.month : Number(monthSelect.value);
  const selectedYear = appState.currentSchedule ? appState.currentSchedule.year : Number(yearSelect.value);
  updateSchedulePeriodText(selectedMonth, selectedYear);

  if (!appState.currentSchedule) {
    renderSchedule(null);
    renderWarnings([]);
    renderSummary([]);
    return;
  }
  const { schedule, month, year } = appState.currentSchedule;
  const insights = deriveScheduleInsights(schedule, month, year, appState.workers);
  renderSchedule(schedule, {
    columns: insights.coverage.missingDayIndexes,
    cells: [...insights.nightToDay.cells, ...insights.blockedDay.cells],
  });
  renderWarnings(insights.warnings);
  renderSummary(insights.summary);
}

function renderSchedule(schedule, highlights = { columns: [], cells: [] }) {
  scheduleOutput.innerHTML = "";
  if (!schedule) {
    scheduleOutput.classList.add("empty-state");
    scheduleOutput.innerHTML = "<p>Dodaj recepcjonistów przed generowaniem.</p>";
    summaryCardsContainer.innerHTML = "";
    return;
  }
  scheduleOutput.classList.remove("empty-state");

  const highlightedColumns = new Set(highlights.columns || []);
  const highlightedCells = new Set(
    (highlights.cells || []).map((cell) => `${cell.rowId}:${cell.dayIndex}`),
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
    th.innerHTML = `<div><span class="day-name">${day.dow}</span><span class="day-number">${day.day}</span></div>`;
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
  schedule.rows.forEach((row) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = row.name;
    tr.append(th);
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
        toggleCellLock(row.id, index);
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
        updateSlotValue(row.id, index, newValue === "" ? null : newValue);
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

function applySlotClasses(cell, value) {
  cell.classList.remove("shift-day", "shift-night", "shift-off");
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

function updateSlotValue(rowId, dayIndex, value) {
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
  renderAppSchedule();
}

function toggleCellLock(rowId, dayIndex) {
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
  renderAppSchedule();
}

function renderWarnings(warnings) {
  warningsList.innerHTML = "";
  if (warningsSection) {
    warningsSection.hidden = warnings.length === 0;
  }
  if (!warnings.length) {
    return;
  }
  warnings.forEach((warning) => {
    const li = document.createElement("li");
    li.textContent = warning;
    warningsList.append(li);
  });
}

function renderSummary(summary) {
  summaryCardsContainer.innerHTML = "";
  if (!summary.length) {
    return;
  }
  const table = document.createElement("table");
  table.className = "summary-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Recepcjonista", "Godziny", "Dzień", "Noc", "Urlop", "Nadgodziny", "Uwagi"].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    headRow.append(th);
  });
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
  summaryCardsContainer.append(table);
}

function showWorkerModal(mode = "add") {
  if (mode !== "edit") {
    exitEditingMode();
  }
  if (workerModalTitle) {
    workerModalTitle.textContent = mode === "edit" ? "Edytuj osobę" : "Dodaj osobę";
  }
  if (!workerModal) {
    return;
  }
  if (typeof workerModal.showModal === "function") {
    workerModal.showModal();
  } else {
    workerModal.setAttribute("open", "true");
  }
}

function closeWorkerModal() {
  if (workerModal) {
    if (typeof workerModal.close === "function") {
      workerModal.close();
    } else {
      workerModal.removeAttribute("open");
    }
  }
  exitEditingMode();
}

function extractWorkerPayload(formData) {
  const rawName = formData.get("worker-name");
  const name = rawName ? rawName.trim() : "";
  const blockedWeekdays = getCheckboxValues(workerForm.querySelector("#worker-block-weekdays"));
  return {
    name,
    maxHours: sanitizeNumber(
      formData.get("worker-max-hours"),
      DEFAULT_FORM_NUMBERS.maxHours,
      { min: 12 },
    ),
    shiftHours: sanitizeNumber(
      formData.get("worker-shift-hours"),
      DEFAULT_FORM_NUMBERS.shiftHours,
      { min: 4 },
    ),
    preference: formData.get("worker-preference") || DEFAULT_FORM_VALUES.preference,
    noWeekends: false,
    enforceHourCap: formData.get("worker-limit-hours") === "on",
    blockedWeekdays,
  };
}

function startEditing(worker) {
  appState.editingWorkerId = worker.id;
  workerForm.querySelector("#worker-name").value = worker.name;
  workerForm.querySelector("#worker-max-hours").value = String(worker.maxHours);
  workerForm.querySelector("#worker-shift-hours").value = String(worker.shiftHours);
  workerForm.querySelector("#worker-preference").value = worker.preference;
  workerForm.querySelector("#worker-limit-hours").checked = Boolean(worker.enforceHourCap);
  setCheckboxValues(workerForm.querySelector("#worker-block-weekdays"), worker.blockedWeekdays || []);
  workerSubmitButton.textContent = BUTTON_LABELS.save;
  cancelEditButton.hidden = false;
  showWorkerModal("edit");
}

function exitEditingMode() {
  appState.editingWorkerId = null;
  workerForm.reset();
  setDefaultFormValues();
  workerSubmitButton.textContent = BUTTON_LABELS.add;
  cancelEditButton.hidden = true;
  if (workerModalTitle) {
    workerModalTitle.textContent = "Dodaj osobę";
  }
}

function setDefaultFormValues() {
  workerForm.querySelector("#worker-max-hours").value = DEFAULT_FORM_VALUES.maxHours;
  workerForm.querySelector("#worker-shift-hours").value = DEFAULT_FORM_VALUES.shiftHours;
  workerForm.querySelector("#worker-preference").value = DEFAULT_FORM_VALUES.preference;
  workerForm.querySelector("#worker-limit-hours").checked = false;
  setCheckboxValues(workerForm.querySelector("#worker-block-weekdays"), []);
}

function deleteWorker(workerId) {
  const wasEditing = appState.editingWorkerId === workerId;
  appState.workers = appState.workers.filter((item) => item.id !== workerId);
  persistWorkers();
  renderWorkers();
  if (wasEditing) {
    exitEditingMode();
  }
}

function hydrateWorkersFromStorage() {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return;
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return;
    }
    const normalized = parsed
      .filter((item) => item && typeof item.id === "string")
      .map((item, index) => {
        const orderValue = Number(item.order);
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
          blockedWeekdays: Array.isArray(item.blockedWeekdays)
            ? item.blockedWeekdays
                .map((value) => Number(value))
                .filter((num) => Number.isFinite(num))
            : [],
        };
      });
    normalized.sort((a, b) => a.order - b.order);
    appState.workers = normalized;
  } catch {
    // ignore storage failures
  }
}

function persistWorkers() {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.workers));
  } catch {
    // ignore storage failures
  }
}

function createWorkerId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitizeNumber(value, fallback, options = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  if (typeof options.min === "number" && parsed < options.min) {
    return fallback;
  }
  return parsed;
}

function getCheckboxValues(container) {
  if (!container) {
    return [];
  }
  const inputs = container.querySelectorAll('input[type="checkbox"]');
  return Array.from(inputs)
    .filter((input) => input.checked)
    .map((input) => Number(input.value))
    .filter((num) => Number.isFinite(num));
}

function setCheckboxValues(container, values) {
  if (!container) {
    return;
  }
  const valueSet = new Set(values);
  const inputs = container.querySelectorAll('input[type="checkbox"]');
  inputs.forEach((input) => {
    const numeric = Number(input.value);
    input.checked = Number.isFinite(numeric) && valueSet.has(numeric);
  });
}

function formatPreference(value) {
  switch (value) {
    case "prefer-days":
      return "Woli zmiany dzienne";
    case "prefer-nights":
      return "Woli zmiany nocne";
    case "only-days":
      return "Tylko zmiany dzienne";
    case "only-nights":
      return "Tylko zmiany nocne";
    default:
      return "Bez preferencji";
  }
}

function buildSchedule(workers, month, year, lockedRows = []) {
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
      fairnessBias: Math.random(),
      dayAssignments: 0,
      nightAssignments: 0,
      block: { type: null, length: 0, target: 0 },
    });
  });

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
  };

  function assignShift(kind, meta) {
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
    const symbol = kind === "day" ? "D" : "N";
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
      forcedWarnings.push(
        `${formatDate(meta.date)} przypisano ${chosen.worker.name} pomimo blokady dnia.`,
      );
    }
    updateBlockState(chosen, symbol, meta.index);
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
    if (kind === "day" && exceedsConsecutiveLimit(slots, meta.index, "D")) {
      return false;
    }
    if (kind === "night" && exceedsConsecutiveLimit(slots, meta.index, "N")) {
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
    if (
      Array.isArray(worker.blockedWeekdays) &&
      worker.blockedWeekdays.includes(meta.date.getDay()) &&
      !allowBlocked
    ) {
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
      score += dayAssignments * 1.5;
      if (worker.preference === "prefer-days") {
        score -= 30;
      } else if (worker.preference === "prefer-nights") {
        score += 25;
      } else if (worker.preference === "only-nights") {
        score += 110;
      } else if (worker.preference === "only-days") {
        score -= 65;
      }
    } else if (kind === "night") {
      score += Math.max(-balanceGap, 0) * 12;
      score += nightAssignments * 2;
      if (worker.preference === "prefer-nights") {
        score -= 50;
      } else if (worker.preference === "only-nights") {
        score -= 90;
      } else if (worker.preference === "prefer-days") {
        score += 20;
      } else if (worker.preference === "only-days") {
        score += 130;
      }
      if (meta.index > 0 && slots[meta.index - 1] === "N") {
        score += 10;
      }
    }
    if (meta.index > 0 && slots[meta.index - 1] === "D" && kind === "day") {
      score += 5;
    }
    score += entry.order * 0.01;
    score += entry.fairnessBias;
    score += Math.random();
    return score;
  }
}

function formatDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function updateSchedulePeriodText(month, year) {
  if (!schedulePeriod) {
    return;
  }
  const monthLabel = MONTHS[month - 1] || "";
  if (!monthLabel || !year) {
    schedulePeriod.textContent = "";
    return;
  }
  schedulePeriod.textContent = `${monthLabel} ${year}`;
}

function deriveScheduleInsights(schedule, month, year, workers) {
  const coverage = computeCoverage(schedule, month, year);
  const nightToDay = computeNightToDayWarnings(schedule, month, year);
  const blockedDay = computeBlockedDayWarnings(schedule, appState.workers);
  const summary = computeSummaryFromSchedule(schedule, workers);
  const summaryWarnings = summary.flatMap((entry) => entry.warnings);
  return {
    coverage,
    nightToDay,
    blockedDay,
    summary,
    warnings: [
      ...(schedule?.warnings || []),
      ...coverage.warnings,
      ...nightToDay.warnings,
      ...blockedDay.warnings,
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
  const workerMap = new Map();
  workers.forEach((worker) => {
    workerMap.set(worker.id, worker);
  });

  schedule.rows.forEach((row) => {
    const worker = workerMap.get(row.id);
    if (!worker || !Array.isArray(worker.blockedWeekdays) || worker.blockedWeekdays.length === 0) {
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
      if (worker.blockedWeekdays.includes(dowIndex)) {
        cells.push({ rowId: row.id, dayIndex: index });
        const date = dayMeta.date || new Date(dayMeta.year || new Date().getFullYear(), dowIndex, dayMeta.day);
        warnings.push(
          `${formatDate(date)} ${worker.name} ma blokadę dnia, a przydzielono zmianę ${slot}.`,
        );
      }
    });
  });

  return { cells, warnings };
}

function exportScheduleToPng() {
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
    const summaryTableWidth = colWidths.reduce((acc, val) => acc + val, 0);

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

function exportScheduleToJson() {
  if (!appState.currentSchedule) {
    alert("Brak grafiku do eksportu.");
    return;
  }
  const payload = {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    month: appState.currentSchedule.month,
    year: appState.currentSchedule.year,
    workers: appState.workers,
    schedule: appState.currentSchedule.schedule,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const monthLabel = MONTHS[appState.currentSchedule.month - 1] || "grafik";
  link.download = `grafik-${monthLabel}-${appState.currentSchedule.year}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importScheduleFromJson(data) {
  try {
    if (!data || typeof data !== "object") {
      throw new Error("Struktura JSON jest nieprawidłowa.");
    }
    const { workers, schedule, month, year } = data;
    if (!Array.isArray(workers) || !schedule) {
      throw new Error("Brakuje wymaganych pól (workers/schedule).");
    }
    const targetMonth = Number(month) || Number(monthSelect.value) || new Date().getMonth() + 1;
    const targetYear = Number(year) || Number(yearSelect.value) || new Date().getFullYear();
    const normalizedWorkers = normalizeImportedWorkers(workers);
    const normalizedSchedule = normalizeImportedSchedule(schedule, targetMonth, targetYear);

    appState.workers = normalizedWorkers;
    persistWorkers();
    renderWorkers();

    monthSelect.value = String(targetMonth);
    yearSelect.value = String(targetYear);

    appState.currentSchedule = {
      schedule: normalizedSchedule,
      month: targetMonth,
      year: targetYear,
    };
    renderAppSchedule();
  } catch (error) {
    alert("Nie udało się wczytać pliku JSON.");
    console.error(error);
  }
}

function normalizeImportedWorkers(list) {
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
      blockedWeekdays: Array.isArray(item.blockedWeekdays)
        ? item.blockedWeekdays
            .map((val) => Number(val))
            .filter((num) => Number.isFinite(num) && num >= 0 && num <= 6)
        : [],
    }))
    .sort((a, b) => a.order - b.order);
}

function normalizeImportedSchedule(rawSchedule, month, year) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, idx) => {
    const dayNum = (rawSchedule.days?.[idx]?.day ?? idx + 1);
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

  const rows = Array.isArray(rawSchedule.rows)
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

function computeSummaryFromSchedule(schedule, workers) {
  if (!schedule) {
    return [];
  }
  return schedule.rows.map((row) => {
    const worker = workers.find((item) => item.id === row.id);
    const shiftHours = worker ? worker.shiftHours : DEFAULT_FORM_NUMBERS.shiftHours;
    const maxHours = worker ? worker.maxHours : DEFAULT_FORM_NUMBERS.maxHours;
    const dayCount = row.slots.filter((slot) => slot === "D").length;
    const nightCount = row.slots.filter((slot) => slot === "N").length;
    const holidayCount = row.slots.filter((slot) => slot === "U").length;
    const totalHours = (dayCount + nightCount) * shiftHours;
    const overtimeHours = Math.max(0, totalHours - maxHours);
    const warnings = [];
    if (totalHours === 0) {
      warnings.push("Brak przydzielonych zmian.");
    }
    if (totalHours > 168) {
      warnings.push(`${row.name} przekracza 168h o ${totalHours - 168}h.`);
    }
    if (totalHours > maxHours) {
      warnings.push(`${row.name} zaplanowano ${totalHours}h przy limicie ${maxHours}h.`);
    }
    return {
      name: row.name,
      totalHours,
      nightsAssigned: nightCount,
      dayCount,
      nightCount,
      holidayCount,
      overtimeHours,
      warnings,
    };
  });
}

function updateBlockState(entry, symbol, index) {
  const isConsecutive = entry.lastAssignedIndex === index - 1 && entry.block.type === symbol;
  if (isConsecutive) {
    entry.block.length += 1;
  } else {
    entry.block = {
      type: symbol,
      length: 1,
      target: getRandomBlockLength(symbol),
    };
  }
}

function getRandomBlockLength(symbol) {
  const range = BLOCK_TARGETS[symbol];
  if (!range) {
    return 1;
  }
  return randomInt(range.min, range.max);
}

function randomInt(min, max) {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  if (upper <= lower) {
    return lower;
  }
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

function countConsecutiveShifts(slots, index, symbol) {
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

function exceedsConsecutiveLimit(slots, index, symbol) {
  const limit = MAX_STREAK[symbol] || 3;
  return countConsecutiveShifts(slots, index, symbol) >= limit;
}

import { MONTHS } from "./constants/dates.js";
import { appState } from "./state/appState.js";
import { hydrateSettingsFromStorage, hydrateWorkersFromStorage, persistSettings, persistWorkers } from "./state/persistence.js";
import { elements } from "./dom/elements.js";
import { initSelectors } from "./dom/selectors.js";
import { extractWorkerPayload, exitEditingMode, setDefaultFormValues, startEditingWorker } from "./workers/form.js";
import { renderWorkers } from "./workers/list.js";
import { buildSchedule } from "./schedule/engine.js";
import { deriveScheduleInsights } from "./schedule/insights.js";
import { renderSchedule, renderSummary, renderWarnings, updateSchedulePeriodText } from "./schedule/render.js";
import { setAllLocks, toggleCellLock, toggleColumnLock, toggleRowLock, updateSlotValue } from "./schedule/locks.js";
import { reorderScheduleRows } from "./schedule/reorder.js";
import { exportScheduleToJson, exportScheduleToPng } from "./io/exporters.js";
import { importScheduleFromJson } from "./io/importers.js";
import { readSettingsPayload, syncSettingsFormValues } from "./settings/form.js";
import { computeSummaryFromSchedule } from "./schedule/summary.js";
import { createWorkerId } from "./utils/id.js";

hydrateSettingsFromStorage(appState);
hydrateWorkersFromStorage(appState);
initSelectors(elements.monthSelect, elements.yearSelect, MONTHS);
elements.workerForm.reset();
setDefaultFormValues({
  workerForm: elements.workerForm,
  workerBlockShifts: elements.workerBlockShifts,
});
syncSettingsFormValues(appState, {
  dayInput: elements.settingsMaxStreakDayInput,
  nightInput: elements.settingsMaxStreakNightInput,
  anyInput: elements.settingsMaxStreakAnyInput,
});
renderWorkers(appState, {
  workerListElement: elements.workerListElement,
  workerRowTemplate: elements.workerRowTemplate,
}, {
  onEdit: handleStartEdit,
  onDelete: deleteWorker,
});
updateSchedulePeriodText(Number(elements.monthSelect.value), Number(elements.yearSelect.value), elements.schedulePeriod, MONTHS);
elements.scheduleOutput.classList.add("empty-state");

wireModals();
wireWorkerForm();
wireSettingsForm();
wireControls();

function wireModals() {
  if (elements.openWorkerModalButton) {
    elements.openWorkerModalButton.addEventListener("click", () => {
      showWorkerModal("add");
    });
  }

  if (elements.closeWorkerModalButton) {
    elements.closeWorkerModalButton.addEventListener("click", () => {
      closeWorkerModal();
    });
  }

  if (elements.workerModal) {
    elements.workerModal.addEventListener("click", (event) => {
      if (event.target === elements.workerModal) {
        closeWorkerModal();
      }
    });
    elements.workerModal.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeWorkerModal();
    });
  }

  if (elements.openSettingsModalButton) {
    elements.openSettingsModalButton.addEventListener("click", () => {
      showSettingsModal();
    });
  }

  if (elements.closeSettingsModalButton) {
    elements.closeSettingsModalButton.addEventListener("click", () => {
      closeSettingsModal();
    });
  }

  if (elements.cancelSettingsButton) {
    elements.cancelSettingsButton.addEventListener("click", () => {
      closeSettingsModal();
    });
  }

  if (elements.settingsModal) {
    elements.settingsModal.addEventListener("click", (event) => {
      if (event.target === elements.settingsModal) {
        closeSettingsModal();
      }
    });
    elements.settingsModal.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeSettingsModal();
    });
  }
}

function wireWorkerForm() {
  elements.workerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(elements.workerForm);
    const payload = extractWorkerPayload(formData, elements.workerForm);
    if (!payload.name) {
      return;
    }

    if (appState.editingWorkerId) {
      appState.workers = appState.workers.map((existing) =>
        existing.id === appState.editingWorkerId ? { ...existing, ...payload } : existing,
      );
      persistWorkers(appState);
      renderWorkers(appState, {
        workerListElement: elements.workerListElement,
        workerRowTemplate: elements.workerRowTemplate,
      }, {
        onEdit: handleStartEdit,
        onDelete: deleteWorker,
      });
      exitEditingMode(appState, {
        workerForm: elements.workerForm,
        workerSubmitButton: elements.workerSubmitButton,
        cancelEditButton: elements.cancelEditButton,
        workerModalTitle: elements.workerModalTitle,
        workerBlockShifts: elements.workerBlockShifts,
      });
      return;
    }

    const worker = {
      id: createWorkerId(),
      order: appState.workers.length,
      ...payload,
    };

    appState.workers.push(worker);
    persistWorkers(appState);
    renderWorkers(appState, {
      workerListElement: elements.workerListElement,
      workerRowTemplate: elements.workerRowTemplate,
    }, {
      onEdit: handleStartEdit,
      onDelete: deleteWorker,
    });
    elements.workerForm.reset();
    setDefaultFormValues({
      workerForm: elements.workerForm,
      workerBlockShifts: elements.workerBlockShifts,
    });
  });

  elements.cancelEditButton.addEventListener("click", () => {
    exitEditingMode(appState, {
      workerForm: elements.workerForm,
      workerSubmitButton: elements.workerSubmitButton,
      cancelEditButton: elements.cancelEditButton,
      workerModalTitle: elements.workerModalTitle,
      workerBlockShifts: elements.workerBlockShifts,
    });
  });
}

function wireSettingsForm() {
  if (!elements.settingsForm) {
    return;
  }
  elements.settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const payload = readSettingsPayload({
      dayInput: elements.settingsMaxStreakDayInput,
      nightInput: elements.settingsMaxStreakNightInput,
      anyInput: elements.settingsMaxStreakAnyInput,
    });
    appState.settings = payload;
    persistSettings(appState);
    closeSettingsModal();
    if (appState.currentSchedule) {
      renderAppSchedule();
    }
  });
}

function wireControls() {
  elements.generateButton.addEventListener("click", () => {
    generateSchedule();
  });

  elements.monthSelect.addEventListener("change", () => {
    updateSchedulePeriodText(Number(elements.monthSelect.value), Number(elements.yearSelect.value), elements.schedulePeriod, MONTHS);
  });

  elements.yearSelect.addEventListener("change", () => {
    updateSchedulePeriodText(Number(elements.monthSelect.value), Number(elements.yearSelect.value), elements.schedulePeriod, MONTHS);
  });

  if (elements.exportButton) {
    elements.exportButton.addEventListener("click", () => {
      exportScheduleToPng(appState);
    });
  }

  if (elements.exportJsonButton) {
    elements.exportJsonButton.addEventListener("click", () => {
      exportScheduleToJson(appState);
    });
  }

  if (elements.importJsonInput) {
    elements.importJsonInput.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const ok = importScheduleFromJson(
          data,
          appState,
          { monthSelect: elements.monthSelect, yearSelect: elements.yearSelect },
          persistWorkers,
        );
        if (ok) {
          renderWorkers(appState, {
            workerListElement: elements.workerListElement,
            workerRowTemplate: elements.workerRowTemplate,
          }, {
            onEdit: handleStartEdit,
            onDelete: deleteWorker,
          });
          renderAppSchedule();
        }
      } catch (error) {
        alert("Nie udało się wczytać pliku JSON.");
        console.error(error);
      } finally {
        elements.importJsonInput.value = "";
      }
    });
  }

  if (elements.blockAllButton) {
    elements.blockAllButton.addEventListener("click", () => {
      setAllLocks(appState, true);
      renderAppSchedule();
    });
  }

  if (elements.unblockAllButton) {
    elements.unblockAllButton.addEventListener("click", () => {
      setAllLocks(appState, false);
      renderAppSchedule();
    });
  }
}

function generateSchedule() {
  if (appState.workers.length === 0) {
    appState.currentSchedule = null;
    renderSchedule(null, { columns: [], cells: [] }, noopHandlers(), {
      scheduleOutput: elements.scheduleOutput,
      summaryCardsContainer: elements.summaryCardsContainer,
    });
    renderWarnings(["Najpierw dodaj co najmniej jednego recepcjonistę."], {
      list: elements.warningsList,
      section: elements.warningsSection,
    });
    return false;
  }
  const month = Number(elements.monthSelect.value);
  const year = Number(elements.yearSelect.value);
  const existingLocks = appState.currentSchedule ? appState.currentSchedule.schedule.rows : [];
  const schedule = buildSchedule(appState.workers, month, year, existingLocks, appState.settings);
  appState.currentSchedule = { schedule, month, year };
  renderAppSchedule();
  return true;
}

function renderAppSchedule() {
  const selectedMonth = appState.currentSchedule ? appState.currentSchedule.month : Number(elements.monthSelect.value);
  const selectedYear = appState.currentSchedule ? appState.currentSchedule.year : Number(elements.yearSelect.value);
  updateSchedulePeriodText(selectedMonth, selectedYear, elements.schedulePeriod, MONTHS);

  if (!appState.currentSchedule) {
    renderSchedule(null, { columns: [], cells: [] }, noopHandlers(), {
      scheduleOutput: elements.scheduleOutput,
      summaryCardsContainer: elements.summaryCardsContainer,
    });
    renderWarnings([], { list: elements.warningsList, section: elements.warningsSection });
    renderSummary([], elements.summaryCardsContainer);
    return;
  }
  const { schedule, month, year } = appState.currentSchedule;
  const summary = computeSummaryFromSchedule(schedule, appState.workers);
  appState.currentSchedule.schedule.summary = summary;
  const insights = deriveScheduleInsights(
    { ...schedule, summary },
    month,
    year,
    appState.workers,
    appState.settings,
  );
  renderSchedule(
    schedule,
    {
      columns: insights.coverage.missingDayIndexes,
      cells: [
        ...insights.nightToDay.cells,
        ...insights.blockedDay.cells,
        ...insights.streaks.cells,
      ],
    },
    {
      onSlotChange: (rowId, dayIndex, value) => {
        updateSlotValue(appState, rowId, dayIndex, value);
        renderAppSchedule();
      },
      onToggleLock: (rowId, dayIndex) => {
        toggleCellLock(appState, rowId, dayIndex);
        renderAppSchedule();
      },
      onToggleColumnLock: (dayIndex) => {
        toggleColumnLock(appState, dayIndex);
        renderAppSchedule();
      },
      onToggleRowLock: (rowId) => {
        toggleRowLock(appState, rowId);
        renderAppSchedule();
      },
      onReorderRow: (sourceRowId, targetRowId, placement) => {
        const changed = reorderScheduleRows(appState, sourceRowId, targetRowId, placement);
        if (changed) {
          renderWorkers(appState, {
            workerListElement: elements.workerListElement,
            workerRowTemplate: elements.workerRowTemplate,
          }, {
            onEdit: handleStartEdit,
            onDelete: deleteWorker,
          });
          renderAppSchedule();
        }
      },
    },
    {
      scheduleOutput: elements.scheduleOutput,
      summaryCardsContainer: elements.summaryCardsContainer,
    },
  );
  renderWarnings(insights.warnings, { list: elements.warningsList, section: elements.warningsSection });
  renderSummary(insights.summary, elements.summaryCardsContainer);
}

function handleStartEdit(worker) {
  startEditingWorker(
    worker,
    appState,
    {
      workerForm: elements.workerForm,
      workerSubmitButton: elements.workerSubmitButton,
      cancelEditButton: elements.cancelEditButton,
      workerModalTitle: elements.workerModalTitle,
      workerBlockShifts: elements.workerBlockShifts,
    },
    () => showWorkerModal("edit"),
  );
}

function deleteWorker(workerId) {
  const wasEditing = appState.editingWorkerId === workerId;
  appState.workers = appState.workers.filter((item) => item.id !== workerId);
  persistWorkers(appState);
  renderWorkers(appState, {
    workerListElement: elements.workerListElement,
    workerRowTemplate: elements.workerRowTemplate,
  }, {
    onEdit: handleStartEdit,
    onDelete: deleteWorker,
  });
  if (wasEditing) {
    exitEditingMode(appState, {
      workerForm: elements.workerForm,
      workerSubmitButton: elements.workerSubmitButton,
      cancelEditButton: elements.cancelEditButton,
      workerModalTitle: elements.workerModalTitle,
      workerBlockShifts: elements.workerBlockShifts,
    });
  }
}

function showWorkerModal(mode = "add") {
  if (mode !== "edit") {
    exitEditingMode(appState, {
      workerForm: elements.workerForm,
      workerSubmitButton: elements.workerSubmitButton,
      cancelEditButton: elements.cancelEditButton,
      workerModalTitle: elements.workerModalTitle,
      workerBlockShifts: elements.workerBlockShifts,
    });
  }
  if (elements.workerModalTitle) {
    elements.workerModalTitle.textContent = mode === "edit" ? "Edytuj osobę" : "Dodaj osobę";
  }
  if (!elements.workerModal) {
    return;
  }
  if (typeof elements.workerModal.showModal === "function") {
    elements.workerModal.showModal();
  } else {
    elements.workerModal.setAttribute("open", "true");
  }
}

function closeWorkerModal() {
  if (elements.workerModal) {
    if (typeof elements.workerModal.close === "function") {
      elements.workerModal.close();
    } else {
      elements.workerModal.removeAttribute("open");
    }
  }
  exitEditingMode(appState, {
    workerForm: elements.workerForm,
    workerSubmitButton: elements.workerSubmitButton,
    cancelEditButton: elements.cancelEditButton,
    workerModalTitle: elements.workerModalTitle,
    workerBlockShifts: elements.workerBlockShifts,
  });
}

function showSettingsModal() {
  syncSettingsFormValues(appState, {
    dayInput: elements.settingsMaxStreakDayInput,
    nightInput: elements.settingsMaxStreakNightInput,
    anyInput: elements.settingsMaxStreakAnyInput,
  });
  if (!elements.settingsModal) {
    return;
  }
  if (typeof elements.settingsModal.showModal === "function") {
    elements.settingsModal.showModal();
  } else {
    elements.settingsModal.setAttribute("open", "true");
  }
}

function closeSettingsModal() {
  if (elements.settingsModal) {
    if (typeof elements.settingsModal.close === "function") {
      elements.settingsModal.close();
    } else {
      elements.settingsModal.removeAttribute("open");
    }
  }
}

function noopHandlers() {
  return {
    onSlotChange: () => {},
    onToggleLock: () => {},
    onToggleColumnLock: () => {},
    onToggleRowLock: () => {},
    onReorderRow: () => {},
  };
}

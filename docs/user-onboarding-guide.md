# Reception Schedule App — Complete User Guide

This guide walks a first-time user through everything in the hotel reception schedule app. It assumes only basic spreadsheet skills. Follow it start to finish to learn what each button does, how the generator makes choices, and how to keep control with locks, preferences, and exports.

## What the app does
- Builds a monthly day/night duty schedule for the reception team.
- Balances hours and honors preferences while keeping within streak limits and worker hour caps.
- Lets you fine-tune the grid manually, lock what must not change, and regenerate the rest.
- Exports to PNG for printing/sharing and JSON for backup/transfer; remembers your data in the browser.

## Quick start (first use)
1) Open the app (you will see Polish labels).  
2) Click **Zarządzaj kadrą** → fill at least one worker (Imię i nazwisko, Maks. godziny, Preferencje) → **Dodaj recepcjonistę**. Repeat for the whole team.  
3) Optional: set streak limits in **Opcje grafiku** (Maks. dni/nocy pod rząd) and turn on **Używaj kolorów dla pracowników** if you picked colors.  
4) Pick the month and year at the top, then press **Generuj grafik**.  
5) Review warnings, adjust cells (D = day, N = night, U = urlop/wolne, blank = off), and lock what is final.  
6) Re-run **Generuj grafik** after edits; locked cells stay as-is.  
7) Export as **Zapisz PNG** for a picture or **Eksport JSON** for a backup. Use **Import JSON** to restore later.

## Key terms and legend
- **D** — Day shift.  
- **N** — Night shift.  
- **U** — Time off / vacation marker (set manually).  
- **Blank** — Unassigned/off.  
- **Lock 🔒/🔓** — Freezes a cell/row/column so regenerate cannot overwrite it.  
- **Warning highlight** — Yellow-tinted columns/cells where coverage is missing or a rule was broken (streak, blocked day, night→day, etc.).

## Layout tour
- **Top bar**: Month/year selectors and **Generuj grafik** to (re)build the table.
- **Schedule panel**:
  - **Zarządzaj kadrą** opens the worker list and form.
  - **Opcje grafiku** opens scheduling settings (streak limits, row coloring).
  - **Zablokuj wszystko / Odblokuj wszystko** locks or unlocks every cell at once.
  - **Zapisz PNG / Eksport JSON / Import JSON** handle exports/imports.
  - The table uses select boxes in each cell plus a small lock button.
  - Drag handle (⋮⋮) on each row lets you reorder workers; order is saved.
- **Warnings (Ostrzeżenia)**: List of issues the generator found (missing staff, blocked day forced, streaks, night→day transitions, overtime).
- **Podsumowania**: Per-worker totals (hours, day/night counts, urlop count, overtime, notes).

## Adding and editing workers (Zarządzaj kadrą)
- **Imię i nazwisko**: Required name shown in the table and exports.
- **Maks. godziny / miesiąc**: Target monthly cap. The generator tries to stay under this; if you also check **Nie przekraczaj limitu godzin**, it becomes a hard limit (the generator will leave cells empty rather than exceed it).
- **Shift length**: Fixed at 12h for everyone (cannot be changed).
- **Preferencje zmian**:
  - *Bez preferencji* — balanced.
  - *Woli dni* / *Woli noce* — prefers but can take both.
  - *Tylko dni* / *Tylko noce* — strict; the other shift is skipped.
- **Kolor pracownika**: Optional row color. Enable **Używaj kolorów dla pracowników** in settings to apply it to the grid.
- **Nie pracuje w (zmiany)**: Tick D or N under weekdays (Pn–Nd) to block those shifts every week. The generator avoids these; if no one else is available, it may break the block and show a warning.
- **Nie przekraczaj limitu godzin**: Makes the max-hours field a strict ceiling.
- **Edit/Delete**: Use **Edytuj** to adjust and **Usuń** to remove. Changes to an existing worker immediately refresh the current schedule.
- **Order**: Drag rows (⋮⋮) in the schedule; the order is remembered for the worker list and future runs.

## Schedule options (Opcje grafiku)
- **Maks. dni pod rząd (D)**: Maximum consecutive day shifts for any worker.
- **Maks. nocy pod rząd (N)**: Maximum consecutive night shifts.
- **Maks. zmian pod rząd (D lub N)**: Maximum consecutive shifts of any type.
- **Używaj kolorów dla pracowników**: Colors entire rows using the worker color you set.
- Saving options re-runs insights; regenerate to apply new limits to fresh assignments.

## Working with the schedule grid
- Each cell has a select:
  - Choose **D** or **N** to assign, **U** to mark leave, or leave blank for off.
  - Changes instantly refresh warnings and summary.
- **Locks**:
  - Each cell has its own lock button: freezes that one slot.
  - Column lock (lock icon in the column header): freezes that day for everyone.
  - Row lock (lock icon next to the worker’s name): freezes the whole month for that person.
  - **Zablokuj wszystko / Odblokuj wszystko**: toggles all cells at once.
  - Locked cells stay exactly as they are on regenerate (including manual D/N/U you set).
- **Reordering**: Drag the ⋮⋮ handle to move a worker up/down; this order is stored and used in exports.
- **Weekends**: Saturday/Sunday columns are shaded to stand out; they behave like regular days otherwise.

## How the generator decides assignments
- Fills each calendar day with one **D** and one **N** slot when possible.
- Respects locked cells first (keeps any existing D/N/U you locked).
- Tries to stay under each worker’s max hours; if a worker is marked “Nie przekraczaj limitu godzin,” it will never exceed their cap. Others may go slightly over to keep coverage.
- Honors **Tylko dni/Tylko noce** strictly; **Woli** options bias the scoring but still allow both shift types.
- Avoids **N→D** back-to-back for the same person (night followed by day next morning).
- Avoids blocked weekday shifts; if no valid candidate exists, it can force an assignment and will flag it.
- Balances workload: targets similar total hours and recovers idle workers after breaks.
- Balances day vs. night counts per worker to keep them even over the month.
- Limits streaks using your **Maks. dni/nocy/zmian pod rząd** settings; builds short streaks inside those limits and marks any overages.

## Warnings and highlights you’ll see
- Types: missing coverage, night→day sequences, blocked-day/shift violations, streak limit breaks, and summary issues (zero hours or overtime/over cap).
- **Brak obsady**: A day is missing D and/or N coverage (highlighted column).
- **N→D**: Same worker scheduled for night then immediately a day (both cells highlighted).
- **Blokada dnia/zmiany**: Worker assigned on a blocked weekday/shift (cell highlighted; warning explains).
- **Streak**: Worker exceeds the chosen streak limit (run of D or N, or too many shifts in a row).
- **Summary warnings**: Zero hours, over 168h/month, or over that worker’s max hours.
- **When they appear**: Immediately after you generate the schedule and every time you change a cell (D/N/U/blank) or locks—no need to click refresh.

## Exporting, importing, and saving
- **Auto-save**: Workers, settings, colors, and locks live in your browser storage on this device. Clearing site data resets them.
- **Eksport JSON**: Creates a portable backup (workers, schedule, month/year, locks, colors). Use it to move to another computer or keep a versioned copy.
- **Import JSON**: Load a saved file; month/year selectors update to the file, and both workers and the schedule are restored.
- **Zapisz PNG**: Saves an image of the table plus summary for printing or emailing.
- Tip: After big manual edits, export JSON so you can roll back if you try new options later.

## Common workflows and tips
- **Re-run safely**: Lock any cells you’re happy with, then hit **Generuj grafik** to let the app refill the rest without touching locked slots.
- **Mark vacations/off-days**: Set **U** in cells, lock them, then regenerate to fill the remaining gaps.
- **Handle overtime**: Increase a worker’s max hours (or uncheck “Nie przekraczaj limitu godzin”) if you need more coverage, or add more workers.
- **Fix missing coverage**: Add workers, relax blocked days, or loosen streak limits, then regenerate.
- **Colored rows**: Assign a color per worker and enable **Używaj kolorów dla pracowników** for quicker visual scanning.
- **Start fresh**: Remove workers and refresh, or clear browser/site data (this wipes saved workers/settings).

## FAQ
- **What do the letters mean?** D = day shift, N = night shift, U = vacation/off, blank = no assignment.
- **Why is a column yellow?** That date is missing a day and/or night assignment.
- **Why did a blocked day get filled?** No other option met the rules; the app forced it and listed it in warnings—unlock/edit that cell if needed.
- **How do I stop a person from being changed?** Lock their row (header lock) or individual cells before regenerating.
- **Can I change shift lengths?** No, all shifts are fixed at 12h.
- **How is data stored?** Locally in your browser; use JSON export/import to move it elsewhere or to keep backups.
- **How do I move data to another PC?** On the old PC use **Eksport JSON** to save a file, then on the new PC open the app and choose **Import JSON** to load it (month/year, workers, colors, locks, and the schedule all come over).

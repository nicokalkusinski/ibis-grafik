/**
 * @typedef {"balanced" | "prefer-days" | "prefer-nights" | "only-days" | "only-nights"} Preference
 */

/**
 * @typedef {Object} Worker
 * @property {string} id
 * @property {number} order
 * @property {string} name
 * @property {number} maxHours
 * @property {number} shiftHours
 * @property {Preference} preference
 * @property {boolean} enforceHourCap
 * @property {Record<number, Array<"D" | "N">>} blockedShifts
 * @property {boolean} [noWeekends]
 */

/**
 * @typedef {Object} Settings
 * @property {{ D: number; N: number; ANY: number }} maxStreak
 */

/**
 * @typedef {Object} ScheduleDay
 * @property {number} day
 * @property {string} dow
 * @property {Date} date
 * @property {boolean} isSaturday
 * @property {boolean} isSunday
 */

/**
 * @typedef {Object} ScheduleRow
 * @property {string} id
 * @property {string} name
 * @property {Array<"D" | "N" | "U" | null>} slots
 * @property {boolean[]} locks
 */

/**
 * @typedef {Object} SummaryEntry
 * @property {string} name
 * @property {number} totalHours
 * @property {number} nightsAssigned
 * @property {number} dayCount
 * @property {number} nightCount
 * @property {number} holidayCount
 * @property {number} overtimeHours
 * @property {string[]} warnings
 */

/**
 * @typedef {Object} Schedule
 * @property {ScheduleDay[]} days
 * @property {ScheduleRow[]} rows
 * @property {SummaryEntry[]} summary
 * @property {string[]} warnings
 * @property {{ rowId: string; dayIndex: number }[]=} forcedCells
 */

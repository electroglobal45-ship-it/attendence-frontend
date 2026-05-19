/**
 * Sandwich Leave Engine
 * If a holiday/weekly-off falls between two leave days,
 * that holiday is also counted as leave.
 *
 * Example: Saturday = Leave, Sunday = Holiday, Monday = Leave
 * → Sunday becomes Leave too.
 */

import { isWorkingDay } from './attendance.engine'

/**
 * Given a list of leave dates, detects any holidays/weekly-offs
 * sandwiched between them and returns the additional dates that
 * should be counted as leave.
 *
 * @param leaveDates       - sorted array of YYYY-MM-DD strings the employee is on leave
 * @param companyHolidays  - array of YYYY-MM-DD company holiday strings
 * @returns array of YYYY-MM-DD strings that are sandwiched holidays
 */
export function detectSandwichLeave(
  leaveDates: string[],
  companyHolidays: string[]
): string[] {
  if (leaveDates.length < 2) return []

  const leaveDateSet = new Set(leaveDates)
  const sandwichedDates: string[] = []

  // Sort leave dates
  const sorted = [...leaveDates].sort()

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = new Date(sorted[i])
    const end = new Date(sorted[i + 1])

    // Check all dates between start and end
    const current = new Date(start)
    current.setDate(current.getDate() + 1)

    while (current < end) {
      const dateStr = current.toISOString().split('T')[0]

      // If this date is NOT a working day (holiday/Sunday/3rd Saturday)
      // and is NOT already in the leave set → it's sandwiched
      if (!isWorkingDay(current, companyHolidays) && !leaveDateSet.has(dateStr)) {
        sandwichedDates.push(dateStr)
      }

      current.setDate(current.getDate() + 1)
    }
  }

  return sandwichedDates
}

/**
 * Returns total leave days including sandwiched holidays
 */
export function getTotalLeaveDaysWithSandwich(
  leaveDates: string[],
  companyHolidays: string[]
): { totalDays: number; sandwichedDates: string[] } {
  const sandwichedDates = detectSandwichLeave(leaveDates, companyHolidays)
  return {
    totalDays: leaveDates.length + sandwichedDates.length,
    sandwichedDates,
  }
}

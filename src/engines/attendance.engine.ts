/**
 * Attendance Engine
 * Implements all timing rules from the policy document:
 * - On-time (8:00–8:05) → Present, value 1
 * - Late buffer (8:05–8:30) → Late, allowed 4x/month, value 1
 * - 5th late in month → Half Day, value 0.5 (automatic)
 * - After 8:30 → Half Day, value 0.5 (not counted in late buffer)
 */

import {
  ONTIME_BUFFER_MINUTES,
  LATE_BUFFER_END_HOUR,
  LATE_BUFFER_END_MINUTE,
  LATE_BUFFER_MAX_PER_MONTH,
  ATTENDANCE_VALUE,
} from '@/constants/policy'
import type { AttendanceStatus } from '@/types/attendance.types'

export interface AttendanceResult {
  status: AttendanceStatus
  attendanceValue: number
  isLate: boolean
  incrementLateCount: boolean   // whether to add 1 to monthly late count
}

/**
 * Determines attendance status and value based on check-in time and
 * the employee's current late count for the month.
 *
 * @param checkInTime  - Date object of the check-in moment
 * @param currentMonthLateCount - how many times already late this month (before today)
 */
export function evaluateCheckIn(
  checkInTime: Date,
  currentMonthLateCount: number
): AttendanceResult {
  const hours = checkInTime.getHours()
  const minutes = checkInTime.getMinutes()
  const totalMinutes = hours * 60 + minutes

  // Office start: 8:00 AM = 480 minutes
  const officeStart = 8 * 60
  // On-time window end: 8:05 AM = 485 minutes
  const onTimeEnd = officeStart + ONTIME_BUFFER_MINUTES
  // Late buffer end: 8:30 AM = 510 minutes
  const lateBufferEnd = LATE_BUFFER_END_HOUR * 60 + LATE_BUFFER_END_MINUTE

  // ── On-time: 8:00 → 8:05 ──────────────────────────────────────────────────
  if (totalMinutes <= onTimeEnd) {
    return {
      status: 'present',
      attendanceValue: ATTENDANCE_VALUE.PRESENT,
      isLate: false,
      incrementLateCount: false,
    }
  }

  // ── After 8:30 AM → immediate Half Day (not counted in late buffer) ────────
  if (totalMinutes > lateBufferEnd) {
    return {
      status: 'half_day',
      attendanceValue: ATTENDANCE_VALUE.HALF_DAY,
      isLate: false,           // not a "late buffer" late
      incrementLateCount: false,
    }
  }

  // ── Late buffer: 8:05 → 8:30 ──────────────────────────────────────────────
  // This would be the (currentMonthLateCount + 1)th late
  const newLateCount = currentMonthLateCount + 1

  if (newLateCount <= LATE_BUFFER_MAX_PER_MONTH) {
    // Within 4 allowed lates — full attendance value
    return {
      status: 'late_within_buffer',
      attendanceValue: ATTENDANCE_VALUE.PRESENT,
      isLate: true,
      incrementLateCount: true,
    }
  } else {
    // 5th late or beyond → automatic Half Day
    return {
      status: 'half_day',
      attendanceValue: ATTENDANCE_VALUE.HALF_DAY,
      isLate: true,
      incrementLateCount: true,
    }
  }
}

/**
 * Checks if a given date is a working day:
 * - Not Sunday
 * - Not the 3rd Saturday of the month
 * - Not a company holiday
 */
export function isWorkingDay(date: Date, companyHolidays: string[]): boolean {
  const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday

  // Sunday is always off
  if (dayOfWeek === 0) return false

  // Check if it's the 3rd Saturday
  if (dayOfWeek === 6) {
    const dayOfMonth = date.getDate()
    // 3rd Saturday: day falls between 15–21
    if (dayOfMonth >= 15 && dayOfMonth <= 21) return false
  }

  // Check company holidays (stored as YYYY-MM-DD strings)
  const dateStr = date.toISOString().split('T')[0]
  if (companyHolidays.includes(dateStr)) return false

  return true
}

/**
 * Counts total working days in a month, excluding Sundays, 3rd Saturdays,
 * and company holidays. Adds compensation days if any.
 */
export function countWorkingDaysInMonth(
  year: number,
  month: number,           // 1-indexed
  companyHolidays: string[],
  compensationDays: string[] = []
): number {
  const daysInMonth = new Date(year, month, 0).getDate()
  let count = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    if (isWorkingDay(date, companyHolidays)) {
      count++
    }
  }

  // Add approved compensation days (worked on holidays/Sundays)
  count += compensationDays.length

  return count
}

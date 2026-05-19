/**
 * Leave Engine
 * Handles short leave validation, leave balance carry-forward,
 * and leave credit rules per employee category.
 */

import {
  SHORT_LEAVE_PER_MONTH,
  SHORT_LEAVE_MAX_HOURS,
  MORNING_SHORT_LEAVE_DEADLINE_HOUR,
  MORNING_SHORT_LEAVE_DEADLINE_MINUTE,
  EVENING_SHORT_LEAVE_EARLIEST_HOUR,
  ATTENDANCE_VALUE,
  REGULAR_EMPLOYEE_MONTHLY_LEAVE,
  INTERN_MONTHLY_LEAVE,
  PROBATION_MONTHLY_LEAVE,
  MAX_LEAVE_BALANCE,
} from '@/constants/policy'
import type { EmployeeCategory } from '@/types/user.types'
import type { ShortLeaveType } from '@/types/leave.types'

// ─── Short Leave ─────────────────────────────────────────────────────────────

export interface ShortLeaveResult {
  attendanceValue: number
  isValid: boolean
  reason: string
}

/**
 * Evaluates the attendance value for a short leave request.
 *
 * @param type              - 'morning' or 'evening'
 * @param checkInOrOutTime  - actual check-in (morning) or check-out (evening) time
 * @param monthlyShortLeaveCount - how many short leaves already used this month (before today)
 * @param isApproved        - whether admin approved this short leave
 */
export function evaluateShortLeave(
  type: ShortLeaveType,
  checkInOrOutTime: Date,
  monthlyShortLeaveCount: number,
  isApproved: boolean
): ShortLeaveResult {
  const hours = checkInOrOutTime.getHours()
  const minutes = checkInOrOutTime.getMinutes()
  const totalMinutes = hours * 60 + minutes

  // ── Morning short leave ───────────────────────────────────────────────────
  if (type === 'morning') {
    const deadlineMinutes =
      MORNING_SHORT_LEAVE_DEADLINE_HOUR * 60 + MORNING_SHORT_LEAVE_DEADLINE_MINUTE

    if (totalMinutes > deadlineMinutes) {
      // Reported after 11:05 AM → short leave exceeded 2 hours → Half Day
      return {
        attendanceValue: ATTENDANCE_VALUE.HALF_DAY,
        isValid: false,
        reason: 'Reported after 11:05 AM. Short leave exceeded 2 hours. Marked as Half Day.',
      }
    }
  }

  // ── Evening short leave ───────────────────────────────────────────────────
  if (type === 'evening') {
    const earliestMinutes = EVENING_SHORT_LEAVE_EARLIEST_HOUR * 60

    if (totalMinutes < earliestMinutes) {
      // Left before 4:00 PM → Half Day
      return {
        attendanceValue: ATTENDANCE_VALUE.HALF_DAY,
        isValid: false,
        reason: 'Left before 4:00 PM. Marked as Half Day.',
      }
    }
  }

  // ── Check monthly limit ───────────────────────────────────────────────────
  const newCount = monthlyShortLeaveCount + 1

  if (newCount <= SHORT_LEAVE_PER_MONTH) {
    // Within first 2 short leaves of the month
    if (isApproved) {
      return {
        attendanceValue: ATTENDANCE_VALUE.APPROVED_SHORT_LEAVE,
        isValid: true,
        reason: `Short leave ${newCount}/${SHORT_LEAVE_PER_MONTH} this month. Approved. Full attendance.`,
      }
    } else {
      // Not approved but within limit — treat as normal attendance rules
      return {
        attendanceValue: ATTENDANCE_VALUE.HALF_DAY,
        isValid: false,
        reason: 'Short leave not approved. Normal attendance rules applied.',
      }
    }
  } else {
    // Beyond monthly limit (3rd short leave onwards)
    if (isApproved) {
      return {
        attendanceValue: ATTENDANCE_VALUE.EXTRA_APPROVED_SHORT_LEAVE,
        isValid: true,
        reason: 'Extra short leave (beyond monthly limit). Approved. Attendance value 0.75.',
      }
    } else {
      return {
        attendanceValue: ATTENDANCE_VALUE.HALF_DAY,
        isValid: false,
        reason: 'Extra short leave not approved. Marked as Half Day.',
      }
    }
  }
}

// ─── Leave Balance ────────────────────────────────────────────────────────────

/**
 * Returns monthly leave credit based on employee category
 */
export function getMonthlyLeaveCredit(category: EmployeeCategory): number {
  switch (category) {
    case 'regular':
      return REGULAR_EMPLOYEE_MONTHLY_LEAVE
    case 'intern':
      return INTERN_MONTHLY_LEAVE
    case 'probation':
      return PROBATION_MONTHLY_LEAVE
    default:
      return 0
  }
}

/**
 * Calculates closing leave balance with the 120-leave cap.
 * Sick leave is NOT carried forward (handled separately at year-end).
 */
export function calculateClosingBalance(
  openingBalance: number,
  monthlyCredit: number,
  leavesTaken: number
): number {
  const closing = openingBalance + monthlyCredit - leavesTaken
  return Math.min(closing, MAX_LEAVE_BALANCE)
}

/**
 * Checks if probation period has ended based on joining date.
 * Probation = first 3 months from joining date.
 */
export function isProbationEnded(joiningDate: Date, checkDate: Date = new Date()): boolean {
  const probationEnd = new Date(joiningDate)
  probationEnd.setMonth(probationEnd.getMonth() + 3)
  return checkDate >= probationEnd
}

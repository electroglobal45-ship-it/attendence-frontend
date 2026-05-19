/**
 * Date Utilities for Attendance System
 * Handles weekend detection, holiday checking, and attendance blocking
 */

/**
 * Check if a date is a Sunday
 */
export function isSunday(date: Date): boolean {
  return date.getDay() === 0
}

/**
 * Check if a date is a Saturday
 */
export function isSaturday(date: Date): boolean {
  return date.getDay() === 6
}

/**
 * Check if a date is the 3rd Saturday of the month
 */
export function isThirdSaturday(date: Date): boolean {
  if (!isSaturday(date)) return false
  
  const dayOfMonth = date.getDate()
  // 3rd Saturday falls between 15th and 21st
  return dayOfMonth >= 15 && dayOfMonth <= 21
}

/**
 * Check if a date is a weekend (Sunday or 3rd Saturday)
 */
export function isBlockedWeekend(date: Date): boolean {
  return isSunday(date) || isThirdSaturday(date)
}

/**
 * Get the reason why a date is blocked
 */
export function getBlockedReason(date: Date, holidayName?: string): string {
  if (isSunday(date)) {
    return 'Sunday - Weekly off'
  }
  if (isThirdSaturday(date)) {
    return '3rd Saturday - Monthly off'
  }
  if (holidayName) {
    return `Public Holiday - ${holidayName}`
  }
  return 'Attendance not allowed on this date'
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDateIST(date: Date): string {
  const istOffset = 5.5 * 60 * 60 * 1000
  const istDate = new Date(date.getTime() + istOffset)
  const year = istDate.getUTCFullYear()
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(istDate.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get today's date in IST
 */
export function getTodayIST(): Date {
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  return new Date(now.getTime() + istOffset)
}

/**
 * Check if attendance is allowed on a given date
 * Returns { allowed: boolean, reason?: string, holidayName?: string }
 */
export interface AttendanceCheckResult {
  allowed: boolean
  reason?: string
  holidayName?: string
}

export function checkAttendanceAllowed(
  date: Date,
  holidays: Array<{ name: string; date: string }> = []
): AttendanceCheckResult {
  // Check if Sunday
  if (isSunday(date)) {
    return {
      allowed: false,
      reason: getBlockedReason(date),
    }
  }

  // Check if 3rd Saturday
  if (isThirdSaturday(date)) {
    return {
      allowed: false,
      reason: getBlockedReason(date),
    }
  }

  // Check if public holiday
  const dateStr = formatDateIST(date)
  const holiday = holidays.find(h => h.date === dateStr)
  if (holiday) {
    return {
      allowed: false,
      reason: getBlockedReason(date, holiday.name),
      holidayName: holiday.name,
    }
  }

  return { allowed: true }
}

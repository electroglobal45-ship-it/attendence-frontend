// ─── Office Timing ───────────────────────────────────────────────────────────
export const OFFICE_START_HOUR = 9   // 9:00 AM
export const OFFICE_START_MINUTE = 0

export const OFFICE_END_HOUR = 18    // 6:00 PM
export const OFFICE_END_MINUTE = 0

// ─── On-Time Window ──────────────────────────────────────────────────────────
// 9:00 AM → 9:05 AM = Present (value 1, no late count)
export const ONTIME_BUFFER_MINUTES = 5

// ─── Late Buffer Window ──────────────────────────────────────────────────────
// 9:05 AM → 9:30 AM = Late Within Buffer (allowed 4 times/month)
export const LATE_BUFFER_END_HOUR = 9
export const LATE_BUFFER_END_MINUTE = 30
export const LATE_BUFFER_MAX_PER_MONTH = 4

// ─── After 9:30 AM ───────────────────────────────────────────────────────────
// Directly Half Day (value 0.5), not counted in late buffer
export const HALF_DAY_CHECKIN_HOUR = 9
export const HALF_DAY_CHECKIN_MINUTE = 30

// ─── Short Leave ─────────────────────────────────────────────────────────────
export const SHORT_LEAVE_MAX_HOURS = 2
export const SHORT_LEAVE_PER_MONTH = 2

// Morning short leave: must report by 11:05 AM (9:00 + 2h + 5min grace)
export const MORNING_SHORT_LEAVE_DEADLINE_HOUR = 11
export const MORNING_SHORT_LEAVE_DEADLINE_MINUTE = 5

// Evening short leave: cannot leave before 4:00 PM (6:00 PM - 2h)
export const EVENING_SHORT_LEAVE_EARLIEST_HOUR = 16
export const EVENING_SHORT_LEAVE_EARLIEST_MINUTE = 0

// ─── Attendance Values ───────────────────────────────────────────────────────
export const ATTENDANCE_VALUE = {
  PRESENT: 1,
  APPROVED_SHORT_LEAVE: 1,
  EXTRA_APPROVED_SHORT_LEAVE: 0.75,
  HALF_DAY: 0.5,
  ABSENT: 0,
} as const

// ─── Leave Credits ───────────────────────────────────────────────────────────
export const REGULAR_EMPLOYEE_MONTHLY_LEAVE = 1.5
export const INTERN_MONTHLY_LEAVE = 1
export const PROBATION_MONTHLY_LEAVE = 1
export const MAX_LEAVE_BALANCE = 120

// Annual leave limits for regular employees
export const ANNUAL_LEAVE_LIMIT = 12
export const SICK_LEAVE_LIMIT = 4
export const PERSONAL_LEAVE_LIMIT = 4

// ─── Probation ───────────────────────────────────────────────────────────────
export const PROBATION_MONTHS = 3

// ─── GPS ─────────────────────────────────────────────────────────────────────
export const DEFAULT_OFFICE_RADIUS_METERS = 100

// ─── Bonus ───────────────────────────────────────────────────────────────────
export const NO_LEAVE_BONUS_DAYS = 2  // 2 days salary per no-leave month

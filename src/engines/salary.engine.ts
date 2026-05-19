/**
 * Salary Engine
 * Implements salary and bonus calculation formulas from the policy.
 *
 * Per Day Salary = Monthly Salary / Total Working Days
 * Payable Salary = Per Day Salary × Total Attendance Value
 *
 * Bonus: Daily Salary × 2 (for no-leave months, admin approved)
 */

import { NO_LEAVE_BONUS_DAYS } from '@/constants/policy'

export interface SalaryCalculation {
  monthlySalary: number
  totalWorkingDays: number
  perDaySalary: number
  totalAttendanceValue: number
  payableSalary: number
}

export interface BonusCalculation {
  perDaySalary: number
  bonusDays: number
  bonusAmount: number
}

/**
 * Calculates payable salary for a month
 */
export function calculateSalary(
  monthlySalary: number,
  totalWorkingDays: number,
  totalAttendanceValue: number
): SalaryCalculation {
  if (totalWorkingDays === 0) {
    return {
      monthlySalary,
      totalWorkingDays: 0,
      perDaySalary: 0,
      totalAttendanceValue: 0,
      payableSalary: 0,
    }
  }

  const perDaySalary = monthlySalary / totalWorkingDays
  const payableSalary = perDaySalary * totalAttendanceValue

  return {
    monthlySalary,
    totalWorkingDays,
    perDaySalary: Math.round(perDaySalary * 100) / 100,
    totalAttendanceValue,
    payableSalary: Math.round(payableSalary * 100) / 100,
  }
}

/**
 * Calculates no-leave bonus amount (2 days salary)
 * Used for both Diwali bonus (employees) and internship completion bonus (interns)
 */
export function calculateNoLeaveBonus(
  monthlySalary: number,
  totalWorkingDays: number
): BonusCalculation {
  const perDaySalary = totalWorkingDays > 0 ? monthlySalary / totalWorkingDays : 0
  const bonusAmount = perDaySalary * NO_LEAVE_BONUS_DAYS

  return {
    perDaySalary: Math.round(perDaySalary * 100) / 100,
    bonusDays: NO_LEAVE_BONUS_DAYS,
    bonusAmount: Math.round(bonusAmount * 100) / 100,
  }
}

/**
 * Calculates total accumulated bonus across multiple no-leave months
 */
export function calculateAccumulatedBonus(
  noLeaveMonths: Array<{ monthlySalary: number; workingDays: number }>
): number {
  return noLeaveMonths.reduce((total, month) => {
    const { bonusAmount } = calculateNoLeaveBonus(month.monthlySalary, month.workingDays)
    return total + bonusAmount
  }, 0)
}

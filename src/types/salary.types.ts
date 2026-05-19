export interface ISalaryRecord {
  _id: string
  employeeId: string
  month: number                 // 1-12
  year: number
  monthlySalary: number
  totalWorkingDays: number
  perDaySalary: number
  totalAttendanceValue: number
  payableSalary: number
  bonusAmount: number
  finalPayable: number
  isPaid: boolean
  paidAt?: string
  generatedAt: string
}

export interface IBonusRecord {
  _id: string
  employeeId: string
  month: number
  year: number
  noLeaveBonus: boolean         // did employee take no leave?
  performanceApproved: boolean  // admin approved performance
  bonusDays: number             // 2 days
  bonusAmount: number
  isPaid: boolean
  paidAt?: string               // paid at Diwali / internship end
  type: 'diwali' | 'internship_completion'
}

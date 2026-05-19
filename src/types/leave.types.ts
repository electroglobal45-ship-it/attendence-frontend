export type LeaveType = 'annual' | 'sick' | 'personal' | 'monthly'
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type ShortLeaveType = 'morning' | 'evening'

export interface ILeaveRequest {
  _id: string
  employeeId: string
  leaveType: LeaveType
  startDate: string             // YYYY-MM-DD
  endDate: string               // YYYY-MM-DD
  totalDays: number
  reason: string
  status: LeaveStatus
  appliedAt: string
  approvedBy?: string
  approvedAt?: string
  rejectionReason?: string
  isSandwichApplied: boolean    // sandwich leave flag
  sandwichDays?: string[]       // dates that became leave due to sandwich
}

export interface IShortLeave {
  _id: string
  employeeId: string
  date: string                  // YYYY-MM-DD
  type: ShortLeaveType
  reason: string
  status: LeaveStatus
  monthlyCount: number          // which short leave this is (1st, 2nd, 3rd...)
  attendanceValue: number
  appliedAt: string
  approvedBy?: string
  approvedAt?: string
}

export interface ILeaveBalance {
  _id: string
  employeeId: string
  year: number
  month: number
  openingBalance: number
  creditedLeaves: number
  takenLeaves: number
  closingBalance: number
  shortLeavesUsed: number
}

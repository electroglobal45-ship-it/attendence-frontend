export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half_day'
  | 'approved_short_leave'
  | 'extra_approved_short_leave'
  | 'late_within_buffer'
  | 'holiday'
  | 'weekly_off'
  | 'compensation_working'

export interface IGPSData {
  latitude: number
  longitude: number
  accuracy: number
  distanceFromOffice: number
  address?: string
  capturedAt: string
}

export interface IAttendance {
  _id: string
  employeeId: string
  date: string                  // YYYY-MM-DD
  checkIn?: string              // ISO datetime
  checkOut?: string             // ISO datetime
  status: AttendanceStatus
  attendanceValue: number       // 0, 0.5, 0.75, 1
  gpsData?: IGPSData
  selfieURL?: string
  lateCount?: number            // running late count for the month
  isLate: boolean
  isCompensationDay: boolean
  compensationApprovedBy?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface IOfficeLocation {
  _id: string
  name: string
  latitude: number
  longitude: number
  radiusMeters: number
  isActive: boolean
}

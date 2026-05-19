export type EmployeeCategory = 'regular' | 'probation' | 'intern'
export type UserRole = 'admin' | 'employee'

export interface IUser {
  _id: string
  firebaseUid: string
  email: string
  name: string
  photoURL?: string
  role: UserRole
  category: EmployeeCategory
  department?: string
  designation?: string
  monthlySalary: number
  joiningDate: string          // ISO date string
  probationEndDate?: string    // auto-calculated
  isActive: boolean
  createdAt: string
  updatedAt: string
}

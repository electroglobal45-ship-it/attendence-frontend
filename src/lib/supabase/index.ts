/**
 * Supabase Services - Main Export
 * Import all services from this file
 */

// Export types
export * from './client'

// Export auth functions
export { signIn, signOut, getSession, getCurrentUser, onAuthStateChange } from './auth'

// Export attendance functions
export {
  markAttendance,
  markCheckout,
  getTodayAttendance,
  getAttendanceRecords,
  getAllAttendanceRecords,
  getMonthlyAttendanceSummary,
  uploadSelfie,
  validateGPSLocation
} from './attendance'

// Export leave functions
export {
  applyLeave,
  applyShortLeave,
  approveLeave,
  getLeaveBalance,
  getLeaveRecords,
  getAllLeaveRequests,
  getPendingLeaveCount,
  cancelLeave
} from './leaves'

// Export salary functions
export {
  calculateSalary,
  calculateDiwaliBonus,
  calculateInternshipBonus,
  getSalaryRecords,
  getSalaryForMonth,
  getAllSalaryRecords,
  getSalaryReport,
  calculateSalaryForAll
} from './salary'

// Export export functions
export {
  getAttendanceReport,
  getLeavesReport,
  exportToCSV,
  exportToExcel,
  exportAttendanceToCSV,
  exportAttendanceToExcel,
  exportLeavesToCSV,
  exportLeavesToExcel,
  exportSalaryToCSV,
  exportSalaryToExcel
} from './export'

// Re-export supabase client for direct access
export { supabase } from './client'

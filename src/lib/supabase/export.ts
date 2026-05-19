/**
 * Export Service
 * Export data to CSV/Excel using Supabase functions
 */

import { supabase } from './client'
import * as XLSX from 'xlsx'

/**
 * Get attendance report for export
 */
export async function getAttendanceReport(
  startDate: string,
  endDate: string,
  employeeId?: string
) {
  const { data, error } = await supabase.rpc('get_attendance_report', {
    start_date_param: startDate,
    end_date_param: endDate,
    employee_id_param: employeeId || null,
  })

  if (error) {
    console.error('Error getting attendance report:', error)
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data }
}

/**
 * Get leaves report for export
 */
export async function getLeavesReport(
  startDate: string,
  endDate: string,
  employeeId?: string
) {
  const { data, error } = await supabase.rpc('get_leaves_report', {
    start_date_param: startDate,
    end_date_param: endDate,
    employee_id_param: employeeId || null,
  })

  if (error) {
    console.error('Error getting leaves report:', error)
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data }
}

/**
 * Export data to CSV
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  // Convert to CSV
  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header]
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    ),
  ]

  const csvContent = csvRows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

/**
 * Export data to Excel
 */
export function exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // Generate Excel file
  XLSX.writeFile(wb, filename)
}

/**
 * Export attendance to CSV
 */
export async function exportAttendanceToCSV(
  startDate: string,
  endDate: string,
  employeeId?: string
) {
  const result = await getAttendanceReport(startDate, endDate, employeeId)
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to get attendance report')
  }

  const filename = `attendance_${startDate}_to_${endDate}.csv`
  exportToCSV(result.data, filename)
}

/**
 * Export attendance to Excel
 */
export async function exportAttendanceToExcel(
  startDate: string,
  endDate: string,
  employeeId?: string
) {
  const result = await getAttendanceReport(startDate, endDate, employeeId)
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to get attendance report')
  }

  const filename = `attendance_${startDate}_to_${endDate}.xlsx`
  exportToExcel(result.data, filename, 'Attendance')
}

/**
 * Export leaves to CSV
 */
export async function exportLeavesToCSV(
  startDate: string,
  endDate: string,
  employeeId?: string
) {
  const result = await getLeavesReport(startDate, endDate, employeeId)
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to get leaves report')
  }

  const filename = `leaves_${startDate}_to_${endDate}.csv`
  exportToCSV(result.data, filename)
}

/**
 * Export leaves to Excel
 */
export async function exportLeavesToExcel(
  startDate: string,
  endDate: string,
  employeeId?: string
) {
  const result = await getLeavesReport(startDate, endDate, employeeId)
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to get leaves report')
  }

  const filename = `leaves_${startDate}_to_${endDate}.xlsx`
  exportToExcel(result.data, filename, 'Leaves')
}

/**
 * Export salary to CSV
 */
export async function exportSalaryToCSV(year: number, month: number, employeeId?: string) {
  const { data, error } = await supabase.rpc('get_salary_report', {
    year_param: year,
    month_param: month,
    employee_id_param: employeeId || null,
  })

  if (error || !data) {
    throw new Error(error?.message || 'Failed to get salary report')
  }

  const filename = `salary_${year}_${String(month).padStart(2, '0')}.csv`
  exportToCSV(data, filename)
}

/**
 * Export salary to Excel
 */
export async function exportSalaryToExcel(year: number, month: number, employeeId?: string) {
  const { data, error } = await supabase.rpc('get_salary_report', {
    year_param: year,
    month_param: month,
    employee_id_param: employeeId || null,
  })

  if (error || !data) {
    throw new Error(error?.message || 'Failed to get salary report')
  }

  const filename = `salary_${year}_${String(month).padStart(2, '0')}.xlsx`
  exportToExcel(data, filename, 'Salary')
}

/**
 * Helper function to download blob
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

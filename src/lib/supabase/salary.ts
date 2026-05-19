/**
 * Salary Service
 * All salary-related database operations using Supabase functions
 */

import { supabase } from './client'

/**
 * Calculate salary for a specific month
 */
export async function calculateSalary(
  employeeId: string,
  year: number,
  month: number
) {
  const { data, error } = await supabase.rpc('calculate_salary', {
    employee_id_param: employeeId,
    year_param: year,
    month_param: month,
  })

  if (error) {
    console.error('Error calculating salary:', error)
    return { success: false, error: error.message }
  }

  return data
}

/**
 * Calculate Diwali bonus (accumulated no-leave bonus)
 */
export async function calculateDiwaliBonus(employeeId: string) {
  const { data, error } = await supabase.rpc('calculate_diwali_bonus', {
    employee_id_param: employeeId,
  })

  if (error) {
    console.error('Error calculating Diwali bonus:', error)
    return { success: false, error: error.message }
  }

  return data
}

/**
 * Calculate internship completion bonus
 */
export async function calculateInternshipBonus(employeeId: string) {
  const { data, error } = await supabase.rpc('calculate_internship_bonus', {
    employee_id_param: employeeId,
  })

  if (error) {
    console.error('Error calculating internship bonus:', error)
    return { success: false, error: error.message }
  }

  return data
}

/**
 * Get salary records for employee
 */
export async function getSalaryRecords(employeeId: string) {
  const { data, error } = await supabase
    .from('salary')
    .select('*')
    .eq('employee_id', employeeId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  if (error) {
    console.error('Error getting salary records:', error)
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data }
}

/**
 * Get salary record for specific month
 */
export async function getSalaryForMonth(
  employeeId: string,
  year: number,
  month: number
) {
  const { data, error } = await supabase
    .from('salary')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('year', year)
    .eq('month', month)
    .single()

  if (error) {
    console.error('Error getting salary for month:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Get all salary records (admin only)
 */
export async function getAllSalaryRecords(year: number, month: number) {
  const { data, error } = await supabase
    .from('salary')
    .select(`
      *,
      employee:employee_id (
        name,
        email,
        department,
        designation
      )
    `)
    .eq('year', year)
    .eq('month', month)
    .order('payable_salary', { ascending: false })

  if (error) {
    console.error('Error getting all salary records:', error)
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data }
}

/**
 * Get salary report for export
 */
export async function getSalaryReport(
  year: number,
  month: number,
  employeeId?: string
) {
  const { data, error } = await supabase.rpc('get_salary_report', {
    year_param: year,
    month_param: month,
    employee_id_param: employeeId || null,
  })

  if (error) {
    console.error('Error getting salary report:', error)
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data }
}

/**
 * Calculate salary for all employees (admin only)
 */
export async function calculateSalaryForAll(year: number, month: number) {
  // Get all active employees
  const { data: employees, error: empError } = await supabase
    .from('users')
    .select('id')
    .eq('is_active', true)

  if (empError || !employees) {
    return { success: false, error: empError?.message || 'No employees found' }
  }

  // Calculate salary for each employee
  const results = await Promise.all(
    employees.map(emp => calculateSalary(emp.id, year, month))
  )

  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  return {
    success: true,
    total: employees.length,
    successful,
    failed,
  }
}

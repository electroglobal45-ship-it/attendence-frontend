/**
 * Leave Service
 * All leave-related database operations using Supabase functions
 */

import { supabase } from './client'

export interface ApplyLeaveParams {
  employee_id: string
  leave_type: 'full_day' | 'half_day' | 'short_leave'
  start_date: string
  end_date: string
  reason: string
}

/**
 * Apply for leave
 */
export async function applyLeave(params: ApplyLeaveParams) {
  const { data, error } = await supabase.rpc('apply_leave', {
    employee_id_param: params.employee_id,
    leave_type_param: params.leave_type,
    start_date_param: params.start_date,
    end_date_param: params.end_date,
    reason_param: params.reason,
  })

  if (error) {
    console.error('Error applying leave:', error)
    return { success: false, error: error.message }
  }

  return data
}

/**
 * Apply for short leave
 */
export async function applyShortLeave(
  employeeId: string,
  shortLeaveType: 'morning' | 'evening',
  reason: string
) {
  const { data, error } = await supabase.rpc('apply_short_leave', {
    employee_id_param: employeeId,
    short_leave_type: shortLeaveType,
    reason_param: reason,
  })

  if (error) {
    console.error('Error applying short leave:', error)
    return { success: false, error: error.message }
  }

  return data
}

/**
 * Approve or reject leave (admin only)
 */
export async function approveLeave(
  leaveId: string,
  adminId: string,
  status: 'approved' | 'rejected'
) {
  const { data, error } = await supabase.rpc('approve_leave', {
    leave_id_param: leaveId,
    admin_id_param: adminId,
    approve_status: status,
  })

  if (error) {
    console.error('Error approving leave:', error)
    return { success: false, error: error.message }
  }

  return data
}

/**
 * Get leave balance for employee
 */
export async function getLeaveBalance(employeeId: string) {
  const { data, error } = await supabase.rpc('calculate_leave_balance', {
    employee_id_param: employeeId,
  })

  if (error) {
    console.error('Error getting leave balance:', error)
    return { success: false, error: error.message }
  }

  return data
}

/**
 * Get leave records for employee
 */
export async function getLeaveRecords(employeeId: string) {
  const { data, error } = await supabase
    .from('leaves')
    .select(`
      *,
      approved_by_user:approved_by (
        name,
        email
      )
    `)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error getting leave records:', error)
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data }
}

/**
 * Get all leave requests (admin only)
 */
export async function getAllLeaveRequests(status?: 'pending' | 'approved' | 'rejected') {
  let query = supabase
    .from('leaves')
    .select(`
      *,
      employee:employee_id (
        name,
        email,
        department
      ),
      approved_by_user:approved_by (
        name,
        email
      )
    `)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error getting all leave requests:', error)
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data }
}

/**
 * Get pending leave requests count (admin only)
 */
export async function getPendingLeaveCount() {
  const { count, error } = await supabase
    .from('leaves')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (error) {
    console.error('Error getting pending leave count:', error)
    return 0
  }

  return count || 0
}

/**
 * Cancel leave request (employee only, before approval)
 */
export async function cancelLeave(leaveId: string) {
  const { data, error } = await supabase
    .from('leaves')
    .delete()
    .eq('id', leaveId)
    .eq('status', 'pending')

  if (error) {
    console.error('Error canceling leave:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

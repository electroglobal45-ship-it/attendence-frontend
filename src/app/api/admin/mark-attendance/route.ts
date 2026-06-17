/**
 * POST /api/admin/mark-attendance
 * Admin manually marks attendance for employees (absent/half-day)
 * Used for employees who didn't check-in or didn't check-out
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdmin } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Helper to combine date and time strings into an ISO string in UTC
function combineDateAndTime(dateStr: string, timeStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes))
  // Convert IST (UTC+5.5) to UTC
  return new Date(date.getTime() - 5.5 * 60 * 60 * 1000).toISOString()
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin token
    const user = await requireAdmin(req)
    const userId = user.userId

    const { employeeId, date, action, reason, checkIn, checkOut } = await req.json()

    if (!employeeId || !date || !action) {
      return NextResponse.json({ 
        error: 'employeeId, date, and action are required' 
      }, { status: 400 })
    }

    const validActions = ['present', 'absent', 'half_day', 'late_within_buffer', 'mark_checkout']
    if (!validActions.includes(action)) {
      return NextResponse.json({ 
        error: 'action must be: present, absent, half_day, late_within_buffer, or mark_checkout' 
      }, { status: 400 })
    }

    console.log('[Admin Mark] Action:', action, 'Employee:', employeeId, 'Date:', date)

    // Check if attendance record exists
    const { data: existing, error: findError } = await supabaseServer
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .maybeSingle()

    if (findError) {
      console.error('[Admin Mark] Find error:', findError)
      return NextResponse.json({ error: 'Failed to find attendance record' }, { status: 500 })
    }

    let check_in_val = existing?.check_in || null
    let check_out_val = existing?.check_out || null
    let status_val = action
    let value_val = 0

    if (action === 'present') {
      status_val = 'present'
      value_val = 1
      check_in_val = checkIn ? combineDateAndTime(date, checkIn) : (check_in_val || combineDateAndTime(date, '09:00'))
      check_out_val = checkOut ? combineDateAndTime(date, checkOut) : (check_out_val || combineDateAndTime(date, '18:00'))
    } else if (action === 'late_within_buffer') {
      status_val = 'late_within_buffer'
      value_val = 1
      check_in_val = checkIn ? combineDateAndTime(date, checkIn) : (check_in_val || combineDateAndTime(date, '09:40'))
      check_out_val = checkOut ? combineDateAndTime(date, checkOut) : (check_out_val || combineDateAndTime(date, '18:00'))
    } else if (action === 'half_day') {
      status_val = 'half_day'
      value_val = 0.5
      check_in_val = checkIn ? combineDateAndTime(date, checkIn) : (check_in_val || combineDateAndTime(date, '09:00'))
      check_out_val = checkOut ? combineDateAndTime(date, checkOut) : (check_out_val || combineDateAndTime(date, '13:30'))
    } else if (action === 'absent') {
      status_val = 'absent'
      value_val = 0
      check_in_val = null
      check_out_val = null
    } else if (action === 'mark_checkout') {
      status_val = existing?.status || 'present'
      value_val = existing?.attendance_value != null ? Number(existing.attendance_value) : 1
      check_in_val = existing?.check_in || combineDateAndTime(date, '09:00')
      check_out_val = checkOut ? combineDateAndTime(date, checkOut) : new Date().toISOString()
    }

    let result
    const updatePayload = {
      status: status_val,
      attendance_value: value_val,
      check_in: check_in_val,
      check_out: check_out_val,
      admin_marked: true,
      admin_reason: reason || `Overridden as ${status_val.replace(/_/g, ' ')} by admin`,
      updated_at: new Date().toISOString()
    }

    if (existing) {
      // Update existing record
      const { data, error } = await supabaseServer
        .from('attendance')
        .update(updatePayload)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new record
      const { data, error } = await supabaseServer
        .from('attendance')
        .insert({
          employee_id: employeeId,
          date: date,
          ...updatePayload
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    console.log('[Admin Mark] Success:', result?.id)

    return NextResponse.json({
      success: true,
      message: `Successfully marked as ${action.replace('_', ' ')}`,
      data: result
    })

  } catch (error: any) {
    console.error('[Admin Mark] Exception:', error)
    const status = error.message?.includes('Forbidden') ? 403 : error.message?.includes('Unauthorized') ? 401 : 500
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status })
  }
}

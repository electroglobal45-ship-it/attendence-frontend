/**
 * POST /api/admin/mark-attendance
 * Admin manually marks attendance for employees (absent/half-day)
 * Used for employees who didn't check-in or didn't check-out
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    // Verify admin token
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { employeeId, date, action, reason } = await req.json()

    if (!employeeId || !date || !action) {
      return NextResponse.json({ 
        error: 'employeeId, date, and action are required' 
      }, { status: 400 })
    }

    if (!['absent', 'half_day', 'mark_checkout'].includes(action)) {
      return NextResponse.json({ 
        error: 'action must be: absent, half_day, or mark_checkout' 
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

    let result

    if (action === 'absent') {
      // Mark as absent
      if (existing) {
        // Update existing record
        const { data, error } = await supabaseServer
          .from('attendance')
          .update({
            status: 'absent',
            attendance_value: 0,
            admin_marked: true,
            admin_reason: reason || 'Marked absent by admin',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        result = data
      } else {
        // Create new absent record
        const { data, error } = await supabaseServer
          .from('attendance')
          .insert({
            employee_id: employeeId,
            date: date,
            status: 'absent',
            attendance_value: 0,
            admin_marked: true,
            admin_reason: reason || 'Marked absent by admin',
          })
          .select()
          .single()

        if (error) throw error
        result = data
      }
    } else if (action === 'half_day') {
      // Mark as half day
      if (existing) {
        const { data, error } = await supabaseServer
          .from('attendance')
          .update({
            status: 'half_day',
            attendance_value: 0.5,
            admin_marked: true,
            admin_reason: reason || 'Marked half day by admin',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        result = data
      } else {
        return NextResponse.json({ 
          error: 'Cannot mark half day without check-in record' 
        }, { status: 400 })
      }
    } else if (action === 'mark_checkout') {
      // Admin marks checkout for employee who forgot
      if (!existing || !existing.check_in) {
        return NextResponse.json({ 
          error: 'Cannot mark checkout without check-in record' 
        }, { status: 400 })
      }

      if (existing.check_out) {
        return NextResponse.json({ 
          error: 'Already checked out' 
        }, { status: 400 })
      }

      const { data, error } = await supabaseServer
        .from('attendance')
        .update({
          check_out: new Date().toISOString(),
          admin_marked: true,
          admin_reason: reason || 'Checkout marked by admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
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
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}

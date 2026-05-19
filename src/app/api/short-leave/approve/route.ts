/**
 * POST /api/short-leave/approve
 * Admin approves or rejects a short leave request.
 * On approval, updates the attendance record for that day.
 *
 * Uses service-role Supabase client (bypasses RLS).
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const decoded = verifyToken(authHeader.substring(7))
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { shortLeaveId, status } = await req.json()

    if (!shortLeaveId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'shortLeaveId and status (approved|rejected) required' },
        { status: 400 }
      )
    }

    // Get the short leave record
    const { data: sl, error: fetchErr } = await supabaseServer
      .from('short_leaves')
      .select('*')
      .eq('id', shortLeaveId)
      .maybeSingle()

    if (fetchErr || !sl) {
      return NextResponse.json({ error: 'Short leave not found' }, { status: 404 })
    }

    // Update short leave status
    const { data: updated, error: updateErr } = await supabaseServer
      .from('short_leaves')
      .update({
        status,
        approved_by: decoded.userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', shortLeaveId)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update short leave' }, { status: 500 })
    }

    // If approved, update the attendance record for that day
    if (status === 'approved') {
      const attendanceValue = Number(sl.attendance_value) || 1

      const { data: att } = await supabaseServer
        .from('attendance')
        .select('id, status, attendance_value')
        .eq('employee_id', sl.employee_id)
        .eq('date', sl.date)
        .maybeSingle()

      if (att) {
        const newStatus = attendanceValue >= 1 ? 'approved_short_leave' : 'half_day'
        await supabaseServer
          .from('attendance')
          .update({ attendance_value: attendanceValue, status: newStatus })
          .eq('id', att.id)
      }
    }

    return NextResponse.json({ success: true, shortLeave: updated })
  } catch (err) {
    console.error('POST /api/short-leave/approve error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/calendar?month=5&year=2026[&employeeId=xxx]
 * Returns a full month calendar with attendance + leave data for an employee.
 * Employees see their own; admins can pass any employeeId.
 *
 * Uses service-role Supabase client (bypasses RLS).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdmin } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toIST(date: Date) {
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000)
}

function fmtDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function isThirdSaturday(date: Date): boolean {
  const ist = toIST(date)
  const dow = ist.getUTCDay()
  const dom = ist.getUTCDate()
  return dow === 6 && dom >= 15 && dom <= 21
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuth(req)
    const userId = user.userId

    const { searchParams } = new URL(req.url)
    const month = parseInt(searchParams.get('month') || '0')
    const year  = parseInt(searchParams.get('year')  || '0')
    const reqEmployeeId = searchParams.get('employeeId')

    // Employees can only see their own; admins can see anyone
    const employeeId = user.role === 'admin'
      ? (reqEmployeeId || userId)
      : userId

    if (!month || !year) {
      return NextResponse.json({ error: 'month and year required' }, { status: 400 })
    }

    const startDate = fmtDate(year, month, 1)
    const lastDay   = new Date(year, month, 0).getDate()
    const endDate   = fmtDate(year, month, lastDay)

    // Fetch all data in parallel
    const [attRes, leaveRes, shortLeaveRes, holidayRes] = await Promise.all([
      supabaseServer
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', startDate)
        .lte('date', endDate),

      supabaseServer
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('start_date', startDate)
        .lte('end_date', endDate),

      supabaseServer
        .from('short_leaves')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', startDate)
        .lte('date', endDate),

      supabaseServer
        .from('holidays')
        .select('date, name')
        .eq('is_active', true)
        .gte('date', startDate)
        .lte('date', endDate),
    ])

    // Build lookup maps
    const attendanceMap: Record<string, any> = {}
    for (const rec of attRes.data || []) attendanceMap[rec.date] = rec

    const leaveMap: Record<string, any> = {}
    for (const leave of leaveRes.data || []) {
      // Expand multi-day leaves into individual dates
      const s = new Date(leave.start_date + 'T00:00:00Z')
      const e = new Date(leave.end_date   + 'T00:00:00Z')
      for (const d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
        const key = fmtDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
        leaveMap[key] = leave
      }
    }

    const shortLeaveMap: Record<string, any> = {}
    for (const sl of shortLeaveRes.data || []) shortLeaveMap[sl.date] = sl

    const holidaySet: Set<string> = new Set((holidayRes.data || []).map((h: any) => h.date as string))
    const holidayNames: Record<string, string> = {}
    for (const h of holidayRes.data || []) holidayNames[h.date] = h.name

    // Today in IST
    const todayIST = toIST(new Date())
    const todayStr = fmtDate(todayIST.getUTCFullYear(), todayIST.getUTCMonth() + 1, todayIST.getUTCDate())

    // Build day-by-day calendar
    const days = []
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = fmtDate(year, month, d)
      const dateObj = new Date(Date.UTC(year, month - 1, d))
      const ist     = toIST(dateObj)
      const dow     = ist.getUTCDay() // 0=Sun

      const isSunday  = dow === 0
      const is3rdSat  = isThirdSaturday(dateObj)
      const isHoliday = holidaySet.has(dateStr)
      const isWeekend = isSunday || is3rdSat

      const att        = attendanceMap[dateStr]
      const leave      = leaveMap[dateStr]
      const shortLeave = shortLeaveMap[dateStr]

      let dayType: string
      let attendanceValue = 0
      let label = ''

      if (isHoliday) {
        dayType = 'holiday'
        label   = holidayNames[dateStr] || 'Holiday'
      } else if (isSunday) {
        dayType = 'sunday'
        label   = 'Sunday'
      } else if (is3rdSat) {
        dayType = 'holiday'
        label   = '3rd Saturday'
      } else if (leave && leave.status === 'approved') {
        dayType = 'leave'
        attendanceValue = 0
        label   = `${(leave.type || leave.leave_type || 'leave').replace(/_/g, ' ')} leave`
      } else if (att) {
        dayType         = att.status
        attendanceValue = att.attendance_value != null
          ? Number(att.attendance_value)
          : (att.status === 'present' || att.status === 'late_within_buffer' ? 1
            : att.status === 'half_day' ? 0.5 : 0)
        label = att.status.replace(/_/g, ' ')
        if (shortLeave && shortLeave.status === 'approved') {
          label = `${label} + short leave`
        }
      } else if (leave && leave.status === 'pending') {
        dayType = 'leave_pending'
        label   = `${(leave.type || leave.leave_type || 'leave').replace(/_/g, ' ')} leave (pending)`
      } else {
        dayType = dateStr < todayStr ? 'absent' : 'future'
        if (dayType === 'absent') { label = 'Absent'; attendanceValue = 0 }
      }

      days.push({
        date:            dateStr,
        day:             d,
        dayOfWeek:       dow,
        dayType,
        attendanceValue,
        label,
        checkIn:         att?.check_in  || null,
        checkOut:        att?.check_out || null,
        selfieUrl:       att?.selfie_url || null,
        leaveType:       leave?.type || leave?.leave_type || null,
        leaveStatus:     leave?.status || null,
        shortLeave:      shortLeave || null,
        isWeekend,
        isHoliday,
      })
    }

    // Summary stats
    const workingDays          = days.filter(d => !d.isWeekend && !d.isHoliday && d.dayType !== 'future').length
    const totalAttendanceValue = days.reduce((s, d) => s + d.attendanceValue, 0)
    const presentDays          = days.filter(d => d.dayType === 'present' || d.dayType === 'late_within_buffer' || d.dayType === 'approved_short_leave').length
    const halfDays             = days.filter(d => d.dayType === 'half_day').length
    const leaveDays            = days.filter(d => d.dayType === 'leave').length
    const absentDays           = days.filter(d => d.dayType === 'absent').length

    return NextResponse.json({
      month,
      year,
      employeeId,
      days,
      summary: {
        workingDays,
        totalAttendanceValue: Math.round(totalAttendanceValue * 100) / 100,
        presentDays,
        halfDays,
        leaveDays,
        absentDays,
      },
    })
  } catch (err: any) {
    console.error('GET /api/calendar error:', err)
    const status = err.message === 'Unauthorized' ? 401 : err.message.includes('Forbidden') ? 403 : 500
    return NextResponse.json(
      { error: status === 500 ? 'Internal server error' : err.message },
      { status }
    )
  }
}

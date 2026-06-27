/**
 * POST /api/salary/calculate
 * Calculates salary for a given month using attendance values per policy.
 * Employees see their own; admins can pass employeeId.
 *
 * Uses service-role Supabase client (bypasses RLS).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdmin } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

// ─── IST helpers ─────────────────────────────────────────────────────────────

function toIST(d: Date) {
  return new Date(d.getTime() + 5.5 * 60 * 60 * 1000)
}

function isThirdSaturday(y: number, m: number, d: number): boolean {
  const date = new Date(Date.UTC(y, m - 1, d))
  const ist  = toIST(date)
  return ist.getUTCDay() === 6 && ist.getUTCDate() >= 15 && ist.getUTCDate() <= 21
}

function countWorkingDays(year: number, month: number, holidayDates: string[]): number {
  const lastDay = new Date(year, month, 0).getDate()
  let count = 0
  for (let d = 1; d <= lastDay; d++) {
    const date    = new Date(Date.UTC(year, month - 1, d))
    const ist     = toIST(date)
    const dow     = ist.getUTCDay()
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (dow === 0) continue                         // Sunday
    if (isThirdSaturday(year, month, d)) continue  // 3rd Saturday
    if (holidayDates.includes(dateStr)) continue   // Company holiday
    count++
  }
  return count
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Auth
    const user = await requireAuth(req)
    const userId = user.userId

    const text = await req.text()
    const body = text ? JSON.parse(text) : {}
    const { month, year } = body

    // Admins can calculate for any employee; employees only see their own
    const employeeId = user.role === 'admin'
      ? (body.employeeId || userId)
      : userId

    if (!month || !year) {
      return NextResponse.json({ error: 'month and year are required' }, { status: 400 })
    }

    // ── 1. Get employee ───────────────────────────────────────────────────
    const { data: employee, error: empErr } = await supabaseServer
      .from('users')
      .select('id, name, email, monthly_salary, category, role')
      .eq('id', employeeId)
      .maybeSingle()

    if (empErr || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const monthlySalary = Number(employee.monthly_salary) || 0

    // ── 2. Get holidays ───────────────────────────────────────────────────
    const { data: holidays } = await supabaseServer
      .from('holidays')
      .select('date')
      .eq('is_active', true)

    const holidayDates = (holidays || []).map((h: any) => h.date as string)

    // ── 3. Working days in month ──────────────────────────────────────────
    const workingDays = countWorkingDays(year, month, holidayDates)

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay   = new Date(year, month, 0).getDate()
    const endDate   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // ── 4. Fetch All Data in Parallel ─────────────────────────────────────
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
        .eq('status', 'approved')
        .gte('start_date', startDate)
        .lte('end_date', endDate),

      supabaseServer
        .from('short_leaves')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'approved')
        .gte('date', startDate)
        .lte('date', endDate),

      supabaseServer
        .from('holidays')
        .select('date')
        .eq('is_active', true)
        .gte('date', startDate)
        .lte('date', endDate),
    ])

    // Build lookup maps
    const attendanceMap: Record<string, any> = {}
    for (const rec of attRes.data || []) attendanceMap[rec.date] = rec

    const leaveMap: Record<string, any> = {}
    for (const leave of leaveRes.data || []) {
      const s = new Date(leave.start_date + 'T00:00:00Z')
      const e = new Date(leave.end_date   + 'T00:00:00Z')
      for (const d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
        leaveMap[key] = leave
      }
    }

    const shortLeaveMap: Record<string, any> = {}
    for (const sl of shortLeaveRes.data || []) shortLeaveMap[sl.date] = sl

    const holidaySet: Set<string> = new Set((holidayRes.data || []).map((h: any) => h.date as string))

    // Helper to check third Saturday
    const isThirdSaturdayIST = (y: number, m: number, d: number): boolean => {
      const date = new Date(Date.UTC(y, m - 1, d))
      const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000)
      return ist.getUTCDay() === 6 && ist.getUTCDate() >= 15 && ist.getUTCDate() <= 21
    }

    const isIntern = employee.category === 'intern'
    const maxPaidLeaves = isIntern ? 1 : 2
    const maxPaidShortLeaves = 2

    let leaveCount = 0
    let shortLeaveCount = 0
    let totalPayableSalary = 0
    
    let presentDays = 0
    let halfDays    = 0
    let absentDays  = 0
    let lateDays    = 0
    let leaveDays   = 0

    const today = new Date()
    const todayIST = new Date(today.getTime() + 5.5 * 60 * 60 * 1000)
    const todayStr = `${todayIST.getUTCFullYear()}-${String(todayIST.getUTCMonth() + 1).padStart(2, '0')}-${String(todayIST.getUTCDate()).padStart(2, '0')}`

    const perDaySalary = workingDays > 0 ? monthlySalary / workingDays : 0

    const getHoursNumeric = (checkIn: string | null, checkOut: string | null) => {
      if (!checkIn || !checkOut) return 0
      try {
        const start = new Date(checkIn.endsWith('Z') ? checkIn : checkIn + 'Z')
        const end = new Date(checkOut.endsWith('Z') ? checkOut : checkOut + 'Z')
        const diffMs = end.getTime() - start.getTime()
        if (isNaN(diffMs) || diffMs <= 0) return 0
        return diffMs / (1000 * 60 * 60)
      } catch {
        return 0
      }
    }

    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      
      // Skip if future day
      if (dateStr > todayStr) continue

      const isSunday = new Date(dateStr + 'T00:00:00Z').getUTCDay() === 0
      const isHoliday = holidaySet.has(dateStr)
      const is3rdSat = isThirdSaturdayIST(year, month, d)
      const isWeekendOrHoliday = isSunday || isHoliday || is3rdSat

      if (isWeekendOrHoliday) continue

      const leave = leaveMap[dateStr]
      const att = attendanceMap[dateStr]
      const shortLeave = shortLeaveMap[dateStr]

      let daySalary = 0

      if (leave) {
        leaveDays++
        leaveCount++
        if (leaveCount <= maxPaidLeaves) {
          daySalary = perDaySalary
        } else {
          daySalary = 0
          absentDays++
        }
      } else if (shortLeave) {
        shortLeaveCount++
        if (shortLeaveCount <= maxPaidShortLeaves) {
          daySalary = perDaySalary
          presentDays++
        } else {
          // Unpaid short leave -> fallback to working hours
          const hrs = att ? getHoursNumeric(att.check_in, att.check_out) : 0
          if (hrs >= 8) {
            daySalary = perDaySalary
            presentDays++
          } else if (hrs >= 5) {
            daySalary = perDaySalary * 0.5
            halfDays++
          } else {
            daySalary = 0
            absentDays++
          }
        }
      } else if (att) {
        const hrs = getHoursNumeric(att.check_in, att.check_out)
        if (hrs >= 8) {
          daySalary = perDaySalary
          presentDays++
        } else if (hrs >= 5) {
          daySalary = perDaySalary * 0.5
          halfDays++
        } else if (att.status === 'present' || att.status === 'late_within_buffer') {
          daySalary = perDaySalary
          presentDays++
        } else if (att.status === 'half_day') {
          daySalary = perDaySalary * 0.5
          halfDays++
        } else {
          daySalary = 0
          absentDays++
        }
        if (att.status === 'late_within_buffer') lateDays++
      } else {
        daySalary = 0
        absentDays++
      }

      totalPayableSalary += daySalary
    }

    const payableSalary = totalPayableSalary
    const deductions = monthlySalary - payableSalary
    const totalAttendanceValue = perDaySalary > 0 ? payableSalary / perDaySalary : 0

    // ── 7. No-leave bonus (Section 16) ────────────────────────────────────
    // 2 days salary if zero approved leaves taken this month
    const noLeaveBonus = leaveDays === 0 && workingDays > 0 ? perDaySalary * 2 : 0

    return NextResponse.json({
      employee_id:            employeeId,
      employee_name:          employee.name,
      employee_category:      employee.category,
      month,
      year,
      monthly_salary:         monthlySalary,
      working_days:           workingDays,
      per_day_salary:         Math.round(perDaySalary  * 100) / 100,
      total_attendance_value: Math.round(totalAttendanceValue * 100) / 100,
      payable_salary:         Math.round(payableSalary * 100) / 100,
      deductions:             Math.round(deductions    * 100) / 100,
      net_salary:             Math.round(payableSalary * 100) / 100,
      no_leave_bonus:         Math.round(noLeaveBonus  * 100) / 100,
      total_with_bonus:       Math.round((payableSalary + noLeaveBonus) * 100) / 100,
      breakdown: {
        presentDays,
        halfDays,
        absentDays,
        lateDays,
        leaveDays,
      },
    })
  } catch (err: any) {
    console.error('POST /api/salary/calculate error:', err)
    const status = err.message === 'Unauthorized' ? 401 : err.message.includes('Forbidden') ? 403 : 500
    return NextResponse.json(
      { error: status === 500 ? 'Internal server error' : err.message },
      { status }
    )
  }
}

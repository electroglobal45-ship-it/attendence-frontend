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

    const body = await req.json()
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

    // ── 4. Attendance records ─────────────────────────────────────────────
    const { data: attRecords } = await supabaseServer
      .from('attendance')
      .select('date, status, attendance_value')
      .eq('employee_id', employeeId)
      .gte('date', startDate)
      .lte('date', endDate)

    let totalAttendanceValue = 0
    let presentDays = 0
    let halfDays    = 0
    let absentDays  = 0
    let lateDays    = 0

    for (const rec of attRecords || []) {
      // Use stored attendance_value if available; fall back to status-based default
      const val = rec.attendance_value != null
        ? Number(rec.attendance_value)
        : (
            rec.status === 'present' ||
            rec.status === 'late_within_buffer' ||
            rec.status === 'approved_short_leave'
              ? 1
              : rec.status === 'half_day' || rec.status === 'extra_approved_short_leave'
              ? 0.5
              : 0
          )

      totalAttendanceValue += val

      if (val >= 1)        presentDays++
      else if (val >= 0.5) halfDays++
      else                 absentDays++

      if (rec.status === 'late_within_buffer') lateDays++
    }

    // ── 5. Approved leaves this month ─────────────────────────────────────
    const { data: leaveRecords } = await supabaseServer
      .from('leave_requests')
      .select('total_days, type')
      .eq('employee_id', employeeId)
      .eq('status', 'approved')
      .gte('start_date', startDate)
      .lte('end_date', endDate)

    const leaveDays = (leaveRecords || []).reduce(
      (s: number, l: any) => s + (Number(l.total_days) || 0),
      0
    )

    // ── 6. Salary calculation (Section 13.3) ─────────────────────────────
    const perDaySalary  = workingDays > 0 ? monthlySalary / workingDays : 0
    const payableSalary = perDaySalary * totalAttendanceValue
    const deductions    = monthlySalary - payableSalary

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

/**
 * GET /api/export/attendance?type=monthly|individual&month=X&year=Y — download xlsx file
 * POST /api/export/attendance — returns JSON records (legacy)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'
import * as XLSX from 'xlsx'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Helper to calculate decimal hours between check-in and check-out
function calculateHoursNumeric(checkIn: string | null, checkOut: string | null): number {
  if (!checkIn || !checkOut) return 0
  try {
    const checkInTimestamp = checkIn.endsWith('Z') ? checkIn : checkIn + 'Z'
    const checkOutTimestamp = checkOut.endsWith('Z') ? checkOut : checkOut + 'Z'
    const start = new Date(checkInTimestamp)
    const end = new Date(checkOutTimestamp)
    const diffMs = end.getTime() - start.getTime()
    if (isNaN(diffMs) || diffMs <= 0) return 0
    return parseFloat((diffMs / (1000 * 60 * 60)).toFixed(1))
  } catch {
    return 0
  }
}

// Helper to format UTC timestamp to IST YYYY-MM-DD HH:MM:SS
function formatISTTimestamp(utcTimestamp: string | null): string {
  if (!utcTimestamp) return '—'
  try {
    const date = new Date(utcTimestamp)
    if (isNaN(date.getTime())) return '—'
    
    // Format to IST timezone: YYYY-MM-DD HH:MM:SS
    const pad = (n: number) => String(n).padStart(2, '0')
    
    // Use Intl.DateTimeFormat to extract parts in Asia/Kolkata
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    })
    
    const parts = formatter.formatToParts(date)
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || ''
    
    return `${getPart('year')}-${pad(Number(getPart('month')))}-${pad(Number(getPart('day')))} ${pad(Number(getPart('hour')))}:${pad(Number(getPart('minute')))}:${pad(Number(getPart('second')))}`
  } catch {
    return '—'
  }
}

// Helper to check if a date is a Sunday
function isSunday(dateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getDay() === 0 // 0 = Sunday
}

// Helper to get holiday name if any
function getHolidayName(dateStr: string, holidayList: any[]): string | null {
  const hol = holidayList.find((h: any) => h.date === dateStr)
  return hol ? hol.name : null
}

// Helper to check if employee has approved leave on a given date
function getApprovedLeaveType(employeeId: string, dateStr: string, leaveList: any[]): string | null {
  const leave = leaveList.find((l: any) => {
    if (l.employee_id !== employeeId) return false
    return dateStr >= l.start_date && dateStr <= l.end_date
  })
  return leave ? leave.type : null
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'monthly' // 'monthly' (matrix) or 'individual' (sheets)
    const month = parseInt(searchParams.get('month') || '0')
    const year = parseInt(searchParams.get('year') || '0')

    if (!month || !year) {
      return NextResponse.json({ error: 'month and year are required' }, { status: 400 })
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

    // Fetch all active employees (users) who are not admin
    const { data: users, error: usersError } = await supabaseServer
      .from('users')
      .select('id, name, email, role')
      .eq('is_active', true)
      .neq('role', 'admin')
      .order('name', { ascending: true })

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
    }

    // Fetch all attendance records for the month
    const { data: attendance, error: attendanceError } = await supabaseServer
      .from('attendance')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError)
      return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 })
    }

    // Fetch all company holidays for the month
    const { data: holidays, error: holidaysError } = await supabaseServer
      .from('company_holidays')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)

    // Fetch all approved leaves for the month
    const { data: leaves, error: leavesError } = await supabaseServer
      .from('leaves')
      .select('*')
      .eq('status', 'approved')
      .lte('start_date', endDate)
      .gte('end_date', startDate)

    const monthNames = [
      'Jun', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]
    // Get correct month name from list
    const monthNamesFull = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]
    const monthName = monthNamesFull[month - 1]

    const wb = XLSX.utils.book_new()

    if (type === 'monthly') {
      // ─── MONTHLY ALL-EMPLOYEE REPORT (MATRIX) ───
      const headers = ['Employee Name', 'Email']
      for (let d = 1; d <= lastDay; d++) {
        headers.push(String(d).padStart(2, '0'))
      }
      headers.push('Total Working Days', 'Total Work Days', 'Total Work Hours')

      const matrixRows: any[] = []

      for (const employee of users || []) {
        const empId = employee.id
        const row: Record<string, any> = {
          'Employee Name': employee.name,
          'Email': employee.email || ''
        }

        let totalWorkingDays = 0
        let totalWorkDays = 0
        let totalWorkHours = 0

        for (let d = 1; d <= lastDay; d++) {
          const dayStr = String(d).padStart(2, '0')
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${dayStr}`
          
          const sunday = isSunday(dateStr)
          const holidayName = getHolidayName(dateStr, holidays || [])
          const leaveType = getApprovedLeaveType(empId, dateStr, leaves || [])

          if (!sunday && !holidayName) {
            totalWorkingDays++
          }

          const att = (attendance || []).find((a: any) => a.employee_id === empId && a.date === dateStr)

          let cellValue = '—'
          if (att) {
            const hours = calculateHoursNumeric(att.check_in, att.check_out)
            const hoursStr = hours > 0 ? `${hours.toFixed(1)}h` : '—'
            cellValue = `${att.status || 'Present'}${hours > 0 ? ` (${hoursStr})` : ''}`

            totalWorkDays += att.attendance_value ?? 1.0
            totalWorkHours += hours
          } else {
            if (sunday) {
              cellValue = 'Sunday'
            } else if (holidayName) {
              cellValue = `Holiday (${holidayName})`
            } else if (leaveType) {
              cellValue = `Leave (${leaveType})`
            } else {
              cellValue = 'Absent'
            }
          }

          row[dayStr] = cellValue
        }

        row['Total Working Days'] = totalWorkingDays
        row['Total Work Days'] = totalWorkDays
        row['Total Work Hours'] = parseFloat(totalWorkHours.toFixed(1))

        matrixRows.push(row)
      }

      const ws = XLSX.utils.json_to_sheet(matrixRows, { header: headers })
      XLSX.utils.book_append_sheet(wb, ws, 'Monthly Summary')

    } else {
      // ─── INDIVIDUAL EMPLOYEE REPORTS (SEPARATE SHEETS) ───
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

      for (const employee of users || []) {
        const empId = employee.id
        const sheetData: any[][] = []

        // Title block
        sheetData.push(['ATTENDANCE DETAILS'])
        sheetData.push([])

        // Table Headers
        sheetData.push(['Date', 'Day', 'Check In', 'Check Out', 'Hours', 'Status', 'GPS Distance'])

        let totalWorkingDays = 0
        let totalDaysPresent = 0
        let totalDaysAbsent = 0
        let totalApprovedLeaves = 0
        let totalHoursWorked = 0

        for (let d = 1; d <= lastDay; d++) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          const dateObj = new Date(year, month - 1, d)
          const formattedDate = `${String(d).padStart(2, '0')} ${monthName} ${year}`
          const dayName = dayNames[dateObj.getDay()]

          const sunday = isSunday(dateStr)
          const holidayName = getHolidayName(dateStr, holidays || [])
          const leaveType = getApprovedLeaveType(empId, dateStr, leaves || [])

          if (!sunday && !holidayName) {
            totalWorkingDays++
          }

          const att = (attendance || []).find((a: any) => a.employee_id === empId && a.date === dateStr)

          let checkIn = '—'
          let checkOut = '—'
          let hoursStr = '—'
          let status = '—'
          let gpsDistance = '—'

          if (att) {
            checkIn = att.check_in ? formatISTTimestamp(att.check_in) : '—'
            checkOut = att.check_out ? formatISTTimestamp(att.check_out) : '—'
            const hours = calculateHoursNumeric(att.check_in, att.check_out)
            hoursStr = hours > 0 ? String(hours.toFixed(1)) : '—'
            status = att.status || 'Present'
            gpsDistance = att.gps_data?.distance_from_office 
              ? `${Math.round(att.gps_data.distance_from_office)}m` 
              : 'N/A'

            totalDaysPresent += att.attendance_value ?? 1.0
            totalHoursWorked += hours
          } else {
            if (sunday) {
              status = 'Sunday'
            } else if (holidayName) {
              status = `Holiday (${holidayName})`
            } else if (leaveType) {
              status = `Leave (${leaveType})`
              totalApprovedLeaves++
            } else {
              status = 'Absent'
              totalDaysAbsent++
            }
          }

          sheetData.push([formattedDate, dayName, checkIn, checkOut, hoursStr, status, gpsDistance])
        }

        // Leave details space padding
        sheetData.push([])
        sheetData.push([])

        // Monthly Summary block
        sheetData.push(['MONTHLY SUMMARY'])
        sheetData.push(['Total Working Days', totalWorkingDays])
        sheetData.push(['Total Days Present', totalDaysPresent])
        sheetData.push(['Total Days Absent', totalDaysAbsent])
        sheetData.push(['Total Approved Leaves', totalApprovedLeaves])
        sheetData.push(['Total Hours Worked', parseFloat(totalHoursWorked.toFixed(1))])

        // Add sheet to workbook (truncate sheet name to max 31 characters for Excel constraints)
        const safeSheetName = employee.name.replace(/[\\\/\?\*\:\[\]]/g, '').substring(0, 31) || `Employee_${empId.substring(0,6)}`
        const ws = XLSX.utils.aoa_to_sheet(sheetData)
        XLSX.utils.book_append_sheet(wb, ws, safeSheetName)
      }
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const filePrefix = type === 'monthly' ? 'monthly-attendance' : 'individual-attendance'
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filePrefix}-${year}-${String(month).padStart(2, '0')}.xlsx"`,
      },
    })
  } catch (error: any) {
    console.error('Export error:', error)
    const status = error.message?.includes('Forbidden') ? 403 : error.message?.includes('Unauthorized') ? 401 : 500
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req)
    const { startDate, endDate } = await req.json()

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 })
    }

    const { data: records, error } = await supabaseServer
      .from('attendance')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 })
    }

    return NextResponse.json({ success: true, records, count: records?.length || 0 })
  } catch (error: any) {
    console.error(error)
    const status = error.message?.includes('Forbidden') ? 403 : error.message?.includes('Unauthorized') ? 401 : 500
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}

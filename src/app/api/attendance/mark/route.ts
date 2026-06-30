/**
 * POST /api/attendance/mark
 * Mark attendance with selfie and GPS (serverless)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdmin } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'
import { checkAttendanceAllowed, getTodayIST } from '@/lib/date-utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    // Validate authentication
    const user = await requireAuth(req)
    const userId = user.userId

    // Validate input
    const { latitude, longitude, accuracy, selfieURL, address } = await req.json()

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'GPS location is required' }, { status: 400 })
    }
    if (!selfieURL) {
      return NextResponse.json({ error: 'Selfie photo is required' }, { status: 400 })
    }

    // Calculate date components from IST time first for queries
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const istDate = new Date(now.getTime() + istOffset)
    const year = istDate.getUTCFullYear()
    const month = String(istDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(istDate.getUTCDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    // Fetch office location, holidays, opt-in details, and check-in existence in parallel
    console.log('[Attendance] Fetching database pre-requisites concurrently...')
    const [officeRes, holidaysRes, optInRes, existingRes] = await Promise.all([
      supabaseServer
        .from('office_locations')
        .select('latitude, longitude, radius_meters, name')
        .eq('is_active', true)
        .limit(1)
        .single(),
      supabaseServer
        .from('holidays')
        .select('name, date')
        .eq('is_active', true),
      supabaseServer
        .from('working_day_opt_ins')
        .select('*')
        .eq('employee_id', userId)
        .eq('date', dateStr)
        .maybeSingle(),
      supabaseServer
        .from('attendance')
        .select('id')
        .eq('employee_id', userId)
        .eq('date', dateStr)
        .maybeSingle()
    ])

    const { data: officeLocations, error: officeError } = officeRes
    const { data: holidays } = holidaysRes
    const { data: optIn } = optInRes
    const { data: existing } = existingRes

    console.log('[Attendance] Office location query result:', { officeLocation: officeLocations, officeError })

    if (officeError) {
      console.error('[Attendance] Error fetching office location:', officeError)
      return NextResponse.json({ 
        error: 'Failed to fetch office location',
        details: officeError.message,
        hint: 'Check if office_locations table exists and has an active location'
      }, { status: 500 })
    }

    if (!officeLocations) {
      console.error('[Attendance] No active office location found in database')
      return NextResponse.json({ 
        error: 'Office location not configured. Please ask admin to set up office coordinates in Settings page.',
        hint: 'Admin: Go to Settings → Office Location → Enter coordinates → Save'
      }, { status: 400 })
    }

    console.log('[Attendance] Using office location:', officeLocations.name, 'at', officeLocations.latitude, officeLocations.longitude)

    // Validate GPS radius (office location check)
    const OFFICE_LAT = officeLocations.latitude
    const OFFICE_LNG = officeLocations.longitude
    const ALLOWED_RADIUS_KM = officeLocations.radius_meters / 1000 // Convert meters to km

    // Calculate distance using Haversine formula
    const toRad = (deg: number) => deg * (Math.PI / 180)
    const R = 6371 // Earth's radius in km
    const dLat = toRad(latitude - OFFICE_LAT)
    const dLon = toRad(longitude - OFFICE_LNG)
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(OFFICE_LAT)) * Math.cos(toRad(latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    console.log('GPS Distance from office:', distance, 'km', '| Allowed:', ALLOWED_RADIUS_KM, 'km')

    if (distance > ALLOWED_RADIUS_KM) {
      return NextResponse.json({ 
        error: `You are ${distance.toFixed(2)} km away from ${officeLocations.name}. Please be within ${officeLocations.radius_meters}m to mark attendance.`,
        distance: distance.toFixed(2),
        officeName: officeLocations.name
      }, { status: 400 })
    }

    console.log('Marking attendance for user:', userId)

    // Check if attendance is allowed today (holidays/weekends)
    const today = getTodayIST()
    const holidayList = holidays?.map(h => ({ name: h.name, date: h.date })) || []
    const attendanceCheck = checkAttendanceAllowed(today, holidayList)
    
    // If attendance is not normally allowed, check for approved opt-in
    if (!attendanceCheck.allowed && !optIn) {
      return NextResponse.json({ 
        error: attendanceCheck.reason || 'Attendance not allowed on this date. You can request to work on this day from the attendance page.'
      }, { status: 400 })
    }

    // Check office hours (8 AM - 6 PM) - reuse already calculated values
    const istHour = istDate.getUTCHours()
    const istMinute = istDate.getUTCMinutes()
    const totalMinutes = istHour * 60 + istMinute
    
    // Before 8:00 AM (480 minutes)
    if (totalMinutes < 480) {
      return NextResponse.json({ 
        error: 'Too early! Office hours start at 8:00 AM'
      }, { status: 400 })
    }
    
    // After 6:30 PM (1110 minutes)
    if (totalMinutes >= 1110) {
      return NextResponse.json({ 
        error: 'Office hours ended at 6:30 PM. Please contact admin to mark attendance.'
      }, { status: 400 })
    }

    console.log('Date:', dateStr, 'Time:', now.toISOString())
    console.log('IST Date object:', istDate.toISOString())
    console.log('Extracted date string:', dateStr)
    console.log('Opt-in status:', optIn ? 'Approved opt-in found' : 'No opt-in')

    if (existing) {
      return NextResponse.json({ error: 'Attendance already marked for today' }, { status: 400 })
    }

    // Determine status based on time (using already calculated totalMinutes)
    let status = 'present'
    let attendanceValue = 1.0
    let isLate = false

    if (totalMinutes <= 545) { // 9:05 AM
      status = 'present'
      attendanceValue = 1.0
      isLate = false
    } else if (totalMinutes <= 570) { // 9:30 AM
      status = 'late_within_buffer'
      attendanceValue = 1.0
      isLate = true
    } else {
      status = 'half_day'
      attendanceValue = 0.5
      isLate = true
    }

    console.log('Status:', status, 'Value:', attendanceValue, 'Late:', isLate)

    // Insert attendance record directly
    console.log('Attempting to insert attendance:', {
      employee_id: userId,
      date: dateStr,
      status,
      attendance_value: attendanceValue,
    })

    const { data: attendance, error: insertError } = await supabaseServer
      .from('attendance')
      .insert({
        employee_id: userId,
        date: dateStr,
        check_in: now.toISOString(),
        status,
        selfie_url: selfieURL,
        attendance_value: attendanceValue,
        is_late: isLate,
        late_count: isLate ? 1 : 0,
        gps_data: {
          latitude,
          longitude,
          accuracy,
          address: address || null,
          captured_at: now.toISOString(),
        },
      })
      .select()
      .single()

    console.log('Insert result:', { attendance, insertError })

    if (insertError) {
      console.error('Insert error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      })
      return NextResponse.json({ 
        error: insertError.message || 'Failed to mark attendance',
        details: insertError,
        debug: {
          employee_id: userId,
          date: dateStr,
          using_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        }
      }, { status: 500 })
    }

    console.log('Attendance marked successfully:', attendance.id)

    return NextResponse.json({
      success: true,
      message: 'Attendance marked successfully',
      data: {
        id: attendance.id,
        status,
        attendance_value: attendanceValue,
        is_late: isLate,
      },
    })
  } catch (error: any) {
      console.error(error)
      const status = error.message?.includes('Forbidden') ? 403 : error.message?.includes('Unauthorized') ? 401 : 500
      return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
    }
}

/**
 * Attendance Service
 * All attendance-related database operations using Supabase functions
 */

import { supabase } from './client'

export interface MarkAttendanceParams {
  employee_id: string
  check_in_time: string
  selfie_url: string
  gps_data: {
    latitude: number
    longitude: number
    accuracy: number
    distance_from_office?: number
    address?: string
    captured_at: string
  }
}

export interface MarkAttendanceResponse {
  success: boolean
  attendance_id?: string
  status?: string
  attendance_value?: number
  is_late?: boolean
  error?: string
}

/**
 * Mark attendance (check-in)
 */
export async function markAttendance(params: MarkAttendanceParams): Promise<MarkAttendanceResponse> {
  const { data, error } = await supabase.rpc('mark_attendance', {
    employee_id_param: params.employee_id,
    check_in_time: params.check_in_time,
    selfie_url_param: params.selfie_url,
    gps_data_param: params.gps_data,
  })

  if (error) {
    console.error('Error marking attendance:', error)
    return { success: false, error: error.message }
  }

  return data as MarkAttendanceResponse
}

/**
 * Mark checkout
 */
export async function markCheckout(employeeId: string, checkoutTime: string) {
  const { data, error } = await supabase.rpc('mark_checkout', {
    employee_id_param: employeeId,
    checkout_time: checkoutTime,
  })

  if (error) {
    console.error('Error marking checkout:', error)
    return { success: false, error: error.message }
  }

  return data
}

/**
 * Get today's attendance for employee
 */
export async function getTodayAttendance(employeeId: string) {
  const { data, error } = await supabase.rpc('get_today_attendance', {
    employee_id_param: employeeId,
  })

  if (error) {
    console.error('Error getting today attendance:', error)
    return { success: false, error: error.message }
  }

  return data
}

/**
 * Get attendance records for a date range
 */
export async function getAttendanceRecords(
  employeeId: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) {
    console.error('Error getting attendance records:', error)
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data }
}

/**
 * Get all attendance records (admin only)
 */
export async function getAllAttendanceRecords(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      *,
      users:employee_id (
        name,
        email,
        department
      )
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) {
    console.error('Error getting all attendance records:', error)
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data }
}

/**
 * Get monthly attendance summary
 */
export async function getMonthlyAttendanceSummary(employeeId: string, year: number, month: number) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .like('date', `${monthStr}%`)

  if (error) {
    console.error('Error getting monthly summary:', error)
    return { success: false, error: error.message, data: [] }
  }

  // Calculate summary
  const totalDays = data.length
  const presentDays = data.filter(d => d.status === 'present').length
  const lateDays = data.filter(d => d.is_late).length
  const halfDays = data.filter(d => d.status === 'half_day').length
  const totalAttendanceValue = data.reduce((sum, d) => sum + d.attendance_value, 0)

  return {
    success: true,
    data: {
      records: data,
      summary: {
        totalDays,
        presentDays,
        lateDays,
        halfDays,
        totalAttendanceValue,
      },
    },
  }
}

/**
 * Upload selfie to Supabase Storage
 */
export async function uploadSelfie(file: File, employeeId: string): Promise<string | null> {
  const fileName = `${employeeId}/${Date.now()}.jpg`
  
  const { data, error } = await supabase.storage
    .from('selfies')
    .upload(fileName, file, {
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (error) {
    console.error('Error uploading selfie:', error)
    return null
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('selfies')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

/**
 * Validate GPS location against office location
 */
export async function validateGPSLocation(latitude: number, longitude: number): Promise<{
  valid: boolean
  distance?: number
  office?: any
}> {
  // Get active office locations
  const { data: offices, error } = await supabase
    .from('office_locations')
    .select('*')
    .eq('is_active', true)

  if (error || !offices || offices.length === 0) {
    return { valid: false }
  }

  // Calculate distance to nearest office
  const office = offices[0]
  const distance = calculateDistance(
    latitude,
    longitude,
    office.latitude,
    office.longitude
  )

  return {
    valid: distance <= office.radius_meters,
    distance,
    office,
  }
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

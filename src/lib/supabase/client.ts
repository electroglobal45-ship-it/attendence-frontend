/**
 * Supabase Client Configuration
 * This is the main client for all database operations
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Database Types
export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'employee' | 'intern'
  department?: string
  designation?: string
  monthly_salary?: number
  joining_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: string
  employee_id: string
  date: string
  check_in?: string
  check_out?: string
  status: 'present' | 'absent' | 'half_day' | 'late_within_buffer' | 'approved_short_leave'
  selfie_url?: string
  attendance_value: number
  is_late: boolean
  late_count: number
  gps_data?: {
    latitude: number
    longitude: number
    accuracy: number
    distance_from_office?: number
    address?: string
    captured_at: string
  }
  created_at: string
  updated_at: string
}

export interface Leave {
  id: string
  employee_id: string
  leave_type: 'full_day' | 'half_day' | 'short_leave'
  start_date: string
  end_date: string
  status: 'pending' | 'approved' | 'rejected'
  reason?: string
  approved_by?: string
  approved_at?: string
  attendance_value?: number
  monthly_count?: number
  created_at: string
  updated_at: string
}

export interface Salary {
  id: string
  employee_id: string
  year: number
  month: number
  working_days: number
  per_day_salary: number
  total_attendance_value: number
  payable_salary: number
  deductions: number
  bonus_amount: number
  bonus_type?: 'no_leave' | 'diwali' | 'internship'
  created_at: string
  updated_at: string
}

export interface CompanyHoliday {
  id: string
  date: string
  name: string
  description?: string
  created_at: string
}

export interface OfficeLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  radius_meters: number
  is_active: boolean
  created_at: string
  updated_at: string
}

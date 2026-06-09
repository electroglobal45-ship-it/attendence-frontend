/**
 * GET /api/admin/attendance
 * Returns all employees' attendance for today
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function todayIST(): string {
  const ist = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000)
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    
    const today = todayIST()
    console.log('[Admin Attendance] Fetching attendance for:', today)

    const { data: attendance, error } = await supabaseServer
      .from('attendance')
      .select(`
        id,
        employee_id,
        date,
        check_in,
        check_out,
        status,
        selfie_url,
        attendance_value,
        is_late,
        users (
          name,
          email
        )
      `)
      .eq('date', today)
      .order('check_in', { ascending: false })

    if (error) {
      console.error('[Admin Attendance] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[Admin Attendance] Found records:', attendance?.length || 0)

    return NextResponse.json({ records: attendance || [] })
  } catch (error: any) {
    console.error('[Admin Attendance] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

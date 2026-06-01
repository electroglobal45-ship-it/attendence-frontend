import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/opt-in-working-days
 * Admin views all opt-in requests
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const userId = user.userId

    // Verify admin role
    const { data: userRole } = await supabaseServer
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!userRole || userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') // YYYY-MM-DD format

    let query = supabaseServer
      .from('working_day_opt_ins')
      .select('*')
      .order('date', { ascending: true })

    if (date) {
      query = query.eq('date', date)
    }

    const { data: optIns, error } = await query

    if (error) {
      console.error('Error fetching opt-ins:', error)
      return NextResponse.json({ error: 'Failed to fetch opt-ins', details: error.message }, { status: 500 })
    }

    // Fetch user details separately for each opt-in
    const optInsWithUsers = await Promise.all(
      (optIns || []).map(async (optIn) => {
        const { data: userData } = await supabaseServer
          .from('users')
          .select('name, email')
          .eq('id', optIn.employee_id)
          .single()
        
        return {
          ...optIn,
          users: userData || null
        }
      })
    )

    return NextResponse.json({ optIns: optInsWithUsers })
  } catch (error) {
    console.error('Error in admin opt-in-working-days GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

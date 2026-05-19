/**
 * GET /api/admin/leaves
 * Returns ALL leave requests with employee info (admin only).
 * ?status=pending  — filter by status (optional)
 *
 * Uses service-role Supabase client (bypasses RLS).
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const decoded = verifyToken(authHeader.substring(7))
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')

    let query = supabaseServer
      .from('leaves')
      .select('*, users(name, email)')
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: leaves, error } = await query

    if (error) {
      console.error('Error fetching leaves:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch leaves', 
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code 
      }, { status: 500 })
    }

    return NextResponse.json({ leaves: leaves || [] })
  } catch (error: any) {
    console.error('[Admin Leaves] Exception:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message,
      details: error.toString()
    }, { status: 500 })
  }
}

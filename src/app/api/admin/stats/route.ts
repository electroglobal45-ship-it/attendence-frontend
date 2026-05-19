/**
 * GET /api/admin/stats
 * Returns dashboard stats: total employees, present today, absent today,
 * pending leaves, pending short leaves.
 *
 * Uses service-role Supabase client (bypasses RLS).
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import { supabaseServer } from '@/lib/supabase-server'

function todayIST(): string {
  const ist = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000)
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    console.log('🔐 [Admin Stats] Auth header:', authHeader ? 'Present' : 'Missing')
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('❌ [Admin Stats] No Bearer token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    console.log('🔑 [Admin Stats] Token received, length:', token.length)
    console.log('🔑 [Admin Stats] Token preview:', token.substring(0, 20) + '...')
    
    const decoded = verifyToken(token)
    console.log('🔓 [Admin Stats] Token decoded:', decoded ? 'Yes' : 'No')
    if (decoded) {
      console.log('👤 [Admin Stats] User:', decoded.userId, 'Role:', decoded.role)
    }
    
    if (!decoded || decoded.role !== 'admin') {
      console.log('❌ [Admin Stats] Admin access denied. Decoded:', decoded)
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const today = todayIST()
    
    console.log('[Admin Stats] Querying for date:', today)
    console.log('[Admin Stats] Current time:', new Date().toISOString())

    const [empRes, presentRes, pendingLeavesRes, pendingShortRes] = await Promise.all([
      supabaseServer
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'employee')
        .eq('is_active', true),

      supabaseServer
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .in('status', ['present', 'late_within_buffer', 'half_day', 'approved_short_leave']),
        // Count anyone who checked in today (any status except absent)

      supabaseServer
        .from('leaves')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),

      supabaseServer
        .from('leaves')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('leave_type', 'short_leave'),
    ])

    const totalEmployees    = empRes.count          ?? 0
    const presentToday      = presentRes.count       ?? 0
    const pendingLeaves     = pendingLeavesRes.count ?? 0
    const pendingShortLeaves = pendingShortRes.count ?? 0

    console.log('[Admin Stats] Results:', {
      totalEmployees,
      presentToday,
      absentToday: Math.max(0, totalEmployees - presentToday),
      pendingLeaves,
      pendingShortLeaves
    })

    return NextResponse.json({
      totalEmployees,
      presentToday,
      absentToday:      Math.max(0, totalEmployees - presentToday),
      pendingLeaves,
      pendingShortLeaves,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

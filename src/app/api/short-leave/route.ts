/**
 * GET  /api/short-leave          — employee's own short leave history
 * POST /api/short-leave          — employee applies for short leave
 * GET  /api/short-leave?all=true — admin: all short leaves (pending first)
 *
 * Uses service-role Supabase client (bypasses RLS).
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import { supabaseServer } from '@/lib/supabase-server'

// ─── IST helpers ─────────────────────────────────────────────────────────────

function toIST(date: Date) {
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000)
}

function todayIST() {
  const ist = toIST(new Date())
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`
}

function currentMonthIST() {
  const ist = toIST(new Date())
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}`
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const decoded = verifyToken(authHeader.substring(7))
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const all = searchParams.get('all') === 'true'

    if (all && decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    let query = supabaseServer
      .from('short_leaves')
      .select('*, users(name, email)')
      .order('created_at', { ascending: false })

    if (!all) {
      query = query.eq('employee_id', decoded.userId)
    }

    const { data, error } = await query
    if (error) {
      console.error('GET /api/short-leave error:', error)
      return NextResponse.json({ error: 'Failed to fetch short leaves' }, { status: 500 })
    }

    return NextResponse.json({ shortLeaves: data || [] })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const decoded = verifyToken(authHeader.substring(7))
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { type, reason } = await req.json()

    if (!type || !['morning', 'evening'].includes(type)) {
      return NextResponse.json({ error: 'type must be "morning" or "evening"' }, { status: 400 })
    }

    const today       = todayIST()
    const monthPrefix = currentMonthIST()

    // Count pending + approved short leaves this month
    const { count: monthlyCount } = await supabaseServer
      .from('short_leaves')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', decoded.userId)
      .gte('date', `${monthPrefix}-01`)
      .lte('date', `${monthPrefix}-31`)
      .in('status', ['approved', 'pending'])

    // Validate IST time window
    const istNow   = toIST(new Date())
    const istHour  = istNow.getUTCHours()
    const istMin   = istNow.getUTCMinutes()
    const totalMin = istHour * 60 + istMin

    if (type === 'morning' && totalMin > 11 * 60 + 5) {
      return NextResponse.json(
        { error: 'Morning short leave must be applied before 11:05 AM IST' },
        { status: 400 }
      )
    }
    if (type === 'evening' && totalMin < 16 * 60) {
      return NextResponse.json(
        { error: 'Evening short leave cannot be applied before 4:00 PM IST' },
        { status: 400 }
      )
    }

    // Check for duplicate today
    const { data: existing } = await supabaseServer
      .from('short_leaves')
      .select('id')
      .eq('employee_id', decoded.userId)
      .eq('date', today)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'You have already applied for a short leave today' },
        { status: 409 }
      )
    }

    // First 2 approved/pending = value 1; beyond 2 = value 0.75
    const usedCount       = monthlyCount ?? 0
    const attendanceValue = usedCount < 2 ? 1 : 0.75

    const { data: shortLeave, error } = await supabaseServer
      .from('short_leaves')
      .insert({
        employee_id:      decoded.userId,
        date:             today,
        type,
        reason:           reason || '',
        status:           'pending',
        monthly_count:    usedCount + 1,
        attendance_value: attendanceValue,
      })
      .select()
      .single()

    if (error) {
      console.error('Short leave insert error:', error)
      return NextResponse.json(
        { error: 'Failed to apply for short leave', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        shortLeave,
        message: `${type === 'morning' ? 'Morning' : 'Evening'} short leave applied. Pending admin approval.`,
      },
      { status: 201 }
    )
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

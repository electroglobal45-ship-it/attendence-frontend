/**
 * GET  /api/leaves/apply  — fetch employee's own leave history
 * POST /api/leaves/apply  — employee applies for leave
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
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { data: leaves, error } = await supabaseServer
      .from('leave_requests')
      .select('*')
      .eq('employee_id', decoded.userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching leaves:', error)
      return NextResponse.json({ error: 'Failed to fetch leaves' }, { status: 500 })
    }

    return NextResponse.json({ leaves: leaves || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const decoded = verifyToken(authHeader.substring(7))
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const body = await req.json()
    // Accept both 'leaveType' (from frontend form) and 'type' (legacy)
    const { startDate, endDate, reason, leaveType, type } = body
    const resolvedType = leaveType || type

    if (!startDate || !endDate || !resolvedType) {
      return NextResponse.json({ error: 'startDate, endDate, and leaveType are required' }, { status: 400 })
    }

    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({ error: 'Start date cannot be after end date' }, { status: 400 })
    }

    // Calculate total days (simple count, excluding weekends is handled by backend engine)
    const start = new Date(startDate)
    const end   = new Date(endDate)
    const diffMs = end.getTime() - start.getTime()
    const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1

    const { data: leaveRequest, error } = await supabaseServer
      .from('leave_requests')
      .insert({
        employee_id: decoded.userId,
        start_date:  startDate,
        end_date:    endDate,
        total_days:  totalDays,
        reason:      reason || '',
        type:        resolvedType,
        status:      'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating leave request:', error)
      return NextResponse.json({ error: 'Failed to apply for leave', details: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { success: true, message: 'Leave request submitted successfully', leaveRequest },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

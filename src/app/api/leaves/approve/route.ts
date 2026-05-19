/**
 * POST /api/leaves/approve
 * Admin approves or rejects a leave request.
 *
 * Uses service-role Supabase client (bypasses RLS).
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const decoded = verifyToken(authHeader.substring(7))
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { leaveRequestId, status, remarks } = await req.json()

    if (!leaveRequestId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'leaveRequestId and status (approved|rejected) required' }, { status: 400 })
    }

    const { data: leaveRequest, error } = await supabaseServer
      .from('leave_requests')
      .update({
        status,
        remarks:     remarks || null,
        approved_by: decoded.userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', leaveRequestId)
      .select()
      .single()

    if (error) {
      console.error('Error updating leave request:', error)
      return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 })
    }

    return NextResponse.json({ success: true, leaveRequest })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

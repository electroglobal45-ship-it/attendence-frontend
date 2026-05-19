/**
 * POST /api/attendance/checkout
 * Record employee check-out time (serverless)
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    // Verify JWT token
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get today's date in IST
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const istDate = new Date(now.getTime() + istOffset)
    
    const year = istDate.getUTCFullYear()
    const month = String(istDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(istDate.getUTCDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    console.log('[Checkout] Employee:', decoded.userId, 'Date:', dateStr)

    // Find today's attendance record
    const { data: existing, error: findError } = await supabaseServer
      .from('attendance')
      .select('id, check_in, check_out')
      .eq('employee_id', decoded.userId)
      .eq('date', dateStr)
      .maybeSingle()

    if (findError) {
      console.error('[Checkout] Find error:', findError)
      return NextResponse.json({ error: 'Failed to find attendance record' }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ error: 'No check-in record found for today' }, { status: 400 })
    }

    if (existing.check_out) {
      return NextResponse.json({ error: 'Already checked out for today' }, { status: 400 })
    }

    // Update with check-out time
    const { data: updated, error: updateError } = await supabaseServer
      .from('attendance')
      .update({ 
        check_out: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (updateError) {
      console.error('[Checkout] Update error:', updateError)
      return NextResponse.json({ error: updateError.message || 'Failed to checkout' }, { status: 500 })
    }

    console.log('[Checkout] Success:', updated.id)

    return NextResponse.json({
      success: true,
      message: 'Checked out successfully',
      data: updated,
    })
  } catch (error: any) {
    console.error('[Checkout] Exception:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

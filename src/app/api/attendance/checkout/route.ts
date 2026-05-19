/**
 * POST /api/attendance/checkout
 * Record employee check-out time (serverless)
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import { supabaseServer } from '@/lib/supabase-server'

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

    // Call database function to checkout
    const { data, error } = await supabaseServer.rpc('checkout_attendance', {
      employee_id_param: decoded.userId,
      check_out_time: new Date().toISOString(),
    })

    if (error) {
      console.error('Checkout error:', error)
      return NextResponse.json({ error: error.message || 'Failed to checkout' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Checked out successfully',
      data,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

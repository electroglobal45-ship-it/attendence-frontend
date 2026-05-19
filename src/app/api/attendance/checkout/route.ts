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

    // Get checkout data (GPS + selfie)
    const body = await req.json()
    const { latitude, longitude, accuracy, checkoutSelfieURL, address } = body

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
      .select('id, check_in, check_out, gps_data, attendance_value')
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

    // Prepare checkout GPS data
    const checkoutGPSData = latitude && longitude ? {
      latitude,
      longitude,
      accuracy: accuracy || 0,
      address: address || null,
      captured_at: now.toISOString(),
    } : null

    // Calculate checkout time rules (similar to check-in)
    const istHour = istDate.getUTCHours()
    const istMinute = istDate.getUTCMinutes()
    const totalMinutes = istHour * 60 + istMinute
    
    // Checkout before 5:30 PM (17:30) = half day deduction
    let checkoutPenalty = 0
    
    if (totalMinutes < 1050) { // Before 5:30 PM (17:30)
      checkoutPenalty = 0.5
      console.log('[Checkout] Early checkout detected, applying penalty')
    }

    // Update with check-out time, selfie, and GPS
    const updateData: any = { 
      check_out: now.toISOString(),
      updated_at: now.toISOString()
    }

    // Save checkout selfie URL
    if (checkoutSelfieURL) {
      updateData.checkout_selfie_url = checkoutSelfieURL
    }

    if (checkoutGPSData) {
      // Merge checkout GPS with existing check-in GPS
      updateData.gps_data = {
        ...(existing.gps_data || {}),
        checkout: checkoutGPSData
      }
    }

    // Apply checkout penalty if early
    if (checkoutPenalty > 0) {
      const currentValue = existing.attendance_value || 1.0
      updateData.attendance_value = Math.max(0, currentValue - checkoutPenalty)
      console.log('[Checkout] Updated attendance_value:', currentValue, '->', updateData.attendance_value)
    }

    const { data: updated, error: updateError } = await supabaseServer
      .from('attendance')
      .update(updateData)
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

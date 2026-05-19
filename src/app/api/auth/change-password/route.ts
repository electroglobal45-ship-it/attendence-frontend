/**
 * POST /api/auth/change-password
 * Change user password (plain text only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { verifyToken } from '@/lib/auth-utils'

export async function POST(req: NextRequest) {
  try {
    // Validate JWT token
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Validate input
    const { oldPassword, newPassword } = await req.json()
    const userId = decoded.userId

    if (!userId || !oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
    }

    // Get user from database
    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('id, email, password_hash')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.password_hash) {
      return NextResponse.json({ error: 'No password set for this user' }, { status: 400 })
    }

    // Verify old password (plain text only)
    if (user.password_hash !== oldPassword) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }

    // Update password in database (plain text)
    const { error: updateError } = await supabaseServer
      .from('users')
      .update({ password_hash: newPassword })
      .eq('id', userId)

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

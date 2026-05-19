/**
 * POST /api/auth/login
 * Email/password authentication (plain text only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { generateToken } from '@/lib/auth-utils'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    console.log('🔐 Login attempt:', email)

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    console.log('👤 User found:', user ? 'Yes' : 'No')

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!user.is_active) {
      console.log('❌ User inactive')
      return NextResponse.json({ error: 'User account is inactive' }, { status: 403 })
    }

    if (!user.password_hash) {
      console.log('❌ No password')
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Plain text password comparison only
    const passwordValid = user.password_hash === password

    console.log('✅ Password valid:', passwordValid)
    console.log('📝 Stored password:', user.password_hash)
    console.log('📝 Provided password:', password)
    console.log('📝 Password format check:', {
      hasColon: user.password_hash?.includes(':'),
      length: user.password_hash?.length,
      isPlainText: user.password_hash?.length < 50 && !user.password_hash?.includes(':')
    })

    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    console.log('🔑 Generating JWT token for user:', user.id, 'role:', user.role)
    const token = generateToken(user.id, user.email, user.role)
    console.log('🔑 Token generated:', token ? 'Yes' : 'No', 'Length:', token?.length)

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        category: user.category,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

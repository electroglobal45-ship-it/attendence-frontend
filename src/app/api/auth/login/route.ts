/**
 * POST /api/auth/login
 * Email/password authentication with plain text password verification
 * Uses Supabase Auth for session management only
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    console.log('🔐 Login attempt:', email)

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Get user profile from users table
    const { data: profile, error: profileError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (profileError || !profile) {
      console.log('❌ User not found')
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Verify plain text password
    if (profile.password_hash !== password) {
      console.log('❌ Password mismatch')
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!profile.is_active) {
      console.log('❌ User inactive')
      return NextResponse.json({ error: 'User account is inactive' }, { status: 403 })
    }

    console.log('✅ Password verified, signing in with Supabase Auth')

    // Sign in with Supabase Auth using the plain text password
    const { data: authData, error: authError } = await supabaseServer.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: password,
    })

    if (authError || !authData.user) {
      console.log('❌ Auth error:', authError?.message)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    console.log('✅ Login successful for:', profile.email, 'role:', profile.role)

    return NextResponse.json({
      success: true,
      token: authData.session.access_token, // Add this for compatibility
      session: authData.session,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        category: profile.category,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

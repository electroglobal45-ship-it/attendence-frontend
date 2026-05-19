/**
 * POST /api/auth/create-user
 * Admin endpoint to create new users
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { generateRandomPassword } from '@/lib/auth-utils'

export async function POST(req: NextRequest) {
  try {
    // Note: In production, you should verify the user is an admin
    // For now, we rely on RLS policies

    const { email, name, category, monthly_salary, joining_date } = await req.json()

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 })
    }

    const { data: existingUser } = await supabaseServer
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
    }

    const tempPassword = generateRandomPassword()
    // Store plain text password initially - will be hashed on first login
    const { data: newUser, error: createError } = await supabaseServer
      .from('users')
      .insert({
        email: email.toLowerCase(),
        name,
        role: 'employee',
        category: category || 'regular',
        monthly_salary: monthly_salary || 0,
        joining_date: joining_date || new Date().toISOString().split('T')[0],
        password_hash: tempPassword,  // Store plain text, will hash on first login
        is_active: true,
      })
      .select()
      .single()

    if (createError) {
      console.error('Create user error:', createError)
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        category: newUser.category,
      },
      tempPassword,
      message: 'User created successfully. Share the temporary password with the employee.',
    })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

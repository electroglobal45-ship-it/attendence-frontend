/**
 * GET  /api/employees  — list all employees (admin only)
 * POST /api/employees  — create a new employee (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, generateRandomPassword } from '@/lib/auth-utils'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(authHeader.substring(7))
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { data: employees, error } = await supabaseServer
      .from('users')
      .select('id, name, email, role, category, monthly_salary, joining_date, is_active, created_at')
      .eq('role', 'employee')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching employees:', error)
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
    }

    return NextResponse.json({ employees: employees || [] })
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
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { name, email, category, monthlySalary, joiningDate } = body

    if (!name || !email || !monthlySalary || !joiningDate) {
      return NextResponse.json({ error: 'name, email, monthlySalary, and joiningDate are required' }, { status: 400 })
    }

    // Check for duplicate email
    const { data: existing } = await supabaseServer
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'An employee with this email already exists' }, { status: 409 })
    }

    const tempPassword = generateRandomPassword()

    const { data: employee, error } = await supabaseServer
      .from('users')
      .insert({
        name,
        email:          email.toLowerCase(),
        role:           'employee',
        category:       category || 'regular',
        monthly_salary: monthlySalary,
        joining_date:   joiningDate,
        password_hash:  tempPassword, // Store plain text password
        is_active:      true,
      })
      .select('id, name, email, role, category, monthly_salary, joining_date')
      .single()

    if (error) {
      console.error('Error creating employee:', error)
      return NextResponse.json({ error: 'Failed to create employee', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, employee, tempPassword }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

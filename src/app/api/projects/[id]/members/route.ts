/**
 * GET  /api/projects/[id]/members  — get project members
 * POST /api/projects/[id]/members  — add member to project
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: { id: string }
}

async function verifyProjectAdmin(projectId: string, userId: string) {
  const { data: membership, error } = await supabaseServer
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (error || !membership || membership.role !== 'admin') {
    return false
  }

  return true
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const projectId = params.id

    // Verify user has access to the project
    const { data: membership, error: membershipError } = await supabaseServer
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.userId)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Get all project members
    const { data: members, error } = await supabaseServer
      .from('project_members')
      .select(`
        id,
        user_id,
        role,
        status,
        added_at,
        added_by,
        users(id, name, email, role),
        added_by_user:users!project_members_added_by_fkey(id, name, email)
      `)
      .eq('project_id', projectId)
      .order('added_at', { ascending: true })

    if (error) {
      console.error('Error fetching project members:', error)
      return NextResponse.json({ error: 'Failed to fetch project members' }, { status: 500 })
    }

    return NextResponse.json({ 
      members: members || [],
      current_user_role: membership.role
    })

  } catch (error: any) {
    console.error('Error in GET /api/projects/[id]/members:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status })
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const projectId = params.id
    const body = await req.json()
    
    const { user_id, email, role = 'member' } = body

    // Must provide either user_id or email
    if (!user_id && !email) {
      return NextResponse.json({ error: 'user_id or email is required' }, { status: 400 })
    }

    // Validate role
    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be admin, member, or viewer' }, { status: 400 })
    }

    // Verify user is project admin
    const isAdmin = await verifyProjectAdmin(projectId, user.userId)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only project admins can add members' }, { status: 403 })
    }

    // Find the user to add
    let targetUserId = user_id
    if (!targetUserId && email) {
      const { data: targetUser, error: userError } = await supabaseServer
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single()

      if (userError || !targetUser) {
        return NextResponse.json({ error: 'User not found with that email' }, { status: 404 })
      }

      targetUserId = targetUser.id
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseServer
      .from('project_members')
      .select('id, status')
      .eq('project_id', projectId)
      .eq('user_id', targetUserId)
      .single()

    if (existingMember) {
      if (existingMember.status === 'active') {
        return NextResponse.json({ error: 'User is already a member of this project' }, { status: 409 })
      } else {
        // Reactivate the membership
        const { data: reactivatedMember, error: reactivateError } = await supabaseServer
          .from('project_members')
          .update({
            status: 'active',
            role,
            added_by: user.userId,
            added_at: new Date().toISOString()
          })
          .eq('id', existingMember.id)
          .select(`
            id,
            user_id,
            role,
            status,
            added_at,
            users(id, name, email, role)
          `)
          .single()

        if (reactivateError) {
          console.error('Error reactivating member:', reactivateError)
          return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true, 
          member: reactivatedMember,
          reactivated: true
        }, { status: 200 })
      }
    }

    // Add new member
    const { data: newMember, error } = await supabaseServer
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: targetUserId,
        role,
        status: 'active',
        added_by: user.userId
      })
      .select(`
        id,
        user_id,
        role,
        status,
        added_at,
        users(id, name, email, role)
      `)
      .single()

    if (error) {
      console.error('Error adding project member:', error)
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      member: newMember 
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error in POST /api/projects/[id]/members:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}
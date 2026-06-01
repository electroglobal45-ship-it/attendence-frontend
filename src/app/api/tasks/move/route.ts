/**
 * POST /api/tasks/move  — move task between lists or reorder within list
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { requireAuthenticatedClient } from '@/lib/supabase-user-client'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const supabase = requireAuthenticatedClient(req)
    const body = await req.json()
    
    const { 
      task_id, 
      source_list_id, 
      destination_list_id, 
      destination_position 
    } = body

    if (!task_id || !destination_list_id || destination_position === undefined) {
      return NextResponse.json({ 
        error: 'task_id, destination_list_id, and destination_position are required' 
      }, { status: 400 })
    }

    // Get the task and verify permissions
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        list_id,
        project_id,
        position,
        projects!inner(
          id,
          project_members!inner(role, status)
        )
      `)
      .eq('id', task_id)
      .eq('projects.project_members.user_id', user.userId)
      .eq('projects.project_members.status', 'active')
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 })
    }

    // Check permissions (members and admins can move tasks)
    const projects = task.projects as any
    const projectMembers = Array.isArray(projects) 
      ? projects[0]?.project_members 
      : projects?.project_members
    const userRole = Array.isArray(projectMembers) 
      ? projectMembers[0]?.role || 'viewer'
      : projectMembers?.role || 'viewer'
    
    if (userRole === 'viewer') {
      return NextResponse.json({ error: 'Insufficient permissions to move task' }, { status: 403 })
    }

    // Verify destination list belongs to the same project
    const { data: destinationList, error: listError } = await supabase
      .from('project_lists')
      .select('id, project_id')
      .eq('id', destination_list_id)
      .eq('project_id', task.project_id)
      .single()

    if (listError || !destinationList) {
      return NextResponse.json({ error: 'Invalid destination list' }, { status: 400 })
    }

    const isMovingBetweenLists = task.list_id !== destination_list_id

    try {
      if (isMovingBetweenLists) {
        // Moving between different lists
        
        // 1. Update positions in source list (shift down tasks after the moved task)
        if (source_list_id && source_list_id === task.list_id) {
          const { data: sourceTasks } = await supabase
            .from('tasks')
            .select('id, position')
            .eq('list_id', source_list_id)
            .gt('position', task.position)

          if (sourceTasks && sourceTasks.length > 0) {
            for (const sourceTask of sourceTasks) {
              await supabase
                .from('tasks')
                .update({ position: sourceTask.position - 1 })
                .eq('id', sourceTask.id)
            }
          }
        }

        // 2. Update positions in destination list (shift up tasks at and after destination position)
        const { data: destTasks } = await supabase
          .from('tasks')
          .select('id, position')
          .eq('list_id', destination_list_id)
          .gte('position', destination_position)

        if (destTasks && destTasks.length > 0) {
          for (const destTask of destTasks) {
            await supabase
              .from('tasks')
              .update({ position: destTask.position + 1 })
              .eq('id', destTask.id)
          }
        }

        // 3. Move the task to new list and position
        const { data: updatedTask, error: updateError } = await supabase
          .from('tasks')
          .update({
            list_id: destination_list_id,
            position: destination_position,
            ...(destination_list_id !== task.list_id && {
              updated_at: new Date().toISOString()
            })
          })
          .eq('id', task_id)
          .select(`
            id,
            public_id,
            title,
            list_id,
            position,
            status,
            updated_at
          `)
          .single()

        if (updateError) {
          throw updateError
        }

        // Log the activity
        await supabase
          .from('task_activities')
          .insert({
            task_id: task.id,
            user_id: user.userId,
            action: 'moved',
            description: `Task moved to different list`,
            old_values: { 
              list_id: task.list_id, 
              position: task.position 
            },
            new_values: { 
              list_id: destination_list_id, 
              position: destination_position 
            }
          })

        return NextResponse.json({ 
          success: true, 
          task: updatedTask,
          moved_between_lists: true
        })

      } else {
        // Reordering within the same list
        
        const oldPosition = task.position
        const newPosition = destination_position

        if (oldPosition === newPosition) {
          return NextResponse.json({ 
            success: true, 
            task: {
              id: task.id,
              position: oldPosition
            },
            moved_between_lists: false
          })
        }

        if (oldPosition < newPosition) {
          // Moving down: shift tasks between old and new position up
          const { data: tasksToShift } = await supabase
            .from('tasks')
            .select('id, position')
            .eq('list_id', task.list_id)
            .gt('position', oldPosition)
            .lte('position', newPosition)

          if (tasksToShift && tasksToShift.length > 0) {
            for (const taskToShift of tasksToShift) {
              await supabase
                .from('tasks')
                .update({ position: taskToShift.position - 1 })
                .eq('id', taskToShift.id)
            }
          }
        } else {
          // Moving up: shift tasks between new and old position down
          const { data: tasksToShift } = await supabase
            .from('tasks')
            .select('id, position')
            .eq('list_id', task.list_id)
            .gte('position', newPosition)
            .lt('position', oldPosition)

          if (tasksToShift && tasksToShift.length > 0) {
            for (const taskToShift of tasksToShift) {
              await supabase
                .from('tasks')
                .update({ position: taskToShift.position + 1 })
                .eq('id', taskToShift.id)
            }
          }
        }

        // Update the task's position
        const { data: updatedTask, error: updateError } = await supabase
          .from('tasks')
          .update({
            position: newPosition,
            updated_at: new Date().toISOString()
          })
          .eq('id', task_id)
          .select(`
            id,
            public_id,
            title,
            list_id,
            position,
            status,
            updated_at
          `)
          .single()

        if (updateError) {
          throw updateError
        }

        // Log the activity
        await supabase
          .from('task_activities')
          .insert({
            task_id: task.id,
            user_id: user.userId,
            action: 'reordered',
            description: `Task reordered within list`,
            old_values: { position: oldPosition },
            new_values: { position: newPosition }
          })

        return NextResponse.json({ 
          success: true, 
          task: updatedTask,
          moved_between_lists: false
        })
      }

    } catch (dbError) {
      console.error('Database error during task move:', dbError)
      return NextResponse.json({ error: 'Failed to move task' }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Error in POST /api/tasks/move:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}

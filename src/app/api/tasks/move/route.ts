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

    // Get the task - minimal query to avoid column issues
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, list_id, project_id, position, status')
      .eq('id', task_id)
      .single()

    if (taskError || !task) {
      console.error('Task lookup error:', taskError)
      return NextResponse.json({ 
        error: 'Task not found', 
        details: taskError?.message,
        code: taskError?.code
      }, { status: 404 })
    }

    // Verify user has access to this project
    const { data: projectMember } = await supabase
      .from('project_members')
      .select('role, status')
      .eq('project_id', task.project_id)
      .eq('user_id', user.userId)
      .eq('status', 'active')
      .maybeSingle()

    // Check if user is admin from the users table
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.userId)
      .single()

    // Allow if user is project member or admin
    if (!projectMember && userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied to this project' }, { status: 403 })
    }

    // Verify destination list belongs to the same project
    const { data: destinationList, error: listError } = await supabase
      .from('project_lists')
      .select('id, name, project_id')
      .eq('id', destination_list_id)
      .eq('project_id', task.project_id)
      .single()

    if (listError || !destinationList) {
      return NextResponse.json({ error: 'Invalid destination list' }, { status: 400 })
    }

    // Get source list name if moving between lists
    let sourceListName = ''
    if (task.list_id && task.list_id !== destination_list_id) {
      const { data: sourceList } = await supabase
        .from('project_lists')
        .select('name')
        .eq('id', task.list_id)
        .single()
      
      sourceListName = sourceList?.name || 'Unknown List'
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

        let mappedStatus = task.status
        if (destinationList && destinationList.name) {
          const destLower = destinationList.name.toLowerCase()
          if (destLower.includes('todo') || destLower.includes('to do')) mappedStatus = 'todo'
          else if (destLower.includes('progress') || destLower.includes('doing')) mappedStatus = 'in_progress'
          else if (destLower.includes('done') || destLower.includes('complete')) mappedStatus = 'done'
          else if (destLower.includes('block')) mappedStatus = 'blocked'
        }

        // 3. Move the task to new list and position
        const { data: updatedTask, error: updateError } = await supabase
          .from('tasks')
          .update({
            list_id: destination_list_id,
            position: destination_position,
            status: mappedStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', task_id)
          .select('id, public_id, list_id, position, status, updated_at')
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
            description: `moved this card to ${destinationList.name}`,
            old_values: { 
              list_id: task.list_id,
              list_name: sourceListName,
              position: task.position 
            },
            new_values: { 
              list_id: destination_list_id,
              list_name: destinationList.name,
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
          .select('id, public_id, list_id, position, status, updated_at')
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

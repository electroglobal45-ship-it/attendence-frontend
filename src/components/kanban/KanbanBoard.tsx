'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { Plus, Loader2 } from 'lucide-react'
import { KanbanColumn } from './KanbanColumn'

interface Task {
  id: string
  public_id: string
  title: string
  description?: string
  list_id: string
  assigned_to?: string
  due_date?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: string
  completion_percentage: number
  position: number
  assigned_user?: {
    id: string
    name: string
    email: string
  }
}

interface List {
  id: string
  public_id: string
  name: string
  position: number
  color: string
}

interface KanbanBoardProps {
  projectId: string
  lists: List[]
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onAddTask?: (listId: string) => void
  onAddList?: () => void
  onEditList?: (list: List) => void
  onRefresh?: () => void
}

export function KanbanBoard({
  projectId,
  lists,
  tasks,
  onTaskClick,
  onAddTask,
  onAddList,
  onEditList,
  onRefresh,
}: KanbanBoardProps) {
  const [isMoving, setIsMoving] = useState(false)
  const [localLists, setLocalLists] = useState(lists)
  const [localTasks, setLocalTasks] = useState(tasks)

  // Update local state when props change
  useEffect(() => {
    setLocalLists(lists)
  }, [lists])

  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  // Group tasks by list
  const tasksByList = localTasks.reduce((acc, task) => {
    if (!acc[task.list_id]) {
      acc[task.list_id] = []
    }
    acc[task.list_id].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  // Sort tasks by position within each list
  Object.keys(tasksByList).forEach((listId) => {
    tasksByList[listId].sort((a, b) => a.position - b.position)
  })

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result

    // Dropped outside a droppable area
    if (!destination) return

    // Dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return
    }

    const sourceListId = source.droppableId
    const destListId = destination.droppableId
    const taskId = draggableId

    // Optimistically update UI
    const newTasks = [...localTasks]
    const taskIndex = newTasks.findIndex((t) => t.id === taskId)
    const task = newTasks[taskIndex]

    // Remove from source
    newTasks.splice(taskIndex, 1)

    // Update task's list_id and position
    task.list_id = destListId
    task.position = destination.index

    // Insert at destination
    newTasks.splice(
      newTasks.filter((t) => t.list_id === destListId).length > 0
        ? newTasks.findIndex((t) => t.list_id === destListId) + destination.index
        : newTasks.length,
      0,
      task
    )

    setLocalTasks(newTasks)
    setIsMoving(true)

    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch('/api/tasks/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          task_id: taskId,
          source_list_id: sourceListId,
          destination_list_id: destListId,
          destination_position: destination.index,
        }),
      })

      if (!res.ok) {
        // Revert on error
        setLocalTasks(tasks)
        const data = await res.json()
        console.error('Failed to move task:', data.error)
        alert('Failed to move task: ' + data.error)
      } else {
        // Refresh to get accurate positions
        onRefresh?.()
      }
    } catch (error) {
      console.error('Error moving task:', error)
      // Revert on error
      setLocalTasks(tasks)
      alert('Failed to move task')
    } finally {
      setIsMoving(false)
    }
  }

  return (
    <div className="relative">
      {isMoving && (
        <div className="absolute top-4 right-4 z-10 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-blue-500" />
          <span className="text-sm text-gray-600">Moving task...</span>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {localLists
            .sort((a, b) => a.position - b.position)
            .map((list) => (
              <KanbanColumn
                key={list.id}
                list={list}
                tasks={tasksByList[list.id] || []}
                onTaskClick={onTaskClick}
                onAddTask={onAddTask}
                onEditList={onEditList}
              />
            ))}

          {/* Add list button */}
          <div className="flex-shrink-0 w-80">
            <button
              onClick={onAddList}
              className="w-full h-full min-h-[100px] flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Plus size={20} />
              <span className="font-medium">Add list</span>
            </button>
          </div>
        </div>
      </DragDropContext>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { Plus, Loader2 } from 'lucide-react'
import { TrelloList } from './TrelloList'
import { getBoardBackground } from '@/lib/trello-colors'

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
  cover_color?: string
  labels?: Array<{ colorId: string; name?: string }>
  checklist_stats?: { completed: number; total: number }
  comment_count?: number
  attachment_count?: number
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

interface TrelloBoardProps {
  projectId: string
  lists: List[]
  tasks: Task[]
  boardBackground?: string
  onTaskClick?: (task: Task) => void
  onAddTask?: (listId: string) => void
  onAddList?: () => void
  onEditList?: (list: List) => void
  onRefresh?: () => void
}

export function TrelloBoard({
  projectId,
  lists,
  tasks,
  boardBackground = 'blue',
  onTaskClick,
  onAddTask,
  onAddList,
  onEditList,
  onRefresh,
}: TrelloBoardProps) {
  const [isMoving, setIsMoving] = useState(false)
  const [localLists, setLocalLists] = useState(lists)
  const [localTasks, setLocalTasks] = useState(tasks)
  const [isAddingList, setIsAddingList] = useState(false)
  const [newListName, setNewListName] = useState('')

  const background = getBoardBackground(boardBackground)

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

    if (!destination) return

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return
    }

    const sourceListId = source.droppableId
    const destListId = destination.droppableId
    const taskId = draggableId

    // Optimistic update
    const newTasks = [...localTasks]
    const taskIndex = newTasks.findIndex((t) => t.id === taskId)
    const task = newTasks[taskIndex]

    newTasks.splice(taskIndex, 1)
    task.list_id = destListId
    task.position = destination.index

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
        setLocalTasks(tasks)
        const data = await res.json()
        console.error('Failed to move task:', data.error)
      } else {
        onRefresh?.()
      }
    } catch (error) {
      console.error('Error moving task:', error)
      setLocalTasks(tasks)
    } finally {
      setIsMoving(false)
    }
  }

  const handleAddList = () => {
    if (newListName.trim()) {
      onAddList?.()
      setNewListName('')
      setIsAddingList(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddList()
    } else if (e.key === 'Escape') {
      setIsAddingList(false)
      setNewListName('')
    }
  }

  return (
    <div 
      className="relative h-full overflow-hidden"
      style={{
        background: background?.gradient || background?.color || '#0079BF',
      }}
    >
      {/* Moving indicator */}
      {isMoving && (
        <div className="absolute top-4 right-4 z-10 bg-white rounded-trello-md px-3 py-2 shadow-trello-modal flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-trello-blue" />
          <span className="text-sm text-text-primary font-medium">Moving card...</span>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="h-full overflow-x-auto overflow-y-hidden p-3">
          <div className="flex gap-3 h-full items-start">
            {/* Lists */}
            {localLists
              .sort((a, b) => a.position - b.position)
              .map((list) => (
                <TrelloList
                  key={list.id}
                  list={list}
                  tasks={tasksByList[list.id] || []}
                  onTaskClick={onTaskClick}
                  onAddTask={onAddTask}
                  onEditList={onEditList}
                />
              ))}

            {/* Add List */}
            <div className="flex-shrink-0 w-trello-list">
              {isAddingList ? (
                <div className="bg-list-bg rounded-trello-md p-2 space-y-2">
                  <input
                    autoFocus
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter list title..."
                    className="w-full px-2 py-1.5 text-sm border-2 border-trello-blue rounded-trello-sm focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAddList}
                      className="px-3 py-1.5 bg-trello-blue text-white text-sm font-medium rounded-trello-sm hover:bg-trello-blue-dark transition-colors"
                    >
                      Add list
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingList(false)
                        setNewListName('')
                      }}
                      className="p-1.5 hover:bg-list-bg-hover rounded transition-colors"
                    >
                      <span className="text-2xl leading-none text-text-secondary">×</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingList(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-trello-md transition-colors"
                >
                  <Plus size={16} />
                  <span className="text-sm font-medium">Add another list</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </DragDropContext>
    </div>
  )
}

'use client'

import { Droppable, Draggable } from '@hello-pangea/dnd'
import { Plus, MoreHorizontal } from 'lucide-react'
import { Card } from './Card'
import { useState } from 'react'

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

interface ListObj {
  id: string
  public_id: string
  name: string
  position: number
  color: string
  board_id?: string
}

interface ListProps {
  list: ListObj
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onAddTask?: (listId: string) => void
  onAddOptimisticTask?: (listId: string, title: string) => string
  onTaskCreated?: (task: Task, tempId?: string) => void
  onEditList?: (list: ListObj) => void
  onDeleteList?: (listId: string) => void
  dragHandleProps?: any
  isDragging?: boolean
}

export function List({ 
  list, 
  tasks, 
  onTaskClick, 
  onAddTask,
  onAddOptimisticTask,
  onTaskCreated,
  onEditList,
  onDeleteList,
  dragHandleProps,
  isDragging,
}: ListProps) {
  const [isAddingCard, setIsAddingCard] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [showListMenu, setShowListMenu] = useState(false)

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return

    const cardTitle = newCardTitle.trim()
    
    // STEP 1: ADD TO UI IMMEDIATELY - NO WAITING!
    const tempId = onAddOptimisticTask?.(list.id, cardTitle) || ''
    
    // STEP 2: Clear form immediately
    setNewCardTitle('')
    setIsAddingCard(false)
    setCreating(true)

    // STEP 3: Save to backend in background
    try {
      const token = localStorage.getItem('authToken')
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${BACKEND_URL}/api/v1/tasks/quick-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: cardTitle,
          list_id: list.id,
          board_id: list.board_id,
          position: tasks.length > 0 ? tasks[tasks.length - 1].position + 65536 : 65536
        })
      })

      if (response.ok) {
        const resData = await response.json()
        const realTask = resData.data?.task
        if (realTask && onTaskCreated) {
          onTaskCreated(realTask, tempId)
        } else {
          // Success fallback - refresh to replace optimistic with real card
          setTimeout(() => onAddTask?.(list.id), 500)
        }
      } else {
        const error = await response.json()
        console.error('Failed to create card:', error)
        // Don't rollback - let user keep working, they can retry later
        alert('Failed to save card to server: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error creating card:', error)
      // Don't rollback - card stays in UI
      alert('Error saving card - please check your connection')
    } finally {
      setCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCard()
    } else if (e.key === 'Escape') {
      setIsAddingCard(false)
      setNewCardTitle('')
    }
  }

  const handleDeleteList = async () => {
    if (!confirm(`Are you sure you want to delete "${list.name}"? All cards will be moved to trash.`)) return
    
    try {
      const token = localStorage.getItem('authToken')
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${BACKEND_URL}/api/v1/lists/${list.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        onDeleteList?.(list.id)
      } else {
        alert('Failed to delete list')
      }
    } catch (error) {
      console.error('Error deleting list:', error)
      alert('Error deleting list')
    }
  }

  return (
    <div className="flex-shrink-0 w-[272px]">
      <div className={`bg-white border border-gray-200 rounded-xl flex flex-col 
        ${isDragging ? 'opacity-50 rotate-2 shadow-lg' : 'shadow-md hover:shadow-lg'}
        transition-all duration-200`}
        style={{ boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.08)' }}
      >
        {/* List Header - with drag handle */}
        <div 
          {...dragHandleProps}
          className="p-2.5 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing border-b border-gray-100"
          style={{ touchAction: 'none' }}
        >
          <h3 className="text-sm font-bold text-gray-800 px-1 flex-1 truncate pointer-events-none">
            {list.name}
          </h3>
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 font-semibold">
              {tasks.length}
            </span>
            <div className="relative">
              <button
                onClick={() => setShowListMenu(!showListMenu)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title="List actions"
              >
                <MoreHorizontal size={16} className="text-gray-400" />
              </button>
              
              {showListMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-10 min-w-[120px]">
                  <button
                    onClick={() => {
                      onEditList?.(list)
                      setShowListMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-gray-700 transition-colors"
                  >
                    Edit List
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteList()
                      setShowListMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-500 transition-colors"
                  >
                    Delete List
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Droppable Cards Area */}
        <Droppable droppableId={list.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`
                px-2.5 py-3 space-y-2 overflow-y-auto overflow-x-hidden
                ${snapshot.isDraggingOver ? 'bg-blue-50/60 rounded-lg' : ''}
              `}
              style={{
                minHeight: '40px',
                maxHeight: 'calc(100vh - 210px)',
              }}
            >
              {tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <Card
                        task={task}
                        onClick={() => onTaskClick?.(task)}
                        isDragging={snapshot.isDragging}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {/* Add Card Section */}
        <div className="p-2 border-t border-gray-100">
          {isAddingCard ? (
            <div className="space-y-2">
              <textarea
                autoFocus
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter a title for this card..."
                className="w-full p-2.5 text-sm bg-white text-gray-800 border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm placeholder-gray-400"
                rows={3}
                disabled={creating}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddCard}
                  disabled={creating || !newCardTitle.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Add card'
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsAddingCard(false)
                    setNewCardTitle('')
                  }}
                  disabled={creating}
                  className="p-2 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xl leading-none">×</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingCard(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-50 rounded-lg transition-colors font-medium hover:text-gray-700"
            >
              <Plus size={16} />
              <span>Add a card</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

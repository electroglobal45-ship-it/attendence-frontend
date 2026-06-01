'use client'

import { Droppable, Draggable } from '@hello-pangea/dnd'
import { Plus, MoreHorizontal } from 'lucide-react'
import { TrelloCard } from './TrelloCard'
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

interface List {
  id: string
  public_id: string
  name: string
  position: number
  color: string
}

interface TrelloListProps {
  list: List
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onAddTask?: (listId: string) => void
  onEditList?: (list: List) => void
}

export function TrelloList({ 
  list, 
  tasks, 
  onTaskClick, 
  onAddTask, 
  onEditList 
}: TrelloListProps) {
  const [isAddingCard, setIsAddingCard] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')

  const handleAddCard = () => {
    if (newCardTitle.trim()) {
      onAddTask?.(list.id)
      setNewCardTitle('')
      setIsAddingCard(false)
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

  return (
    <div className="flex-shrink-0 w-trello-list">
      <div className="bg-list-bg rounded-trello-md flex flex-col max-h-full">
        {/* List Header */}
        <div className="p-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-text-primary px-2 flex-1 truncate">
            {list.name}
          </h3>
          <div className="flex items-center gap-1">
            <span className="text-xs text-text-secondary font-medium">
              {tasks.length}
            </span>
            <button
              onClick={() => onEditList?.(list)}
              className="p-1 rounded hover:bg-list-bg-hover transition-colors"
              title="List actions"
            >
              <MoreHorizontal size={16} className="text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Droppable Cards Area */}
        <Droppable droppableId={list.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`
                flex-1 px-2 pb-2 space-y-2 overflow-y-auto overflow-x-hidden
                ${snapshot.isDraggingOver ? 'bg-trello-blue-lighter/30 rounded-md' : ''}
              `}
              style={{
                minHeight: '20px',
                maxHeight: 'calc(100vh - 280px)',
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
                      <TrelloCard
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
        <div className="p-2">
          {isAddingCard ? (
            <div className="space-y-2">
              <textarea
                autoFocus
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter a title for this card..."
                className="w-full p-2 text-sm border-2 border-trello-blue rounded-trello-md resize-none focus:outline-none"
                rows={3}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddCard}
                  className="px-3 py-1.5 bg-trello-blue text-white text-sm font-medium rounded-trello-sm hover:bg-trello-blue-dark transition-colors"
                >
                  Add card
                </button>
                <button
                  onClick={() => {
                    setIsAddingCard(false)
                    setNewCardTitle('')
                  }}
                  className="p-1.5 hover:bg-list-bg-hover rounded transition-colors"
                >
                  <span className="text-2xl leading-none text-text-secondary">×</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingCard(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-text-secondary hover:bg-list-bg-hover rounded-trello-md transition-colors"
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

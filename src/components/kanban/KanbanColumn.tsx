'use client'

import { Droppable, Draggable } from '@hello-pangea/dnd'
import { Plus, MoreVertical } from 'lucide-react'
import { TaskCard } from './TaskCard'

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

interface KanbanColumnProps {
  list: List
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onAddTask?: (listId: string) => void
  onEditList?: (list: List) => void
}

export function KanbanColumn({ list, tasks, onTaskClick, onAddTask, onEditList }: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-gray-50 rounded-lg p-3 h-full flex flex-col">
        {/* Column header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: list.color }}
            />
            <h3 className="font-semibold text-gray-900">{list.name}</h3>
            <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full">
              {tasks.length}
            </span>
          </div>
          <button
            onClick={() => onEditList?.(list)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-white"
          >
            <MoreVertical size={16} />
          </button>
        </div>

        {/* Droppable area for tasks */}
        <Droppable droppableId={list.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`flex-1 space-y-2 min-h-[100px] ${
                snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg' : ''
              }`}
            >
              {tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={snapshot.isDragging ? 'opacity-50' : ''}
                    >
                      <TaskCard task={task} onClick={() => onTaskClick?.(task)} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {/* Add task button */}
        <button
          onClick={() => onAddTask?.(list.id)}
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
        >
          <Plus size={16} />
          <span>Add task</span>
        </button>
      </div>
    </div>
  )
}
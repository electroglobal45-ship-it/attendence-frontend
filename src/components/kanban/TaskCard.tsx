'use client'

import { Calendar, MessageSquare, Paperclip, User, AlertCircle } from 'lucide-react'
import { format, isPast, isToday, isTomorrow } from 'date-fns'

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

interface TaskCardProps {
  task: Task
  onClick?: () => void
}

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const getDueDateColor = () => {
    if (!task.due_date) return 'text-gray-500'
    const dueDate = new Date(task.due_date)
    if (isPast(dueDate) && !isToday(dueDate)) return 'text-red-600'
    if (isToday(dueDate)) return 'text-orange-600'
    if (isTomorrow(dueDate)) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const getDueDateText = () => {
    if (!task.due_date) return null
    const dueDate = new Date(task.due_date)
    if (isToday(dueDate)) return 'Today'
    if (isTomorrow(dueDate)) return 'Tomorrow'
    if (isPast(dueDate)) return `Overdue (${format(dueDate, 'MMM d')})`
    return format(dueDate, 'MMM d')
  }

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer group"
    >
      {/* Priority badge */}
      {task.priority !== 'medium' && (
        <div className="mb-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority === 'urgent' && <AlertCircle size={12} />}
            {PRIORITY_LABELS[task.priority]}
          </span>
        </div>
      )}

      {/* Title */}
      <h4 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-black">
        {task.title}
      </h4>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Progress bar */}
      {task.completion_percentage > 0 && task.completion_percentage < 100 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span className="font-medium">{task.completion_percentage}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${task.completion_percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {/* Due date */}
          {task.due_date && (
            <div className={`flex items-center gap-1 ${getDueDateColor()}`}>
              <Calendar size={12} />
              <span className="font-medium">{getDueDateText()}</span>
            </div>
          )}

          {/* TODO: Add comment and attachment counts when available */}
          {/* <div className="flex items-center gap-1 text-gray-500">
            <MessageSquare size={12} />
            <span>3</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <Paperclip size={12} />
            <span>2</span>
          </div> */}
        </div>

        {/* Assigned user */}
        {task.assigned_user && (
          <div className="flex items-center gap-1 text-gray-600">
            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
              {task.assigned_user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
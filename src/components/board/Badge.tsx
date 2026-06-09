import { 
  Calendar, 
  CheckSquare, 
  MessageSquare, 
  Paperclip, 
  AlignLeft,
  Clock
} from 'lucide-react'
import { format, isPast, isToday, isTomorrow } from 'date-fns'

interface BadgeProps {
  type: 'due-date' | 'checklist' | 'comments' | 'attachments' | 'description'
  value?: string | number
  total?: number
  dueDate?: string
  isComplete?: boolean
  className?: string
}

export function Badge({ 
  type, 
  value, 
  total, 
  dueDate, 
  isComplete = false,
  className = '' 
}: BadgeProps) {
  
  const getDueDateStatus = () => {
    if (!dueDate) return { color: 'bg-gray-100 text-text-secondary', text: 'No date' }
    
    const date = new Date(dueDate)
    const now = new Date()
    
    if (isComplete) {
      return { 
        color: 'bg-status-success text-white', 
        text: format(date, 'MMM d')
      }
    }
    
    if (isPast(date) && !isToday(date)) {
      return { 
        color: 'bg-status-danger text-white', 
        text: format(date, 'MMM d')
      }
    }
    
    if (isToday(date)) {
      return { 
        color: 'bg-status-warning text-text-primary', 
        text: 'Today'
      }
    }
    
    if (isTomorrow(date)) {
      return { 
        color: 'bg-status-warning text-text-primary', 
        text: 'Tomorrow'
      }
    }
    
    return { 
      color: 'bg-gray-100 text-text-secondary hover:bg-gray-200', 
      text: format(date, 'MMM d')
    }
  }

  const getChecklistStatus = () => {
    if (total === 0) return { color: 'bg-gray-100 text-text-secondary', complete: false }
    
    const completed = Number(value) || 0
    const percentage = (completed / (total || 1)) * 100
    
    if (percentage === 100) {
      return { color: 'bg-status-success text-white', complete: true }
    }
    
    return { color: 'bg-gray-100 text-text-secondary hover:bg-gray-200', complete: false }
  }

  if (type === 'due-date') {
    const status = getDueDateStatus()
    return (
      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-trello-sm text-xs ${status.color} transition-colors ${className}`}>
        <Clock size={12} />
        <span className="font-medium">{status.text}</span>
      </div>
    )
  }

  if (type === 'checklist') {
    const status = getChecklistStatus()
    return (
      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-trello-sm text-xs ${status.color} transition-colors ${className}`}>
        <CheckSquare size={12} />
        <span className="font-medium">{value}/{total}</span>
      </div>
    )
  }

  if (type === 'comments') {
    if (!value || value === 0) return null
    return (
      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-trello-sm text-xs bg-gray-100 text-text-secondary hover:bg-gray-200 transition-colors ${className}`}>
        <MessageSquare size={12} />
        <span className="font-medium">{value}</span>
      </div>
    )
  }

  if (type === 'attachments') {
    if (!value || value === 0) return null
    return (
      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-trello-sm text-xs bg-gray-100 text-text-secondary hover:bg-gray-200 transition-colors ${className}`}>
        <Paperclip size={12} />
        <span className="font-medium">{value}</span>
      </div>
    )
  }

  if (type === 'description') {
    return (
      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-trello-sm text-xs bg-gray-100 text-text-secondary hover:bg-gray-200 transition-colors ${className}`}>
        <AlignLeft size={12} />
      </div>
    )
  }

  return null
}

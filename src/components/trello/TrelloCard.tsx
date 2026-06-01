'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { TrelloBadge } from './TrelloBadge'
import { TrelloLabelGroup } from './TrelloLabel'
import { getCardCoverColor } from '@/lib/trello-colors'

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

interface TrelloCardProps {
  task: Task
  onClick?: () => void
  isDragging?: boolean
}

export function TrelloCard({ task, onClick, isDragging = false }: TrelloCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const coverColor = task.cover_color ? getCardCoverColor(task.cover_color) : null
  const hasLabels = task.labels && task.labels.length > 0
  const hasDescription = task.description && task.description.trim().length > 0
  const hasDueDate = !!task.due_date
  const hasChecklist = task.checklist_stats && task.checklist_stats.total > 0
  const hasComments = task.comment_count && task.comment_count > 0
  const hasAttachments = task.attachment_count && task.attachment_count > 0
  const hasAssignee = !!task.assigned_user
  
  const hasBadges = hasDescription || hasDueDate || hasChecklist || hasComments || hasAttachments

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        bg-card-bg rounded-trello-md cursor-pointer transition-all group
        ${isDragging ? 'shadow-trello-card-hover rotate-2 opacity-50' : 'shadow-trello-card hover:shadow-trello-card-hover'}
        ${isHovered ? 'bg-card-bg-hover' : ''}
      `}
    >
      {/* Cover Color */}
      {coverColor && (
        <div 
          className="h-8 rounded-t-trello-md"
          style={{ backgroundColor: coverColor.color }}
        />
      )}

      <div className="p-2 space-y-1.5">
        {/* Labels */}
        {hasLabels && (
          <TrelloLabelGroup 
            labels={task.labels!} 
            showNames={false}
            maxVisible={4}
          />
        )}

        {/* Title */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm text-text-primary leading-5 break-words flex-1">
            {task.title}
          </h4>
          
          {/* Edit icon on hover */}
          {isHovered && (
            <button 
              className="flex-shrink-0 p-1 rounded hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onClick?.()
              }}
            >
              <Pencil size={14} className="text-text-secondary" />
            </button>
          )}
        </div>

        {/* Badges and Members Row */}
        {(hasBadges || hasAssignee) && (
          <div className="flex items-center justify-between gap-2 pt-1">
            {/* Badges */}
            {hasBadges && (
              <div className="flex items-center gap-1 flex-wrap">
                {hasDueDate && (
                  <TrelloBadge 
                    type="due-date" 
                    dueDate={task.due_date}
                    isComplete={task.status === 'done'}
                  />
                )}
                
                {hasDescription && (
                  <TrelloBadge type="description" />
                )}
                
                {hasChecklist && (
                  <TrelloBadge 
                    type="checklist" 
                    value={task.checklist_stats!.completed}
                    total={task.checklist_stats!.total}
                  />
                )}
                
                {hasComments && (
                  <TrelloBadge 
                    type="comments" 
                    value={task.comment_count}
                  />
                )}
                
                {hasAttachments && (
                  <TrelloBadge 
                    type="attachments" 
                    value={task.attachment_count}
                  />
                )}
              </div>
            )}

            {/* Assigned User Avatar */}
            {hasAssignee && (
              <div 
                className="flex-shrink-0 w-7 h-7 rounded-full bg-trello-blue text-white flex items-center justify-center text-xs font-medium"
                title={task.assigned_user!.name}
              >
                {task.assigned_user!.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

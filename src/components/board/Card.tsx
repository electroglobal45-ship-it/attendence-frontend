'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Badge } from './Badge'
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
  labels?: Array<{ id?: string; colorId?: string; name?: string; color?: string }>
  checklist_stats?: { completed: number; total: number }
  comment_count?: number
  attachment_count?: number
  board?: { id: string; name: string }
  assigned_user?: {
    id: string
    name: string
    email: string
  }
  members?: Array<{
    id: string
    name: string
    email: string
  }>
}

interface CardProps {
  task: Task
  onClick?: () => void
  isDragging?: boolean
}

// No more predefined priority labels - all labels are now dynamic per board

export function Card({ task, onClick, isDragging = false }: CardProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Detect if this is an optimistic (temporary) card
  const isOptimistic = task.id.startsWith('temp-')
  
  const coverColor = task.cover_color ? getCardCoverColor(task.cover_color) : null
  const hasDescription = task.description && task.description.trim().length > 0
  const hasDueDate = !!task.due_date
  const hasChecklist = task.checklist_stats && task.checklist_stats.total > 0
  const hasComments = task.comment_count && task.comment_count > 0
  const hasAttachments = task.attachment_count && task.attachment_count > 0
  const membersList = task.members && task.members.length > 0 
    ? task.members 
    : (task.assigned_user ? [task.assigned_user] : [])
  const hasAssignee = membersList.length > 0
  const mainAssignee = membersList[0]
  
  const hasBadges = hasDescription || hasDueDate || hasChecklist || hasComments || hasAttachments
  
  // Get the single label to display (should only be one now)
  const displayLabel = task.labels && task.labels.length > 0 ? task.labels[0] : null

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        bg-white border border-gray-200 rounded-lg cursor-pointer transition-all duration-200 group
        ${isDragging ? 'rotate-2 opacity-70' : 'hover:border-blue-400'}
        ${isOptimistic ? 'opacity-60' : ''}
      `}
      style={{
        boxShadow: isDragging 
          ? '0 10px 30px rgba(0,0,0,0.2)' 
          : isHovered 
            ? '0 4px 12px rgba(0,0,0,0.12)' 
            : '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {/* Cover Color */}
      {coverColor && (
        <div 
          className="h-8 rounded-t-lg"
          style={{ backgroundColor: coverColor.color }}
        />
      )}

      <div className="p-3 space-y-2">
        {/* Single Label Display */}
        <div className="flex items-center gap-1.5 mb-1">
          {displayLabel && (
            <span
              style={{ 
                backgroundColor: displayLabel.color || '#E2B203',
                color: '#1D2125'
              }}
              className="inline-flex h-5.5 items-center rounded px-2 py-0.5 text-[9px] font-black leading-none uppercase tracking-wide"
            >
              {displayLabel.name || 'NO LABEL'}
            </span>
          )}
        </div>

        {/* Title */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-900 leading-5 break-words flex-1 group-hover:text-blue-600 transition-colors">
            {task.title}
          </h4>
          
          {/* Board badge */}
          {task.board?.name && (
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
              background: '#EFF6FF', color: '#3B82F6',
              border: '1px solid #BFDBFE',
              letterSpacing: '.4px', textTransform: 'uppercase',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140,
            }}>
              📋 {task.board.name}
            </span>
          )}
          
          {/* Edit icon on hover */}
          {isHovered && (
            <button 
              className="flex-shrink-0 p-1.5 rounded hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onClick?.()
              }}
            >
              <Pencil size={13} className="text-gray-600" />
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
                  <Badge 
                    type="due-date" 
                    dueDate={task.due_date}
                    isComplete={task.status === 'done'}
                  />
                )}
                
                {hasDescription && (
                  <Badge type="description" />
                )}
                
                {hasChecklist && (
                  <Badge 
                    type="checklist" 
                    value={task.checklist_stats!.completed}
                    total={task.checklist_stats!.total}
                  />
                )}
                
                {hasComments && (
                  <Badge 
                    type="comments" 
                    value={task.comment_count}
                  />
                )}
                
                {hasAttachments && (
                  <Badge 
                    type="attachments" 
                    value={task.attachment_count}
                  />
                )}
              </div>
            )}

            {hasAssignee && mainAssignee && (
              <div 
                className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white flex items-center justify-center text-xs font-semibold shadow-sm"
                title={mainAssignee.name}
              >
                {mainAssignee.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

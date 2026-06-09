'use client'

import { motion } from 'framer-motion'
import { Calendar, MessageSquare, FileText, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface TaskCardProps {
  id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'todo' | 'in_progress' | 'review' | 'done'
  assignedTo?: string
  dueDate?: string
  commentCount?: number
  attachmentCount?: number
  onTaskClick?: (taskId: string) => void
  onDelete?: (taskId: string) => void
}

const priorityConfig = {
  low: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  medium: { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  high: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  urgent: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

const statusConfig = {
  todo: { label: 'To Do', color: 'text-slate-600', bg: 'bg-slate-100' },
  in_progress: { label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-100' },
  review: { label: 'Review', color: 'text-amber-600', bg: 'bg-amber-100' },
  done: { label: 'Done', color: 'text-green-600', bg: 'bg-green-100' },
}

export function TaskCard({
  id,
  title,
  description,
  priority,
  status,
  assignedTo,
  dueDate,
  commentCount = 0,
  attachmentCount = 0,
  onTaskClick,
  onDelete,
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'done'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onTaskClick?.(id)}
      className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 ${priorityConfig[priority].border} ${priorityConfig[priority].bg} transition-all duration-300 bg-white`}
    >
      {/* Priority Indicator */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${priorityConfig[priority].dot}`} />

      {/* Card Content */}
      <div className="relative p-4">
        {/* Header with Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
              {title}
            </h3>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
            transition={{ duration: 0.2 }}
            className="flex gap-1 ml-2"
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete?.(id)
              }}
              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </motion.div>
        </div>

        {/* Status Badge */}
        <div className="mb-3">
          <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded ${statusConfig[status].bg} ${statusConfig[status].color}`}>
            {statusConfig[status].label}
          </span>
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-slate-600 mb-3 line-clamp-2 group-hover:text-slate-700 transition-colors">
            {description}
          </p>
        )}

        {/* Priority Badge */}
        <div className="mb-3">
          <span className={`inline-block text-xs font-semibold px-2 py-1 rounded ${priorityConfig[priority].badge}`}>
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </span>
        </div>

        {/* Footer with metadata */}
        <div className="space-y-2 pt-3 border-t border-slate-200">
          {/* Due Date */}
          {dueDate && (
            <div className={`flex items-center gap-2 text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>
              <Calendar size={14} />
              <span>{new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              {isOverdue && <span className="ml-auto text-red-600 text-xs">Overdue</span>}
            </div>
          )}

          {/* Assigned To */}
          {assignedTo && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <div className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center text-white text-xs font-bold">
                {assignedTo.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{assignedTo}</span>
            </div>
          )}

          {/* Comments and Attachments */}
          {(commentCount > 0 || attachmentCount > 0) && (
            <div className="flex gap-3 text-xs text-slate-500 pt-2">
              {commentCount > 0 && (
                <div className="flex items-center gap-1">
                  <MessageSquare size={12} />
                  <span>{commentCount}</span>
                </div>
              )}
              {attachmentCount > 0 && (
                <div className="flex items-center gap-1">
                  <FileText size={12} />
                  <span>{attachmentCount}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

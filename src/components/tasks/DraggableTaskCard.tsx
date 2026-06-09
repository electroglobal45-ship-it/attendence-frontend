'use client'

import { motion } from 'framer-motion'
import { Calendar, MessageSquare, FileText, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface DraggableTaskCardProps {
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
  onDragStart?: (e: React.DragEvent, taskId: string) => void
}

const priorityConfig = {
  low: { bg: 'from-blue-400 to-blue-500', border: 'border-blue-300', badge: 'bg-blue-100 text-blue-700' },
  medium: { bg: 'from-purple-400 to-purple-500', border: 'border-purple-300', badge: 'bg-purple-100 text-purple-700' },
  high: { bg: 'from-orange-400 to-orange-500', border: 'border-orange-300', badge: 'bg-orange-100 text-orange-700' },
  urgent: { bg: 'from-red-400 to-red-500', border: 'border-red-300', badge: 'bg-red-100 text-red-700' },
}

const statusConfig = {
  todo: { label: '📋 To Do', color: 'text-gray-600' },
  in_progress: { label: '⚙️ In Progress', color: 'text-blue-600' },
  review: { label: '👀 Review', color: 'text-yellow-600' },
  done: { label: '✅ Done', color: 'text-green-600' },
}

export function DraggableTaskCard({
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
  onDragStart,
}: DraggableTaskCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'done'

  return (
    <div
      draggable
      onDragStart={(e: React.DragEvent) => {
        setIsDragging(true)
        onDragStart?.(e, id)
      }}
      onDragEnd={() => {
        setIsDragging(false)
      }}
      className={`relative group cursor-grab active:cursor-grabbing rounded-xl overflow-hidden border-2 ${priorityConfig[priority].border} transition-all duration-300 ${
        isDragging ? 'opacity-75' : ''
      }`}
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onTaskClick?.(id)}
        className="h-full"
    >
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${priorityConfig[priority].bg} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

      {/* Drag Handle Indicator */}
      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 pointer-events-none"
        />
      )}

      {/* Card Content */}
      <div className="relative p-4 bg-white/95 backdrop-blur-sm">
        {/* Header with Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
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
          <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${statusConfig[status].color} bg-gray-100`}>
            {statusConfig[status].label}
          </span>
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2 group-hover:text-gray-700 transition-colors">
            {description}
          </p>
        )}

        {/* Priority Badge */}
        <div className="mb-3">
          <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-lg ${priorityConfig[priority].badge}`}>
            {priority.toUpperCase()}
          </span>
        </div>

        {/* Footer with metadata */}
        <div className="space-y-2 pt-3 border-t border-gray-100">
          {/* Due Date */}
          {dueDate && (
            <div className={`flex items-center gap-2 text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
              <Calendar size={14} />
              <span>{new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              {isOverdue && <span className="ml-auto text-red-600">Overdue</span>}
            </div>
          )}

          {/* Assigned To */}
          {assignedTo && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {assignedTo.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{assignedTo}</span>
            </div>
          )}

          {/* Comments and Attachments */}
          {(commentCount > 0 || attachmentCount > 0) && (
            <div className="flex gap-3 text-xs text-gray-500 pt-2">
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

      {/* Animated Border on Hover */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${priorityConfig[priority].bg} origin-left`}
      />
      </motion.div>
    </div>
  )
}

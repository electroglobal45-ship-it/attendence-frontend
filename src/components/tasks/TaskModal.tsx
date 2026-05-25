'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Calendar, User, Flag, MessageSquare, Paperclip, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface Task {
  id: string
  public_id: string
  title: string
  description?: string
  list_id: string
  project_id: string
  assigned_to?: string
  due_date?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: string
  completion_percentage: number
  created_at: string
  updated_at: string
  assigned_user?: {
    id: string
    name: string
    email: string
  }
  creator?: {
    id: string
    name: string
    email: string
  }
}

interface TaskModalProps {
  isOpen: boolean
  taskId: string | null
  onClose: () => void
  onUpdate?: () => void
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-gray-700' },
  { value: 'medium', label: 'Medium', color: 'text-blue-700' },
  { value: 'high', label: 'High', color: 'text-orange-700' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-700' },
]

export function TaskModal({ isOpen, taskId, onClose, onUpdate }: TaskModalProps) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  
  // Edit form state
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPriority, setEditPriority] = useState<string>('medium')
  const [editDueDate, setEditDueDate] = useState('')
  const [editCompletion, setEditCompletion] = useState(0)

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTask()
    }
  }, [isOpen, taskId])

  const fetchTask = async () => {
    if (!taskId) return

    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch(`/api/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        setTask(data.task)
        setEditTitle(data.task.title)
        setEditDescription(data.task.description || '')
        setEditPriority(data.task.priority)
        setEditDueDate(data.task.due_date ? format(new Date(data.task.due_date), 'yyyy-MM-dd') : '')
        setEditCompletion(data.task.completion_percentage)
      }
    } catch (error) {
      console.error('Error fetching task:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!task) return

    setSaving(true)
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription || undefined,
          priority: editPriority,
          due_date: editDueDate || undefined,
          completion_percentage: editCompletion,
        }),
      })

      if (res.ok) {
        setEditMode(false)
        fetchTask()
        onUpdate?.()
      } else {
        const data = await res.json()
        alert('Failed to update task: ' + data.error)
      }
    } catch (error) {
      console.error('Error updating task:', error)
      alert('Failed to update task')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Task Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-gray-400" />
            </div>
          ) : task ? (
            <div className="space-y-6">
              {/* Title */}
              <div>
                {editMode ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-2xl font-semibold border-b-2 border-gray-300 focus:border-black outline-none pb-2"
                    placeholder="Task title"
                  />
                ) : (
                  <h3 className="text-2xl font-semibold text-gray-900">{task.title}</h3>
                )}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Flag size={16} />
                      <span>Priority</span>
                    </div>
                  </label>
                  {editMode ? (
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      {PRIORITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${
                      task.priority === 'low' ? 'bg-gray-100 text-gray-700' :
                      task.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {PRIORITY_OPTIONS.find(p => p.value === task.priority)?.label}
                    </span>
                  )}
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>Due Date</span>
                    </div>
                  </label>
                  {editMode ? (
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  ) : (
                    <span className="text-gray-900">
                      {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'No due date'}
                    </span>
                  )}
                </div>

                {/* Assigned To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <User size={16} />
                      <span>Assigned To</span>
                    </div>
                  </label>
                  <div className="flex items-center gap-2">
                    {task.assigned_user ? (
                      <>
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                          {task.assigned_user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-gray-900">{task.assigned_user.name}</span>
                      </>
                    ) : (
                      <span className="text-gray-500">Unassigned</span>
                    )}
                  </div>
                </div>

                {/* Completion */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span>Completion</span>
                    </div>
                  </label>
                  {editMode ? (
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={editCompletion}
                      onChange={(e) => setEditCompletion(parseInt(e.target.value))}
                      className="w-full"
                    />
                  ) : null}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${editMode ? editCompletion : task.completion_percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {editMode ? editCompletion : task.completion_percentage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                {editMode ? (
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
                    rows={6}
                    placeholder="Add a description..."
                  />
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {task.description || <span className="text-gray-400 italic">No description</span>}
                  </p>
                )}
              </div>

              {/* TODO: Add comments section */}
              {/* TODO: Add attachments section */}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">Task not found</div>
          )}
        </div>

        {/* Footer */}
        {task && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Created {format(new Date(task.created_at), 'MMM d, yyyy')}
              {task.creator && ` by ${task.creator.name}`}
            </div>
            <div className="flex gap-3">
              {editMode ? (
                <>
                  <button
                    onClick={() => {
                      setEditMode(false)
                      setEditTitle(task.title)
                      setEditDescription(task.description || '')
                      setEditPriority(task.priority)
                      setEditDueDate(task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '')
                      setEditCompletion(task.completion_percentage)
                    }}
                    disabled={saving}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                >
                  Edit Task
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
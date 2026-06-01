'use client'

import { useEffect, useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { RefreshCw, Calendar, MessageSquare, Paperclip, X, Send, Upload, FileText, Image as ImageIcon, Download, Trash2, Edit2, Save } from 'lucide-react'

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  color_label?: 'none' | 'green' | 'yellow' | 'red'
  due_date?: string
  created_at: string
}

interface Comment {
  id: string
  comment: string
  is_system: boolean
  created_at: string
  user_id: string
  user_name: string
}

interface Attachment {
  id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  created_at: string
  user_name: string
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskDescription, setTaskDescription] = useState('')
  const [editingDescription, setEditingDescription] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedColorLabel, setSelectedColorLabel] = useState<'none' | 'green' | 'yellow' | 'red'>('none')

  const token = () => localStorage.getItem('authToken')

  const fetchMyTasks = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tasks/my-tasks', {
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (err) {
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTaskDetails = async (taskId: string) => {
    try {
      const [commentsRes, attachmentsRes] = await Promise.all([
        fetch(`/api/tasks/${taskId}/comments`, {
          headers: { Authorization: `Bearer ${token()}` }
        }),
        fetch(`/api/tasks/${taskId}/attachments`, {
          headers: { Authorization: `Bearer ${token()}` }
        })
      ])

      if (commentsRes.ok) {
        const data = await commentsRes.json()
        setComments(data.comments || [])
      }

      if (attachmentsRes.ok) {
        const data = await attachmentsRes.json()
        setAttachments(data.attachments || [])
      }
    } catch (err) {
      console.error('Error fetching task details:', err)
    }
  }

  const moveTask = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        fetchMyTasks()
        if (selectedTask?.id === taskId) {
          setSelectedTask({ ...selectedTask, status: newStatus as any })
          fetchTaskDetails(taskId)
        }
      }
    } catch (err) {
      console.error('Error moving task:', err)
    }
  }

  const updateDescription = async () => {
    if (!selectedTask) return

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/description`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({ description: taskDescription })
      })

      if (res.ok) {
        setEditingDescription(false)
        setSelectedTask({ ...selectedTask, description: taskDescription })
        fetchMyTasks()
      }
    } catch (err) {
      console.error('Error updating description:', err)
    }
  }

  const addComment = async () => {
    if (!selectedTask || !newComment.trim()) return

    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({ comment: newComment.trim() })
      })

      if (res.ok) {
        setNewComment('')
        fetchTaskDetails(selectedTask.id)
      }
    } catch (err) {
      console.error('Error adding comment:', err)
    } finally {
      setSubmittingComment(false)
    }
  }

  const uploadFile = async (file: File) => {
    if (!selectedTask) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/tasks/${selectedTask.id}/attachments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token()}`
        },
        body: formData
      })

      if (res.ok) {
        fetchTaskDetails(selectedTask.id)
      } else {
        alert('Failed to upload file')
      }
    } catch (err) {
      console.error('Error uploading file:', err)
      alert('Error uploading file')
    } finally {
      setUploading(false)
    }
  }

  const updateColorLabel = async (colorLabel: string) => {
    if (!selectedTask) return

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/color-label`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({ color_label: colorLabel })
      })

      if (res.ok) {
        setSelectedTask({ ...selectedTask, color_label: colorLabel as any })
        fetchMyTasks()
      }
    } catch (err) {
      console.error('Error updating color label:', err)
    }
  }

  const deleteAttachment = async (attachmentId: string) => {
    if (!confirm('Delete this attachment?')) return

    try {
      const res = await fetch(`/api/tasks/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      })

      if (res.ok && selectedTask) {
        fetchTaskDetails(selectedTask.id)
      }
    } catch (err) {
      console.error('Error deleting attachment:', err)
    }
  }

  useEffect(() => {
    fetchMyTasks()
  }, [])

  useEffect(() => {
    if (selectedTask) {
      setTaskDescription(selectedTask.description || '')
      setSelectedColorLabel(selectedTask.color_label || 'none')
      setEditingDescription(false)
      fetchTaskDetails(selectedTask.id)
    }
  }, [selectedTask])

  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    review: tasks.filter(t => t.status === 'review'),
    done: tasks.filter(t => t.status === 'done')
  }

  const priorityColors = {
    low: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'LOW' },
    medium: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'MEDIUM' },
    high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'HIGH' },
    urgent: { bg: 'bg-red-100', text: 'text-red-700', label: 'URGENT' }
  }

  const statusColors = {
    todo: 'bg-gray-50 border-gray-200',
    in_progress: 'bg-blue-50 border-blue-200',
    review: 'bg-yellow-50 border-yellow-200',
    done: 'bg-green-50 border-green-200'
  }

  const colorLabelStyles = {
    none: { bg: '', border: '' },
    green: { bg: 'bg-green-100', border: 'border-l-4 border-green-500' },
    yellow: { bg: 'bg-yellow-100', border: 'border-l-4 border-yellow-500' },
    red: { bg: 'bg-red-100', border: 'border-l-4 border-red-500' }
  }

  const renderTaskCard = (task: Task) => {
    const priority = priorityColors[task.priority]
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
    const colorStyle = colorLabelStyles[task.color_label || 'none']

    return (
      <div
        key={task.id}
        className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition cursor-pointer ${colorStyle.bg} ${colorStyle.border}`}
        onClick={() => setSelectedTask(task)}
      >
        <div className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mb-2 ${priority.bg} ${priority.text}`}>
          {priority.label}
        </div>

        <h4 className="font-medium text-gray-900 mb-2">{task.title}</h4>

        {task.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
        )}

        {task.due_date && (
          <div className={`flex items-center gap-2 text-xs mb-2 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
            <Calendar size={14} />
            <span>{new Date(task.due_date).toLocaleDateString()}</span>
            {isOverdue && <span>OVERDUE</span>}
          </div>
        )}

        {task.status === 'done' && (
          <div className="mt-3 inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
            ✓ COMPLETED
          </div>
        )}

        {task.status === 'todo' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              moveTask(task.id, 'in_progress')
            }}
            className="mt-3 w-full px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Start Working
          </button>
        )}

        {task.status === 'in_progress' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              moveTask(task.id, 'review')
            }}
            className="mt-3 w-full px-3 py-1.5 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Submit for Review
          </button>
        )}

        {task.status === 'review' && (
          <div className="mt-3 text-xs text-yellow-700 font-medium text-center">
            Waiting for admin review...
          </div>
        )}
      </div>
    )
  }

  return (
    <PageWrapper
      title="My Tasks"
      subtitle="View and manage your assigned tasks"
      actions={
        <button
          onClick={fetchMyTasks}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      }
    >
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          <div className="w-80 flex-shrink-0">
            <div className={`rounded-xl border-2 ${statusColors.todo} p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">To Do</h3>
                <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm font-medium">
                  {tasksByStatus.todo.length}
                </span>
              </div>
              <div className="space-y-3">
                {tasksByStatus.todo.map(renderTaskCard)}
                {tasksByStatus.todo.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">No tasks</p>
                )}
              </div>
            </div>
          </div>

          <div className="w-80 flex-shrink-0">
            <div className={`rounded-xl border-2 ${statusColors.in_progress} p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">In Progress</h3>
                <span className="px-2 py-1 bg-blue-200 text-blue-700 rounded text-sm font-medium">
                  {tasksByStatus.in_progress.length}
                </span>
              </div>
              <div className="space-y-3">
                {tasksByStatus.in_progress.map(renderTaskCard)}
                {tasksByStatus.in_progress.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">No tasks</p>
                )}
              </div>
            </div>
          </div>

          <div className="w-80 flex-shrink-0">
            <div className={`rounded-xl border-2 ${statusColors.review} p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Review</h3>
                <span className="px-2 py-1 bg-yellow-200 text-yellow-700 rounded text-sm font-medium">
                  {tasksByStatus.review.length}
                </span>
              </div>
              <div className="space-y-3">
                {tasksByStatus.review.map(renderTaskCard)}
                {tasksByStatus.review.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">No tasks</p>
                )}
              </div>
            </div>
          </div>

          <div className="w-80 flex-shrink-0">
            <div className={`rounded-xl border-2 ${statusColors.done} p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Done</h3>
                <span className="px-2 py-1 bg-green-200 text-green-700 rounded text-sm font-medium">
                  {tasksByStatus.done.length}
                </span>
              </div>
              <div className="space-y-3">
                {tasksByStatus.done.map(renderTaskCard)}
                {tasksByStatus.done.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">No tasks</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          taskDescription={taskDescription}
          setTaskDescription={setTaskDescription}
          editingDescription={editingDescription}
          setEditingDescription={setEditingDescription}
          updateDescription={updateDescription}
          comments={comments}
          newComment={newComment}
          setNewComment={setNewComment}
          addComment={addComment}
          submittingComment={submittingComment}
          attachments={attachments}
          uploadFile={uploadFile}
          uploading={uploading}
          deleteAttachment={deleteAttachment}
          moveTask={moveTask}
          priorityColors={priorityColors}
          updateColorLabel={updateColorLabel}
        />
      )}
    </PageWrapper>
  )
}

// Task Detail Modal Component
function TaskDetailModal({ task, onClose, taskDescription, setTaskDescription, editingDescription, setEditingDescription, updateDescription, comments, newComment, setNewComment, addComment, submittingComment, attachments, uploadFile, uploading, deleteAttachment, moveTask, priorityColors, updateColorLabel }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{task.title}</h3>
            <div className="flex items-center gap-3">
              <div className={`px-2 py-1 rounded text-xs font-semibold ${priorityColors[task.priority].bg} ${priorityColors[task.priority].text}`}>
                {priorityColors[task.priority].label}
              </div>
              {task.due_date && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Calendar size={14} />
                  <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Color Label - Show always, editable only in in_progress */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Work Status</h4>
            {task.status !== 'done' && task.status !== 'review' ? (
              <div className="flex gap-2">
                <button
                  onClick={() => updateColorLabel('green')}
                  className={`flex-1 px-3 py-2 rounded-lg border-2 transition ${
                    (task.color_label || 'none') === 'green'
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                >
                  ✓ Completed
                </button>
                <button
                  onClick={() => updateColorLabel('yellow')}
                  className={`flex-1 px-3 py-2 rounded-lg border-2 transition ${
                    (task.color_label || 'none') === 'yellow'
                      ? 'bg-yellow-100 border-yellow-500 text-yellow-700'
                      : 'border-gray-300 hover:border-yellow-400'
                  }`}
                >
                  ⏳ Ongoing
                </button>
                <button
                  onClick={() => updateColorLabel('red')}
                  className={`flex-1 px-3 py-2 rounded-lg border-2 transition ${
                    (task.color_label || 'none') === 'red'
                      ? 'bg-red-100 border-red-500 text-red-700'
                      : 'border-gray-300 hover:border-red-400'
                  }`}
                >
                  ✗ Not Complete
                </button>
                <button
                  onClick={() => updateColorLabel('none')}
                  className={`px-3 py-2 rounded-lg border-2 transition ${
                    (task.color_label || 'none') === 'none'
                      ? 'bg-gray-100 border-gray-500'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Clear
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {(task.color_label || 'none') === 'green' && (
                  <div className="px-4 py-2 bg-green-100 border-2 border-green-500 text-green-700 rounded-lg font-medium">
                    ✓ Completed
                  </div>
                )}
                {(task.color_label || 'none') === 'yellow' && (
                  <div className="px-4 py-2 bg-yellow-100 border-2 border-yellow-500 text-yellow-700 rounded-lg font-medium">
                    ⏳ Ongoing
                  </div>
                )}
                {(task.color_label || 'none') === 'red' && (
                  <div className="px-4 py-2 bg-red-100 border-2 border-red-500 text-red-700 rounded-lg font-medium">
                    ✗ Not Complete
                  </div>
                )}
                {(task.color_label || 'none') === 'none' && (
                  <div className="px-4 py-2 bg-gray-100 border-2 border-gray-300 text-gray-600 rounded-lg">
                    No status set
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Description</h4>
              {!editingDescription && task.status !== 'done' && task.status !== 'review' && (
                <button
                  onClick={() => setEditingDescription(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
              )}
            </div>
            {editingDescription ? (
              <div className="space-y-2">
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                  placeholder="Add a description..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={updateDescription}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
                  >
                    <Save size={16} />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingDescription(false)
                      setTaskDescription(task.description || '')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 whitespace-pre-wrap">
                {task.description || 'No description yet'}
              </p>
            )}
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Attachments</h4>
            <div className="space-y-3">
              {attachments.map((att: any) => (
                <div key={att.id}>
                  {att.file_type?.startsWith('image/') ? (
                    <div className="relative group">
                      <img
                        src={att.file_url}
                        alt={att.file_name}
                        className="w-full rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition"
                        onClick={() => window.open(att.file_url, '_blank')}
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {att.file_name} • {att.user_name}
                        </p>
                        {task.status !== 'done' && task.status !== 'review' && (
                          <button
                            onClick={() => deleteAttachment(att.id)}
                            className="p-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText size={20} className="text-gray-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{att.file_name}</p>
                          <p className="text-xs text-gray-500">
                            {(att.file_size / 1024).toFixed(1)} KB • {att.user_name}
                          </p>
                        </div>
                      </div>
                      {task.status !== 'done' && task.status !== 'review' && (
                        <button
                          onClick={() => deleteAttachment(att.id)}
                          className="p-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {task.status !== 'done' && task.status !== 'review' && (
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 cursor-pointer">
                  <Upload size={16} className="text-gray-600" />
                  <span className="text-sm text-gray-600">
                    {uploading ? 'Uploading...' : 'Upload image'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MessageSquare size={18} />
              Remarks
            </h4>
            <div className="space-y-3 mb-4">
              {comments.map((comment: any) => (
                <div key={comment.id} className={`p-3 rounded-lg ${comment.is_system ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{comment.user_name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No remarks yet</p>
              )}
            </div>

            {task.status !== 'done' && task.status !== 'review' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addComment()}
                  placeholder="Write a remark..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <button
                  onClick={addComment}
                  disabled={!newComment.trim() || submittingComment}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                >
                  <Send size={16} />
                  Send
                </button>
              </div>
            )}
            {task.status === 'review' && (
              <p className="text-sm text-yellow-700 text-center py-3 bg-yellow-50 rounded-lg">
                Task is under admin review. You cannot edit until admin provides feedback.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t border-gray-200">
            {task.status === 'todo' && (
              <button
                onClick={() => {
                  moveTask(task.id, 'in_progress')
                  onClose()
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Start Working
              </button>
            )}
            {task.status === 'in_progress' && (
              <button
                onClick={() => {
                  moveTask(task.id, 'review')
                  onClose()
                }}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Submit for Review
              </button>
            )}
            {task.status === 'review' && (
              <button
                onClick={() => {
                  moveTask(task.id, 'in_progress')
                  onClose()
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Move Back to In Progress
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

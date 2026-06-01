'use client'

import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Calendar, MessageSquare, X, Send, FileText, Edit2, Save, Star, MoreHorizontal } from 'lucide-react'

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  color_label?: 'none' | 'green' | 'yellow' | 'red'
  assigned_to?: string
  assigned_to_name?: string
  due_date?: string
  created_at: string
}

interface Employee {
  id: string
  name: string
  email: string
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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  
  // Create task form
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskAssignee, setNewTaskAssignee] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [creating, setCreating] = useState(false)

  // Task detail
  const [comments, setComments] = useState<Comment[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [newDueDate, setNewDueDate] = useState('')

  const token = () => localStorage.getItem('authToken')

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tasks/all', {
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

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.employees || [])
      }
    } catch (err) {
      console.error('Error fetching employees:', err)
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

  const createTask = async () => {
    if (!newTaskTitle.trim() || !newTaskAssignee) {
      alert('Please fill in task title and assign to an employee')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc || undefined,
          assigned_to: newTaskAssignee,
          due_date: newTaskDueDate || undefined,
          priority: newTaskPriority,
          status: 'todo'
        })
      })

      if (res.ok) {
        setShowCreateModal(false)
        setNewTaskTitle('')
        setNewTaskDesc('')
        setNewTaskAssignee('')
        setNewTaskDueDate('')
        setNewTaskPriority('medium')
        fetchTasks()
      } else {
        const data = await res.json()
        alert(`Error: ${data.error}`)
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`)
    } finally {
      setCreating(false)
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
        fetchTasks()
        if (selectedTask?.id === taskId) {
          setSelectedTask({ ...selectedTask, status: newStatus as any })
          fetchTaskDetails(taskId)
        }
      }
    } catch (err) {
      console.error('Error moving task:', err)
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

  const updateDueDate = async () => {
    if (!selectedTask || !newDueDate) return

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/due-date`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({ due_date: newDueDate })
      })

      if (res.ok) {
        setEditingDueDate(false)
        setSelectedTask({ ...selectedTask, due_date: newDueDate })
        fetchTasks()
      }
    } catch (err) {
      console.error('Error updating due date:', err)
    }
  }

  useEffect(() => {
    fetchTasks()
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (selectedTask) {
      setNewDueDate(selectedTask.due_date || '')
      setEditingDueDate(false)
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

  const renderTaskCard = (task: Task) => {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
    
    const labelColors: any[] = []
    if (task.color_label === 'green') labelColors.push({ colorId: 'green' })
    if (task.color_label === 'yellow') labelColors.push({ colorId: 'yellow' })
    if (task.color_label === 'red') labelColors.push({ colorId: 'red' })
    if (task.priority === 'urgent') labelColors.push({ colorId: 'red' })
    else if (task.priority === 'high') labelColors.push({ colorId: 'orange' })

    return (
      <div
        key={task.id}
        onClick={() => setSelectedTask(task)}
        className="bg-card-bg rounded-trello-md cursor-pointer transition-all shadow-trello-card hover:shadow-trello-card-hover"
      >
        <div className="p-2 space-y-1.5">
          {labelColors.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {labelColors.map((label, idx) => (
                <div
                  key={idx}
                  className="w-10 h-2 rounded-trello-sm"
                  style={{ backgroundColor: label.colorId === 'green' ? '#61BD4F' : label.colorId === 'yellow' ? '#F2D600' : label.colorId === 'red' ? '#EB5A46' : '#FF9F1A' }}
                />
              ))}
            </div>
          )}
          <h4 className="text-sm text-text-primary leading-5 break-words">{task.title}</h4>
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 flex-wrap">
              {task.due_date && (
                <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-trello-sm text-xs ${
                  task.status === 'done' ? 'bg-status-success text-white' :
                  isOverdue ? 'bg-status-danger text-white' :
                  'bg-gray-100 text-text-secondary'
                }`}>
                  <Calendar size={12} />
                  <span className="font-medium">{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              )}
              {task.description && (
                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-trello-sm text-xs bg-gray-100 text-text-secondary">
                  <MessageSquare size={12} />
                </div>
              )}
            </div>
            {task.assigned_to_name && (
              <div 
                className="flex-shrink-0 w-7 h-7 rounded-full bg-trello-blue text-white flex items-center justify-center text-xs font-medium"
                title={task.assigned_to_name}
              >
                {task.assigned_to_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }


  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg, #0079BF 0%, #026AA7 100%)' }}>
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-white">Task Management</h1>
            <button className="p-1.5 rounded hover:bg-white/20 transition-colors">
              <Star size={16} className="text-white" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTasks}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-trello-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-trello-sm transition-colors"
            >
              <Plus size={14} />
              New Task
            </button>
            <button className="p-1.5 hover:bg-white/20 rounded transition-colors">
              <MoreHorizontal size={18} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-black/10 backdrop-blur-sm border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-6 text-white text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">{tasks.length}</span>
            <span className="opacity-80">total tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{tasksByStatus.in_progress.length}</span>
            <span className="opacity-80">in progress</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{tasksByStatus.review.length}</span>
            <span className="opacity-80">in review</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{tasksByStatus.done.length}</span>
            <span className="opacity-80">completed</span>
          </div>
        </div>
      </div>


      <div className="flex-1 overflow-x-auto overflow-y-hidden p-3">
        <div className="flex gap-3 h-full items-start">
          <div className="flex-shrink-0 w-trello-list">
            <div className="bg-list-bg rounded-trello-md flex flex-col max-h-full">
              <div className="p-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-text-primary px-2 flex-1">To Do</h3>
                <span className="text-xs text-text-secondary font-medium">{tasksByStatus.todo.length}</span>
              </div>
              <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                {tasksByStatus.todo.map(renderTaskCard)}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 w-trello-list">
            <div className="bg-list-bg rounded-trello-md flex flex-col max-h-full">
              <div className="p-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-text-primary px-2 flex-1">In Progress</h3>
                <span className="text-xs text-text-secondary font-medium">{tasksByStatus.in_progress.length}</span>
              </div>
              <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                {tasksByStatus.in_progress.map(renderTaskCard)}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 w-trello-list">
            <div className="bg-list-bg rounded-trello-md flex flex-col max-h-full">
              <div className="p-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-text-primary px-2 flex-1">Review</h3>
                <span className="text-xs text-text-secondary font-medium">{tasksByStatus.review.length}</span>
              </div>
              <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                {tasksByStatus.review.map(renderTaskCard)}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 w-trello-list">
            <div className="bg-list-bg rounded-trello-md flex flex-col max-h-full">
              <div className="p-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-text-primary px-2 flex-1">Done</h3>
                <span className="text-xs text-text-secondary font-medium">{tasksByStatus.done.length}</span>
              </div>
              <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                {tasksByStatus.done.map(renderTaskCard)}
              </div>
            </div>
          </div>
        </div>
      </div>


      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-trello-lg max-w-lg w-full shadow-trello-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-primary">Create New Task</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-text-secondary hover:text-text-primary">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Task Title *</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g., Fix login bug"
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-trello-sm focus:border-trello-blue focus:outline-none text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Description</label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Add more details..."
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-trello-sm focus:border-trello-blue focus:outline-none resize-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Assign To *</label>
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-trello-sm focus:border-trello-blue focus:outline-none text-sm"
                >
                  <option value="">Select employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Due Date</label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-trello-sm focus:border-trello-blue focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-trello-sm focus:border-trello-blue focus:outline-none text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-text-primary rounded-trello-sm hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createTask}
                disabled={!newTaskTitle.trim() || !newTaskAssignee || creating}
                className="flex-1 px-4 py-2 bg-trello-blue text-white rounded-trello-sm hover:bg-trello-blue-dark transition-colors disabled:opacity-50 disabled:bg-gray-300 text-sm font-medium"
              >
                {creating ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}


      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTask(null)}>
          <div className="bg-white rounded-trello-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-trello-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-text-primary mb-2">{selectedTask.title}</h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className={`px-2 py-1 rounded-trello-sm text-xs font-semibold ${priorityColors[selectedTask.priority].bg} ${priorityColors[selectedTask.priority].text}`}>
                      {priorityColors[selectedTask.priority].label}
                    </div>
                    {selectedTask.color_label === 'green' && (
                      <div className="px-2 py-1 bg-status-success text-white rounded-trello-sm text-xs font-semibold">✓ Completed</div>
                    )}
                    {selectedTask.color_label === 'yellow' && (
                      <div className="px-2 py-1 bg-status-warning text-text-primary rounded-trello-sm text-xs font-semibold">⏳ Ongoing</div>
                    )}
                    {selectedTask.color_label === 'red' && (
                      <div className="px-2 py-1 bg-status-danger text-white rounded-trello-sm text-xs font-semibold">✗ Not Complete</div>
                    )}
                    {selectedTask.assigned_to_name && (
                      <div className="text-sm text-text-secondary">
                        Assigned to: <span className="font-medium text-text-primary">{selectedTask.assigned_to_name}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedTask(null)} className="text-text-secondary hover:text-text-primary">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                <p className="text-gray-600 whitespace-pre-wrap">{selectedTask.description || 'No description provided'}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">Due Date</h4>
                  {!editingDueDate && (
                    <button onClick={() => setEditingDueDate(true)} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      <Edit2 size={14} />
                      Edit
                    </button>
                  )}
                </div>
                {editingDueDate ? (
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <button onClick={updateDueDate} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center gap-2">
                      <Save size={16} />
                      Save
                    </button>
                    <button onClick={() => { setEditingDueDate(false); setNewDueDate(selectedTask.due_date || '') }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-600">{selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'No due date set'}</p>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Attachments</h4>
                <div className="space-y-3">
                  {attachments.map((att: any) => (
                    <div key={att.id}>
                      {att.file_type?.startsWith('image/') ? (
                        <div className="relative">
                          <img src={att.file_url} alt={att.file_name} className="w-full rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition" onClick={() => window.open(att.file_url, '_blank')} />
                          <p className="mt-2 text-xs text-gray-500">{att.file_name} • {att.user_name} • {new Date(att.created_at).toLocaleDateString()}</p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText size={20} className="text-gray-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{att.file_name}</p>
                              <p className="text-xs text-gray-500">{(att.file_size / 1024).toFixed(1)} KB • {att.user_name} • {new Date(att.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {attachments.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No attachments</p>}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MessageSquare size={18} />
                  Remarks
                </h4>
                <div className="space-y-3 mb-4">
                  {comments.map((comment: any) => (
                    <div key={comment.id} className={`p-3 rounded-lg ${comment.is_system ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{comment.is_system ? '🤖 System' : comment.user_name}</span>
                        <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                    </div>
                  ))}
                  {comments.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No remarks yet</p>}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addComment()}
                    placeholder="Add a remark..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <button onClick={addComment} disabled={!newComment.trim() || submittingComment} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2">
                    <Send size={16} />
                    Send
                  </button>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                {selectedTask.status === 'review' && (
                  <>
                    <button onClick={() => { moveTask(selectedTask.id, 'done'); setSelectedTask(null) }} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                      ✓ Approve & Mark as Done
                    </button>
                    <button onClick={() => { moveTask(selectedTask.id, 'in_progress'); setSelectedTask(null) }} className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
                      Request Changes
                    </button>
                  </>
                )}
                {selectedTask.status === 'in_progress' && (
                  <button onClick={() => { moveTask(selectedTask.id, 'review'); setSelectedTask(null) }} className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
                    Move to Review
                  </button>
                )}
                {selectedTask.status === 'todo' && (
                  <button onClick={() => { moveTask(selectedTask.id, 'in_progress'); setSelectedTask(null) }} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Move to In Progress
                  </button>
                )}
                {selectedTask.status === 'done' && (
                  <div className="flex-1 text-center py-2 text-green-700 font-medium">✓ Task Completed</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

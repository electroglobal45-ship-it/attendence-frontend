'use client'

import { useEffect, useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { TaskCard } from '@/components/kanban/TaskCard'
import { TaskModal } from '@/components/tasks/TaskModal'
import { 
  RefreshCw, CheckSquare, Clock, AlertCircle, Calendar,
  Filter, Search
} from 'lucide-react'

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
  position: number
  project_lists?: {
    id: string
    name: string
  }
  projects?: {
    id: string
    public_id: string
    name: string
    color: string
  }
  assigned_user?: {
    id: string
    name: string
    email: string
  }
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const token = () => localStorage.getItem('authToken')

  const fetchTasks = async () => {
    const authToken = token()
    
    if (!authToken) {
      window.location.href = '/login'
      return
    }

    setLoading(true)
    try {
      // Build query params
      const params = new URLSearchParams({
        assigned_to_me: 'true',
        limit: '100',
      })

      if (filterStatus !== 'all') {
        params.append('status', filterStatus)
      }

      if (filterPriority !== 'all') {
        params.append('priority', filterPriority)
      }

      const res = await fetch(`/api/tasks?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })

      if (res.status === 401) {
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return
      }

      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [filterStatus, filterPriority])

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id)
    setShowTaskModal(true)
  }

  const handleTaskUpdated = () => {
    fetchTasks()
    setShowTaskModal(false)
  }

  // Filter tasks by search query
  const filteredTasks = tasks.filter((task) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      task.title.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query) ||
      task.projects?.name.toLowerCase().includes(query)
    )
  })

  // Group tasks by status
  const tasksByStatus = {
    todo: filteredTasks.filter((t) => t.status === 'todo'),
    in_progress: filteredTasks.filter((t) => t.status === 'in_progress'),
    review: filteredTasks.filter((t) => t.status === 'review'),
    done: filteredTasks.filter((t) => t.status === 'done'),
  }

  // Calculate stats
  const stats = {
    total: filteredTasks.length,
    todo: tasksByStatus.todo.length,
    in_progress: tasksByStatus.in_progress.length,
    done: tasksByStatus.done.length,
    urgent: filteredTasks.filter((t) => t.priority === 'urgent').length,
  }

  return (
    <PageWrapper
      title="My Tasks"
      subtitle="Tasks assigned to you across all projects"
      actions={
        <button
          onClick={fetchTasks}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare size={16} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <span className="text-xs font-medium text-gray-500 uppercase">To Do</span>
            </div>
            <p className="text-2xl font-bold text-gray-600">{stats.todo}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-blue-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">In Progress</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.in_progress}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare size={16} className="text-green-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Done</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.done}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-red-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Urgent</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="all">All Status</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tasks Grid */}
        {loading ? (
          <div className="py-12 text-center">
            <RefreshCw size={32} className="animate-spin text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <CheckSquare size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-500">
              {searchQuery || filterStatus !== 'all' || filterPriority !== 'all'
                ? 'Try adjusting your filters or search query.'
                : 'You don\'t have any tasks assigned yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Group by status */}
            {Object.entries(tasksByStatus).map(([status, statusTasks]) => {
              if (statusTasks.length === 0) return null

              const statusLabels: Record<string, string> = {
                todo: 'To Do',
                in_progress: 'In Progress',
                review: 'Review',
                done: 'Done',
              }

              const statusColors: Record<string, string> = {
                todo: 'bg-gray-100 text-gray-700',
                in_progress: 'bg-blue-100 text-blue-700',
                review: 'bg-yellow-100 text-yellow-700',
                done: 'bg-green-100 text-green-700',
              }

              return (
                <div key={status}>
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{statusLabels[status]}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status]}`}>
                      {statusTasks.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {statusTasks.map((task) => (
                      <div key={task.id}>
                        <TaskCard task={task} onClick={() => handleTaskClick(task)} />
                        {/* Project badge */}
                        {task.projects && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: task.projects.color }}
                            />
                            <span>{task.projects.name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={showTaskModal}
        taskId={selectedTaskId}
        onClose={() => {
          setShowTaskModal(false)
          setSelectedTaskId(null)
        }}
        onUpdate={handleTaskUpdated}
      />
    </PageWrapper>
  )
}
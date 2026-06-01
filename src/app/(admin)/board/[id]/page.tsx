'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Plus, RefreshCw, ArrowLeft, MoreVertical, X, User, Calendar, Tag } from 'lucide-react'

interface List {
  id: string
  name: string
  position: number
  tasks: Task[]
}

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  due_date?: string
  assigned_to?: string
  position: number
}

interface Project {
  id: string
  public_id: string
  name: string
  description?: string
  color: string
}

interface Employee {
  id: string
  name: string
  email: string
}

export default function BoardPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [lists, setLists] = useState<List[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddList, setShowAddList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [showAddTask, setShowAddTask] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskAssignee, setNewTaskAssignee] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState('medium')

  const token = () => localStorage.getItem('authToken')

  const fetchBoard = async () => {
    setLoading(true)
    try {
      // Fetch project
      const projectRes = await fetch(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      
      if (!projectRes.ok) {
        console.error('Failed to fetch project:', projectRes.status)
        setLoading(false)
        return
      }

      const projectData = await projectRes.json()
      setProject(projectData.project)

      // Use the project's UUID for subsequent API calls
      const projectUUID = projectData.project.id

      // Fetch lists using UUID
      const listsRes = await fetch(`/api/projects/${projectUUID}/lists`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (listsRes.ok) {
        const listsData = await listsRes.json()
        setLists(listsData.lists || [])
      } else {
        console.error('Failed to fetch lists:', listsRes.status)
      }

      // Fetch employees
      const employeesRes = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (employeesRes.ok) {
        const employeesData = await employeesRes.json()
        setEmployees(employeesData.employees || [])
      } else {
        console.error('Failed to fetch employees:', employeesRes.status)
      }
    } catch (err) {
      console.error('Error fetching board:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      fetchBoard()
    }
  }, [projectId])

  const createList = async () => {
    if (!newListName.trim() || !project) return
    try {
      const res = await fetch(`/api/projects/${project.id}/lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({ name: newListName })
      })
      if (res.ok) {
        setNewListName('')
        setShowAddList(false)
        fetchBoard()
      } else {
        console.error('Failed to create list:', res.status)
      }
    } catch (err) {
      console.error('Error creating list:', err)
    }
  }

  const createTask = async (listId: string) => {
    if (!newTaskTitle.trim()) return
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc || undefined,
          list_id: listId,
          project_id: project?.id,
          assigned_to: newTaskAssignee || undefined,
          due_date: newTaskDueDate || undefined,
          priority: newTaskPriority
        })
      })
      if (res.ok) {
        setNewTaskTitle('')
        setNewTaskDesc('')
        setNewTaskAssignee('')
        setNewTaskDueDate('')
        setNewTaskPriority('medium')
        setShowAddTask(null)
        fetchBoard()
      }
    } catch (err) {
      console.error('Error creating task:', err)
    }
  }

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600',
  }

  if (loading) {
    return (
      <PageWrapper title="Loading..." subtitle="">
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={32} className="animate-spin text-gray-400" />
        </div>
      </PageWrapper>
    )
  }

  if (!project) {
    return (
      <PageWrapper title="Board Not Found" subtitle="">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Board not found or you don't have access</p>
          <button
            onClick={() => router.push('/tasks')}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            Back to Boards
          </button>
        </div>
      </PageWrapper>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: project.color + '15' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/tasks')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-gray-500">{project.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={fetchBoard}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="p-6 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {/* Lists */}
          {lists.map(list => (
            <div key={list.id} className="w-80 flex-shrink-0">
              <div className="bg-gray-100 rounded-xl p-3">
                {/* List Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{list.name}</h3>
                  <span className="text-xs text-gray-500">{list.tasks?.length || 0}</span>
                </div>

                {/* Tasks */}
                <div className="space-y-2 mb-2">
                  {list.tasks?.map(task => (
                    <div
                      key={task.id}
                      className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-pointer"
                    >
                      <h4 className="font-medium text-gray-900 mb-2">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        {task.priority && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[task.priority]}`}>
                            {task.priority}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar size={12} />
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {task.assigned_to && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <User size={12} />
                            {employees.find(e => e.id === task.assigned_to)?.name || 'Assigned'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Task */}
                {showAddTask === list.id ? (
                  <div className="bg-white rounded-lg p-3 space-y-2">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Task title..."
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                      autoFocus
                    />
                    <textarea
                      value={newTaskDesc}
                      onChange={(e) => setNewTaskDesc(e.target.value)}
                      placeholder="Description (optional)..."
                      rows={2}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                    />
                    <select
                      value={newTaskAssignee}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                      <option value="">Assign to...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => createTask(list.id)}
                        disabled={!newTaskTitle.trim()}
                        className="flex-1 px-3 py-1.5 text-sm bg-black text-white rounded hover:bg-gray-800 disabled:bg-gray-300"
                      >
                        Add Task
                      </button>
                      <button
                        onClick={() => {
                          setShowAddTask(null)
                          setNewTaskTitle('')
                          setNewTaskDesc('')
                          setNewTaskAssignee('')
                          setNewTaskDueDate('')
                          setNewTaskPriority('medium')
                        }}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddTask(list.id)}
                    className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg flex items-center gap-2"
                  >
                    <Plus size={14} />
                    Add a card
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add List */}
          {showAddList ? (
            <div className="w-80 flex-shrink-0">
              <div className="bg-gray-100 rounded-xl p-3">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createList()}
                  placeholder="Enter list title..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent mb-2"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={createList}
                    disabled={!newListName.trim()}
                    className="flex-1 px-3 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300"
                  >
                    Add list
                  </button>
                  <button
                    onClick={() => {
                      setShowAddList(false)
                      setNewListName('')
                    }}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddList(true)}
              className="w-80 flex-shrink-0 bg-white/50 hover:bg-white/80 rounded-xl p-3 flex items-center gap-2 text-gray-700 font-medium transition"
            >
              <Plus size={16} />
              Add another list
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

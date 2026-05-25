'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { TaskModal } from '@/components/tasks/TaskModal'
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal'
import { 
  RefreshCw, ArrowLeft, Settings, Users, MoreVertical,
  CheckSquare, Clock, AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface Project {
  id: string
  public_id: string
  name: string
  description?: string
  color: string
  project_lists: Array<{
    id: string
    public_id: string
    name: string
    position: number
    color: string
  }>
  tasks: Array<{
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
    assigned_user?: {
      id: string
      name: string
      email: string
    }
  }>
  task_stats: {
    total: number
    by_status: {
      todo: number
      in_progress: number
      review: number
      done: number
    }
    by_priority: {
      low: number
      medium: number
      high: number
      urgent: number
    }
  }
  user_role: string
}

export default function ProjectBoardPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [createTaskListId, setCreateTaskListId] = useState<string>('')

  const token = () => localStorage.getItem('authToken')

  const fetchProject = async () => {
    const authToken = token()
    
    if (!authToken) {
      window.location.href = '/login'
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })

      if (res.status === 401) {
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return
      }

      if (res.status === 404) {
        router.push('/projects')
        return
      }

      if (res.ok) {
        const data = await res.json()
        setProject(data.project)
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProject()
  }, [projectId])

  const handleTaskClick = (task: any) => {
    setSelectedTaskId(task.id)
    setShowTaskModal(true)
  }

  const handleAddTask = (listId: string) => {
    setCreateTaskListId(listId)
    setShowCreateTaskModal(true)
  }

  const handleTaskCreated = () => {
    fetchProject()
    setShowCreateTaskModal(false)
  }

  const handleTaskUpdated = () => {
    fetchProject()
    setShowTaskModal(false)
  }

  if (loading) {
    return (
      <PageWrapper title="Loading..." subtitle="">
        <div className="py-12 text-center">
          <RefreshCw size={32} className="animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Loading project...</p>
        </div>
      </PageWrapper>
    )
  }

  if (!project) {
    return (
      <PageWrapper title="Project Not Found" subtitle="">
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">The project you're looking for doesn't exist or you don't have access to it.</p>
          <Link href="/projects" className="text-blue-600 hover:text-blue-800 underline">
            Back to Projects
          </Link>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper
      title={
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: project.color }}
            />
            <span>{project.name}</span>
          </div>
        </div>
      }
      subtitle={project.description || 'Project board'}
      actions={
        <div className="flex items-center gap-3">
          <button
            onClick={fetchProject}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {/* TODO: Add project settings button */}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Project Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare size={16} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase">Total Tasks</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{project.task_stats.total}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-blue-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">In Progress</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{project.task_stats.by_status.in_progress}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare size={16} className="text-green-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Completed</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{project.task_stats.by_status.done}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-red-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Urgent</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{project.task_stats.by_priority.urgent}</p>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <KanbanBoard
            projectId={project.id}
            lists={project.project_lists}
            tasks={project.tasks}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
            onAddList={() => {
              // TODO: Implement add list functionality
              alert('Add list functionality coming soon!')
            }}
            onEditList={(list) => {
              // TODO: Implement edit list functionality
              alert('Edit list functionality coming soon!')
            }}
            onRefresh={fetchProject}
          />
        </div>
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

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateTaskModal}
        projectId={project.id}
        listId={createTaskListId}
        onClose={() => setShowCreateTaskModal(false)}
        onSuccess={handleTaskCreated}
      />
    </PageWrapper>
  )
}
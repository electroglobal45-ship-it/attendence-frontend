'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Board } from '@/components/board/Board'
import { BoardHeader } from '@/components/board/BoardHeader'
import { TaskModal } from '@/components/tasks/TaskModal'
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal'
import { 
  RefreshCw, CheckSquare, Clock, AlertCircle
} from 'lucide-react'

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
    board_id?: string
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
      <div className="h-screen flex items-center justify-center bg-board-bg">
        <div className="text-center">
          <RefreshCw size={48} className="animate-spin text-white mx-auto mb-4" />
          <p className="text-white text-lg font-medium">Loading board...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center bg-board-bg">
        <div className="bg-white rounded-trello-lg shadow-trello-modal p-12 text-center max-w-md">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Board Not Found</h2>
          <p className="text-text-secondary mb-6">
            The board you're looking for doesn't exist or you don't have access to it.
          </p>
          <a 
            href="/projects" 
            className="inline-block px-4 py-2 bg-trello-blue text-white rounded-trello-sm hover:bg-trello-blue-dark transition-colors"
          >
            Back to Boards
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Trello Board Header */}
      <BoardHeader
        boardName={project.name}
        boardColor={project.color}
        projectId={project.id}
        memberCount={3}
        isStarred={false}
        onToggleStar={() => {
          // TODO: Implement star functionality
          console.log('Toggle star')
        }}
        onOpenMenu={() => {
          // TODO: Implement board menu
          console.log('Open menu')
        }}
        onInvite={() => {
          // TODO: Implement invite functionality
          console.log('Invite members')
        }}
      />

      {/* Stats Bar */}
      <div className="bg-black/10 backdrop-blur-sm border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-6 text-white text-sm">
          <div className="flex items-center gap-2">
            <CheckSquare size={14} />
            <span className="font-medium">{project.task_stats.total}</span>
            <span className="opacity-80">tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} />
            <span className="font-medium">{project.task_stats.by_status.in_progress}</span>
            <span className="opacity-80">in progress</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckSquare size={14} />
            <span className="font-medium">{project.task_stats.by_status.done}</span>
            <span className="opacity-80">completed</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            <span className="font-medium">{project.task_stats.by_priority.urgent}</span>
            <span className="opacity-80">urgent</span>
          </div>
          <button
            onClick={fetchProject}
            disabled={loading}
            className="ml-auto flex items-center gap-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-trello-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Trello Board */}
      <div className="flex-1 overflow-hidden">
        <Board
          projectId={project.id}
          lists={project.project_lists}
          tasks={project.tasks}
          boardBackground="blue"
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
          onTaskCreated={(newTask) => {
            setProject(prev => {
              if (!prev) return null
              if (prev.tasks.some(t => t.id === newTask.id)) return prev
              return {
                ...prev,
                tasks: [...prev.tasks, newTask],
                task_stats: {
                  ...prev.task_stats,
                  total: prev.task_stats.total + 1,
                  by_status: {
                    ...prev.task_stats.by_status,
                    todo: (prev.task_stats.by_status.todo || 0) + 1
                  }
                }
              }
            })
          }}
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
    </div>
  )
}
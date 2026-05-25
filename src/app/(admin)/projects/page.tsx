'use client'

import { useEffect, useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { CreateProjectModal } from '@/components/projects/CreateProjectModal'
import { Plus, RefreshCw, FolderKanban, CheckSquare, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  public_id: string
  name: string
  description?: string
  color: string
  created_at: string
  member_role: string
  lists_count: number
  tasks_count: number
  tasks_by_status: {
    todo: number
    in_progress: number
    review: number
    done: number
  }
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const token = () => localStorage.getItem('authToken')

  const fetchProjects = async () => {
    const authToken = token()
    
    if (!authToken) {
      console.error('No auth token found, redirecting to login')
      window.location.href = '/login'
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${authToken}` },
      })

      if (res.status === 401) {
        console.error('Unauthorized - token invalid or expired')
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return
      }

      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleProjectCreated = (project: Project) => {
    fetchProjects()
    // Navigate to the new project
    router.push(`/projects/${project.public_id}`)
  }

  // Calculate stats
  const totalTasks = projects.reduce((sum, p) => sum + p.tasks_count, 0)
  const totalLists = projects.reduce((sum, p) => sum + p.lists_count, 0)
  const completedTasks = projects.reduce((sum, p) => sum + p.tasks_by_status.done, 0)

  return (
    <PageWrapper
      title="Projects"
      subtitle="Manage your projects and tasks"
      actions={
        <div className="flex items-center gap-3">
          <button
            onClick={fetchProjects}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FolderKanban size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
              <p className="text-xs text-gray-500">Total Projects</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <CheckSquare size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
              <p className="text-xs text-gray-500">Total Tasks</p>
              {totalTasks > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {completedTasks} completed ({Math.round((completedTasks / totalTasks) * 100)}%)
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Users size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalLists}</p>
              <p className="text-xs text-gray-500">Total Lists</p>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="py-12 text-center">
            <RefreshCw size={32} className="animate-spin text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FolderKanban size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Get started by creating your first project. Organize your work with Kanban boards and track progress.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition"
            >
              <Plus size={18} />
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleProjectCreated}
      />
    </PageWrapper>
  )
}
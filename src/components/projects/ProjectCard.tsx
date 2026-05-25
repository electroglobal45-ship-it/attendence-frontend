'use client'

import Link from 'next/link'
import { Calendar, CheckSquare, Users, MoreVertical } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const completionPercentage = project.tasks_count > 0
    ? Math.round((project.tasks_by_status.done / project.tasks_count) * 100)
    : 0

  return (
    <Link href={`/projects/${project.public_id}`}>
      <div className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer group">
        {/* Color bar */}
        <div 
          className="h-2 rounded-t-lg" 
          style={{ backgroundColor: project.color }}
        />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-black mb-1">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-sm text-gray-500 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
            <button 
              onClick={(e) => {
                e.preventDefault()
                // TODO: Open project menu
              }}
              className="text-gray-400 hover:text-gray-600 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical size={18} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckSquare size={16} className="text-gray-400" />
              <span className="text-gray-600">{project.tasks_count} tasks</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 flex items-center justify-center">
                <div className="w-3 h-3 bg-gray-200 rounded" />
              </div>
              <span className="text-gray-600">{project.lists_count} lists</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users size={16} className="text-gray-400" />
              <span className="text-gray-600 capitalize">{project.member_role}</span>
            </div>
          </div>

          {/* Progress bar */}
          {project.tasks_count > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Progress</span>
                <span className="font-medium">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${completionPercentage}%`,
                    backgroundColor: project.color
                  }}
                />
              </div>
            </div>
          )}

          {/* Task status breakdown */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <span className="text-gray-600">{project.tasks_by_status.todo} To Do</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-gray-600">{project.tasks_by_status.in_progress} In Progress</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-600">{project.tasks_by_status.done} Done</span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>Created {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
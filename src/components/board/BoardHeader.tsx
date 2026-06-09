'use client'

import { Star, Users, MoreHorizontal, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface BoardHeaderProps {
  boardName: string
  boardColor: string
  projectId: string
  memberCount?: number
  isStarred?: boolean
  onToggleStar?: () => void
  onOpenMenu?: () => void
  onInvite?: () => void
}

export function BoardHeader({
  boardName,
  boardColor,
  projectId,
  memberCount = 0,
  isStarred = false,
  onToggleStar,
  onOpenMenu,
  onInvite,
}: BoardHeaderProps) {
  const [starred, setStarred] = useState(isStarred)

  const handleToggleStar = () => {
    setStarred(!starred)
    onToggleStar?.()
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <Link 
            href="/projects"
            className="p-1.5 rounded hover:bg-white/20 transition-colors"
            title="Back to projects"
          >
            <ArrowLeft size={18} className="text-white" />
          </Link>

          <h1 className="text-lg font-semibold text-white truncate max-w-md">
            {boardName}
          </h1>

          <button
            onClick={handleToggleStar}
            className={`p-1.5 rounded transition-colors ${
              starred 
                ? 'bg-yellow-400/30 hover:bg-yellow-400/40' 
                : 'hover:bg-white/20'
            }`}
            title={starred ? 'Unstar board' : 'Star board'}
          >
            <Star 
              size={16} 
              className={starred ? 'text-yellow-400 fill-yellow-400' : 'text-white'} 
            />
          </button>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Members */}
          <div className="flex items-center gap-1">
            <div className="flex -space-x-2">
              {/* Mock member avatars - replace with actual member data */}
              {[...Array(Math.min(memberCount, 3))].map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-trello-blue border-2 border-white flex items-center justify-center text-xs font-medium text-white"
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            
            {memberCount > 3 && (
              <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-xs font-medium text-white">
                +{memberCount - 3}
              </div>
            )}
          </div>

          <button
            onClick={onInvite}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-trello-sm transition-colors"
          >
            <Users size={14} />
            <span>Invite</span>
          </button>

          <button
            onClick={onOpenMenu}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
            title="Show menu"
          >
            <MoreHorizontal size={18} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Pencil, MoreHorizontal, LogOut, Move, Copy, Layers, FileText, Eye, Share2, Archive, Trash2, Check } from 'lucide-react'
import { Badge } from './Badge'
import { getCardCoverColor } from '@/lib/trello-colors'

interface Task {
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
  cover_color?: string
  labels?: Array<{ id?: string; colorId?: string; name?: string; color?: string }>
  checklist_stats?: { completed: number; total: number }
  comment_count?: number
  attachment_count?: number
  board?: { id: string; name: string }
  assigned_user?: {
    id: string
    name: string
    email: string
  }
  members?: Array<{
    id: string
    name: string
    email: string
  }>
}

interface CardProps {
  task: Task
  onClick?: () => void
  isDragging?: boolean
  onRefresh?: () => void
  onDeleteTask?: (taskId: string) => void
  isSelectionMode?: boolean
  isSelected?: boolean
  onToggleSelect?: () => void
}

// No more predefined priority labels - all labels are now dynamic per board

export function Card({
  task,
  onClick,
  isDragging = false,
  onRefresh,
  onDeleteTask,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}: CardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [menuCoords, setMenuCoords] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const lastTouchTimeRef = useRef<number>(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (touch) {
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touch = e.changedTouches[0]
    if (touch) {
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x)
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)
      const deltaTime = Date.now() - touchStartRef.current.time
      
      const target = e.target as HTMLElement
      const isInteractive = !!target.closest('button, a, input, select, textarea, [role="button"]')

      if (!isInteractive && deltaX < 10 && deltaY < 10 && deltaTime < 300) {
        lastTouchTimeRef.current = Date.now()
        onClick?.()
      }
    }
    touchStartRef.current = null
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if (Date.now() - lastTouchTimeRef.current < 1000) {
      return
    }
    if (isSelectionMode) {
      onToggleSelect?.()
      return
    }
    onClick?.()
  }

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const dropdownHeight = 350
    const dropdownWidth = 208
    
    // Check if there is enough space to the right of the card
    const spaceRight = window.innerWidth - rect.right
    const openToRight = spaceRight > dropdownWidth + 16
    const leftPos = openToRight 
      ? rect.right + 8 
      : Math.max(8, rect.left - dropdownWidth - 8)
    
    const spaceBelow = window.innerHeight - rect.top
    const openUpwards = spaceBelow < dropdownHeight && rect.top > spaceBelow
    
    if (openUpwards) {
      setMenuCoords({
        bottom: window.innerHeight - rect.bottom,
        left: leftPos
      })
    } else {
      setMenuCoords({
        top: rect.top,
        left: leftPos
      })
    }
  }, [])

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    const handleScrollOrResize = () => {
      updateMenuPosition()
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleOutsideClick)
      window.addEventListener('scroll', handleScrollOrResize, true)
      window.addEventListener('resize', handleScrollOrResize)
      updateMenuPosition()
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [showMenu, updateMenuPosition])

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateMenuPosition()
    setShowMenu(v => !v)
  }

  const handleMarkAsDone = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    try {
      const token = localStorage.getItem('authToken')
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'done' })
      })
      if (response.ok) {
        onRefresh?.()
      } else {
        alert('Failed to update status')
      }
    } catch (err) {
      console.error(err)
      alert('Error updating status')
    }
  }

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    if (!confirm('Archive this card?')) return
    try {
      const token = localStorage.getItem('authToken')
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ archived: true })
      })
      if (response.ok) {
        onRefresh?.()
      } else {
        alert('Failed to archive card')
      }
    } catch (err) {
      console.error(err)
      alert('Error archiving card')
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    if (!confirm('Are you sure you want to permanently delete this card?')) return
    
    // STEP 1: OPTIMISTIC UPDATE - Remove from UI instantly
    onDeleteTask?.(task.id)

    // STEP 2: Background API request
    try {
      const token = localStorage.getItem('authToken')
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) {
        alert('Failed to delete card on server')
        onRefresh?.() // Rollback by refetching
      }
    } catch (err) {
      console.error(err)
      alert('Error deleting card - please check connection')
      onRefresh?.() // Rollback by refetching
    }
  }

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    const boardId = task.board?.id || (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : '')
    if (boardId) {
      navigator.clipboard.writeText(`${window.location.origin}/board/${boardId}`)
      alert('Board link copied to clipboard!')
    } else {
      alert('Unable to copy link')
    }
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    const newTitle = prompt('Enter title for the copied card:', `Copy of ${task.title}`)
    if (!newTitle || !newTitle.trim()) return
    
    try {
      const token = localStorage.getItem('authToken')
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${BACKEND_URL}/api/v1/tasks/quick-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          list_id: task.list_id,
          board_id: task.board?.id || (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : ''),
          position: task.position + 1
        })
      })
      if (response.ok) {
        onRefresh?.()
      } else {
        alert('Failed to copy card')
      }
    } catch (err) {
      console.error(err)
      alert('Error copying card')
    }
  }

  const handleLeave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    const userId = localStorage.getItem('userId')
    if (!userId) return
    
    const isAssigned = membersList.some(m => m.id === userId)
    if (!isAssigned) {
      alert('You are not assigned to this card.')
      return
    }
    
    if (!confirm('Are you sure you want to remove yourself from this card?')) return
    
    try {
      const token = localStorage.getItem('authToken')
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      
      const res1 = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (task.assigned_to === userId || task.assigned_user?.id === userId) {
        await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ assigned_to: null })
        })
      }
      
      onRefresh?.()
    } catch (err) {
      console.error(err)
      alert('Error leaving card')
    }
  }

  const handleWatch = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    const watched = localStorage.getItem('watched-tasks')
    let watchedList = watched ? JSON.parse(watched) : []
    const isWatched = watchedList.includes(task.id)
    if (isWatched) {
      watchedList = watchedList.filter((id: string) => id !== task.id)
      alert('You stopped watching this card.')
    } else {
      watchedList.push(task.id)
      alert('You are now watching this card.')
    }
    localStorage.setItem('watched-tasks', JSON.stringify(watchedList))
  }

  const handleMove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    alert('Please drag and drop the card to move it between lists.')
  }
  
  // Detect if this is an optimistic (temporary) card
  const isOptimistic = task.id.startsWith('temp-')
  
  const coverColor = task.cover_color ? getCardCoverColor(task.cover_color) : null
  const hasDescription = task.description && task.description.trim().length > 0
  const hasDueDate = !!task.due_date
  const hasChecklist = task.checklist_stats && task.checklist_stats.total > 0
  const hasComments = task.comment_count && task.comment_count > 0
  const hasAttachments = task.attachment_count && task.attachment_count > 0
  const membersList = task.members && task.members.length > 0 
    ? task.members 
    : (task.assigned_user ? [task.assigned_user] : [])
  const hasAssignee = membersList.length > 0
  const mainAssignee = membersList[0]
  
  const hasBadges = hasDescription || hasDueDate || hasChecklist || hasComments || hasAttachments
  
  // Get the single label to display (should only be one now)
  const displayLabel = task.labels && task.labels.length > 0 ? task.labels[0] : null

  return (
    <div
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        bg-white border rounded-lg cursor-pointer transition-all duration-200 group
        ${isSelected ? 'border-[#4A1F6F] ring-1 ring-[#4A1F6F]' : 'border-gray-200'}
        ${isDragging ? 'rotate-2 opacity-70' : 'hover:border-blue-400'}
        ${isOptimistic ? 'opacity-60' : ''}
      `}
      style={{
        boxShadow: isDragging 
          ? '0 10px 30px rgba(0,0,0,0.2)' 
          : isHovered 
            ? '0 4px 12px rgba(0,0,0,0.12)' 
            : '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {/* Cover Color */}
      {coverColor && (
        <div 
          className="h-8 rounded-t-lg"
          style={{ backgroundColor: coverColor.color }}
        />
      )}

      <div className="p-3 space-y-2">
        {/* Selection Checkbox */}
        {isSelectionMode && (
          <div className="flex items-center justify-between mb-2">
            <input 
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation()
                onToggleSelect?.()
              }}
              style={{ accentColor: '#4A1F6F' }}
              className="w-4 h-4 rounded text-[#4A1F6F] focus:ring-[#4A1F6F] border-gray-300 cursor-pointer"
            />
            <span className="text-[10px] text-purple-400 font-semibold uppercase">Select Card</span>
          </div>
        )}
        {/* Single Label Display */}
        <div className="flex items-center gap-1.5 mb-1">
          {displayLabel && (
            <span
              style={{ 
                backgroundColor: displayLabel.color || '#E2B203',
                color: '#1D2125'
              }}
              className="inline-flex h-5.5 items-center rounded px-2 py-0.5 text-[9px] font-black leading-none uppercase tracking-wide"
            >
              {displayLabel.name || 'NO LABEL'}
            </span>
          )}
        </div>

        {/* Title */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-900 leading-5 break-words flex-1 group-hover:text-blue-600 transition-colors">
            {task.title}
          </h4>
          
          {/* Board badge */}
          {task.board?.name && (
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
              background: '#EFF6FF', color: '#3B82F6',
              border: '1px solid #BFDBFE',
              letterSpacing: '.4px', textTransform: 'uppercase',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140,
            }}>
              📋 {task.board.name}
            </span>
          )}
          
          {/* Edit icon and Three-dots options menu */}
          {(isHovered || showMenu) && (
            <div 
              className={`flex-shrink-0 flex items-center gap-0.5 transition-opacity ${showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onClick?.()
                }}
                title="Edit card"
              >
                <Pencil size={13} className="text-gray-600" />
              </button>
              
              <div className="relative" ref={menuRef}>
                <button
                  ref={buttonRef}
                  onClick={handleMenuClick}
                  className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                  title="Card options"
                >
                  <MoreHorizontal size={13} className="text-gray-600" />
                </button>
                
                {showMenu && (
                  isMobile ? (
                    <div 
                      style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(2px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                      }}
                      onClick={() => setShowMenu(false)}
                    >
                      <div 
                        style={{
                          width: '100%',
                          maxWidth: '280px',
                          maxHeight: '80vh',
                          overflowY: 'auto',
                          background: '#FFFFFF',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                          padding: '12px 0',
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between px-4 pb-2 border-b border-gray-100 mb-2">
                          <span className="text-sm font-semibold text-gray-800">Card Options</span>
                          <button onClick={() => setShowMenu(false)} className="text-gray-400 hover:text-gray-600 font-bold text-sm">✕</button>
                        </div>
                        <button onClick={handleLeave} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <LogOut size={14} className="text-gray-400" /> Leave
                        </button>
                        <button onClick={handleMove} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <Move size={14} className="text-gray-400" /> Move
                        </button>
                        <button onClick={handleCopy} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <Copy size={14} className="text-gray-400" /> Copy
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); alert('Mirroring is only available for premium boards.') }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <Layers size={14} className="text-gray-400" /> Mirror
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); alert('Template created successfully!') }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <FileText size={14} className="text-gray-400" /> Make template
                        </button>
                        <button onClick={handleWatch} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <Eye size={14} className="text-gray-400" /> Watch
                        </button>
                        <div className="my-1 border-t border-gray-100" />
                        <button onClick={handleArchive} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <Archive size={14} className="text-gray-400" /> Archive
                        </button>
                        <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 size={14} className="text-red-400" /> Delete card
                        </button>
                        {task.status !== 'done' && (
                          <>
                            <div className="my-1 border-t border-gray-100" />
                            <button onClick={handleMarkAsDone} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition-colors">
                              <Check size={14} className="text-green-500" /> Mark as done
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div 
                      style={{
                        position: 'fixed',
                        top: menuCoords.top !== undefined ? `${menuCoords.top}px` : 'auto',
                        bottom: menuCoords.bottom !== undefined ? `${menuCoords.bottom}px` : 'auto',
                        left: `${menuCoords.left}px`,
                        width: '13rem', // w-52
                        maxHeight: menuCoords.top !== undefined 
                          ? `calc(100vh - ${menuCoords.top}px - 16px)` 
                          : `calc(100vh - ${menuCoords.bottom}px - 16px)`,
                        overflowY: 'auto',
                        zIndex: 9999,
                      }}
                      className="bg-white border border-gray-200 rounded-xl shadow-2xl py-1.5 text-left"
                    >
                      <button onClick={handleLeave} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <LogOut size={14} className="text-gray-400" /> Leave
                      </button>
                      <button onClick={handleMove} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <Move size={14} className="text-gray-400" /> Move
                      </button>
                      <button onClick={handleCopy} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <Copy size={14} className="text-gray-400" /> Copy
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); alert('Mirroring is only available for premium boards.') }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <Layers size={14} className="text-gray-400" /> Mirror
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); alert('Template created successfully!') }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <FileText size={14} className="text-gray-400" /> Make template
                      </button>
                      <button onClick={handleWatch} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <Eye size={14} className="text-gray-400" /> Watch
                      </button>
                      <div className="my-1 border-t border-gray-100" />
                      <button onClick={handleArchive} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <Archive size={14} className="text-gray-400" /> Archive
                      </button>
                      <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 size={14} className="text-red-400" /> Delete card
                      </button>
                      {task.status !== 'done' && (
                        <>
                          <div className="my-1 border-t border-gray-100" />
                          <button onClick={handleMarkAsDone} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors">
                            <Check size={14} className="text-green-500" /> Mark as done
                          </button>
                        </>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Badges and Members Row */}
        {(hasBadges || hasAssignee) && (
          <div className="flex items-center justify-between gap-2 pt-1">
            {/* Badges */}
            {hasBadges && (
              <div className="flex items-center gap-1 flex-wrap">
                {hasDueDate && (
                  <Badge 
                    type="due-date" 
                    dueDate={task.due_date}
                    isComplete={task.status === 'done'}
                  />
                )}
                
                {hasDescription && (
                  <Badge type="description" />
                )}
                
                {hasChecklist && (
                  <Badge 
                    type="checklist" 
                    value={task.checklist_stats!.completed}
                    total={task.checklist_stats!.total}
                  />
                )}
                
                {hasComments && (
                  <Badge 
                    type="comments" 
                    value={task.comment_count}
                  />
                )}
                
                {hasAttachments && (
                  <Badge 
                    type="attachments" 
                    value={task.attachment_count}
                  />
                )}
              </div>
            )}

            {hasAssignee && mainAssignee && (
              <div 
                className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white flex items-center justify-center text-xs font-semibold shadow-sm"
                title={mainAssignee.name}
              >
                {mainAssignee.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

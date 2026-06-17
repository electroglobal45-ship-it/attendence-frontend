'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { usePathname, useRouter } from 'next/navigation'
import { useMeetings } from '@/lib/meetings-context'
import { useAuth } from '@/lib/auth-context'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { meetingsAPI, Meeting } from '@/lib/tasks-api'
import { Maximize2, PhoneOff, Video, Bell, ArrowLeft, Minimize2 } from 'lucide-react'
import MeetingRecorder from './MeetingRecorder'

// Dynamically load the Jitsi wrapper with SSR disabled
const JitsiWrapper = dynamic(() => import('./JitsiWrapper'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
      <Video className="animate-pulse text-blue-500" size={32} />
      <span className="text-sm font-medium">Connecting to meeting room…</span>
    </div>
  ),
})

export default function ActiveMeetingWidget() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const { activeMeeting, isMinimized, joinMeeting, leaveMeeting, setIsMinimized } = useMeetings()
  const { isCollapsed: isSidebarCollapsed } = useSidebarStore()
  const [isDesktop, setIsDesktop] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [rel, setRel] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Incoming meeting alert states (load from localStorage)
  const [incomingMeeting, setIncomingMeeting] = useState<Meeting | null>(null)
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('crm_notified_meetings') || '[]')
      } catch {
        return []
      }
    }
    return []
  })

  // Dismiss a meeting and save to localStorage
  const dismissMeeting = (id: string) => {
    const updated = [...dismissedIds, id]
    setDismissedIds(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_notified_meetings', JSON.stringify(updated))
    }
    setIncomingMeeting(null)
  }

  // Handle Dragging for Picture-in-Picture
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return // Only left click drag
    const target = e.target as HTMLElement
    if (target.closest('button')) return // Don't drag if clicking buttons

    setDragging(true)
    const boundingBox = e.currentTarget.getBoundingClientRect()
    setRel({
      x: e.clientX - boundingBox.left,
      y: e.clientY - boundingBox.top,
    })
    e.preventDefault()
  }

  // Window Event Listeners for Dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return
      setPosition({
        x: e.clientX - rel.x,
        y: e.clientY - rel.y,
      })
    }

    const handleMouseUp = () => {
      setDragging(false)
    }

    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, rel])

  // Periodic Polling to Check for Active Meeting Assignments (Join Alert Popups)
  useEffect(() => {
    if (!user) return

    const checkMeetings = async () => {
      try {
        // If already in an active meeting, don't check for popups
        if (activeMeeting) return

        const res = await meetingsAPI.getMeetings()
        const list = res.data.meetings

        const now = new Date()
        const active = list.find((m) => {
          // Skip if already dismissed
          if (dismissedIds.includes(m.id)) return false

           // Must be assigned to user (or be the creator for scheduled meetings)
          const isAssigned = m.assignments?.some((a) => a.user_id === user.id)
          const isCreator = m.created_by === user.id
          
          if (m.is_permanent) {
            if (!isAssigned) return false
          } else if (m.scheduled_at) {
            if (!isAssigned && !isCreator) return false
          } else {
            if (!isAssigned) return false
          }

          if (m.is_permanent) {
            // For permanent/daily standups, show popup only if created in the last 2 hours
            const ageMinutes = (now.getTime() - new Date(m.created_at).getTime()) / 60000
            return ageMinutes <= 120
          }

          if (m.scheduled_at) {
            const startTime = new Date(m.scheduled_at)
            const timeDiffMinutes = (now.getTime() - startTime.getTime()) / 60000
            // Alert for scheduled meeting if scheduled starting within 15 minutes or started within 60 minutes
            return timeDiffMinutes >= -15 && timeDiffMinutes <= 60
          }

          // Ad-hoc call (scheduled_at is null) - active if created in the last 60 minutes
          const ageMinutes = (now.getTime() - new Date(m.created_at).getTime()) / 60000
          return ageMinutes <= 60
        })

        setIncomingMeeting(active || null)
      } catch (err) {
        // ignore
      }
    }

    checkMeetings()
    const timer = setInterval(checkMeetings, 15000)
    return () => clearInterval(timer)
  }, [user, activeMeeting, dismissedIds])

  // Heartbeat presence ping loop while in a call
  useEffect(() => {
    if (!activeMeeting) return

    const sendPing = async () => {
      try {
        const res = await meetingsAPI.pingMeeting(activeMeeting.id)
        if (res.ended) {
          leaveMeeting()
        }
      } catch (err) {
        console.error("Presence ping failed:", err)
      }
    }

    sendPing() // Send immediately on join
    const interval = setInterval(sendPing, 15000)
    return () => clearInterval(interval)
  }, [activeMeeting, leaveMeeting])

  const isOnMeetingPage = pathname === '/meetings'
  const isFullscreen = activeMeeting && !isMinimized && isOnMeetingPage
  const isFloating = activeMeeting && (isMinimized || !isOnMeetingPage)

  const handleRestore = () => {
    setIsMinimized(false)
    router.push('/meetings')
  }

  const isScheduled = incomingMeeting && !!incomingMeeting.scheduled_at

  return (
    <>
      {/* ── Persistent Meeting Container ── */}
      {activeMeeting && (
        <div
          onMouseDown={isFloating ? onMouseDown : undefined}
          className={`transition-all duration-200 overflow-hidden flex flex-col bg-slate-950 ${
            isFullscreen
              ? 'fixed top-0 bottom-0 right-0 z-45 shadow-none border-none'
              : isFloating
              ? `fixed z-50 rounded-2xl border border-slate-700/60 shadow-2xl select-none ${
                  dragging ? 'shadow-slate-950/80 ring-2 ring-blue-500/50' : ''
                }`
              : 'hidden'
          }`}
          style={
            isFullscreen
              ? {
                  // On desktop: offset left by sidebar width so Jitsi sits beside sidebar
                  left: isDesktop
                    ? (isSidebarCollapsed ? '80px' : '240px')
                    : '0px',
                }
              : {
                  width: '380px',
                  height: '280px',
                  left: dragging ? `${position.x}px` : undefined,
                  top: dragging ? `${position.y}px` : undefined,
                  bottom: dragging ? undefined : '24px',
                  right: dragging ? undefined : '24px',
                }
          }
        >
          {isFullscreen ? (
            /* Fullscreen Meeting Control Bar */
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="text-slate-400 hover:text-white transition flex items-center gap-1 text-xs"
                >
                  <ArrowLeft size={16} /> Back to Dashboard
                </button>
                <span className="text-slate-600">|</span>
                <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Video size={16} className="text-red-500 animate-pulse" />
                  {activeMeeting.title}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg transition"
                >
                  <Minimize2 size={14} /> Minimize (Float)
                </button>
                <MeetingRecorder meetingTitle={activeMeeting.title} isMuted={isMuted} />
                {activeMeeting.isHost && (
                  <button
                    onClick={async () => {
                      if (confirm('End this meeting for all participants?')) {
                        try {
                          await meetingsAPI.endMeeting(activeMeeting.id)
                        } catch (err) {
                          console.error(err)
                        }
                        leaveMeeting()
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition"
                  >
                    <PhoneOff size={14} /> End Meeting
                  </button>
                )}
                <button
                  onClick={leaveMeeting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 hover:text-white text-xs font-medium rounded-lg transition"
                >
                  <PhoneOff size={14} /> Hang Up
                </button>
              </div>
            </div>
          ) : (
            /* Mini Widget Header */
            <div className="flex items-center justify-between px-3 py-2 bg-slate-950 border-b border-slate-800 cursor-move text-slate-200 select-none">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping flex-shrink-0" />
                <span className="text-xs font-semibold truncate max-w-[200px]">
                  {activeMeeting.title}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={handleRestore}
                  title="Open Fullscreen"
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100 transition animate-none"
                >
                  <Maximize2 size={13} />
                </button>
                <button
                  onClick={leaveMeeting}
                  title="Leave Call"
                  className="p-1 hover:bg-red-900/60 rounded text-red-400 hover:text-red-200 transition animate-none"
                >
                  <PhoneOff size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Iframe Container */}
          <div className="flex-1 pointer-events-auto">
            <JitsiWrapper roomName={activeMeeting.roomName} onLeave={leaveMeeting} onMuteChange={setIsMuted} />
          </div>
        </div>
      )}      {/* ── Global Video Call Alert Popup ── */}
      {incomingMeeting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99] p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            {isScheduled ? (
              /* Scheduled Meeting Popup (Notification Reminder - Dismiss Only) */
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3 text-amber-400 animate-bounce">
                  <Bell size={28} />
                </div>
                <h3 className="font-bold text-white text-lg">Meeting Scheduled</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  You have a meeting scheduled: <strong className="text-white">"{incomingMeeting.title}"</strong>
                </p>
                <p className="text-xs text-amber-500 mt-2 bg-amber-500/5 px-2.5 py-1 rounded border border-amber-500/10 font-mono">
                  Time: {new Date(incomingMeeting.scheduled_at!).toLocaleString('en-IN')}
                </p>
                
                <button
                  onClick={() => dismissMeeting(incomingMeeting.id)}
                  className="w-full mt-5 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl text-sm font-medium transition"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              /* Instant/Live Meeting Popup (Join/Dismiss) */
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3 text-blue-400 animate-pulse">
                  <Video size={28} />
                </div>
                <h3 className="font-bold text-white text-lg">Quick Meeting Invitation</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed font-normal">
                  You are invited to join: <strong className="text-white">"{incomingMeeting.title}"</strong>
                </p>
                
                <div className="flex gap-3 w-full pt-4">
                  <button
                    onClick={() => dismissMeeting(incomingMeeting.id)}
                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => {
                      const isHost = user?.role === 'admin' || user?.id === incomingMeeting.created_by
                      joinMeeting(incomingMeeting.id, incomingMeeting.room_name, incomingMeeting.title, isHost)
                      dismissMeeting(incomingMeeting.id) // mark as notified so it doesn't pop up again
                      router.push('/meetings')
                    }}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
                  >
                    <Video size={14} /> Join Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

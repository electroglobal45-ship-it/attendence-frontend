'use client'

import { useAuth } from '@/lib/auth-context'
import { useEffect, useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { TaskDetailModal } from '@/components/board/TaskDetailModal'
import { 
  Clock, Calendar, DollarSign, CheckCircle, ArrowRight, Lock, 
  CheckSquare, AlertCircle, Sparkles, User, Gift, KeyRound, 
  ChevronRight, CalendarDays, ClipboardList, RefreshCw, Star, ArrowUpRight
} from 'lucide-react'
import { format } from 'date-fns'
import { formatTimeIST } from '@/lib/time-utils'
import { usePrefetchStore } from '@/lib/store/prefetch-store'


// ── Live Checked-In Duration Timer ─────────────────────────────────────────────
function CheckedInDuration({ checkInTime }: { checkInTime: string }) {
  const [duration, setDuration] = useState('0h 0m')

  useEffect(() => {
    const updateDuration = () => {
      const start = new Date(checkInTime.endsWith('Z') ? checkInTime : checkInTime + 'Z')
      const now = new Date()
      const diffMs = now.getTime() - start.getTime()
      if (diffMs < 0) {
        setDuration('0h 0m')
        return
      }
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      setDuration(`${diffHrs}h ${diffMins}m`)
    }

    updateDuration()
    const timer = setInterval(updateDuration, 60000) // Update every minute
    return () => clearInterval(timer)
  }, [checkInTime])

  return <span>{duration}</span>
}

// ── Working Hours Widget ───────────────────────────────────────────────────────
function WorkingHoursWidget({ todayAttendance }: { todayAttendance: any }) {
  const checkedIn = !!todayAttendance?.check_in
  const checkedOut = !!todayAttendance?.check_out

  const [duration, setDuration] = useState(() => {
    if (!checkedIn) {
      const now = new Date()
      const cutoffHour = 18
      const cutoffMinute = 30
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      
      if (currentHour > cutoffHour || (currentHour === cutoffHour && currentMinute >= cutoffMinute)) {
        return 'Not marked for today'
      }
    }
    return '0h 0m'
  })

  useEffect(() => {
    const updateDuration = () => {
      if (!checkedIn) {
        const now = new Date()
        const cutoffHour = 18
        const cutoffMinute = 30
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        
        if (currentHour > cutoffHour || (currentHour === cutoffHour && currentMinute >= cutoffMinute)) {
          setDuration('Not marked for today')
        } else {
          setDuration('0h 0m')
        }
        return
      }

      if (checkedIn && checkedOut) {
        const start = new Date(todayAttendance.check_in.endsWith('Z') ? todayAttendance.check_in : todayAttendance.check_in + 'Z')
        const end = new Date(todayAttendance.check_out.endsWith('Z') ? todayAttendance.check_out : todayAttendance.check_out + 'Z')
        const diffMs = end.getTime() - start.getTime()
        if (diffMs < 0) {
          setDuration('0h 0m')
          return
        }
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        setDuration(`${diffHrs}h ${diffMins}m`)
        return
      }

      // Live update if checked in but not checked out
      const start = new Date(todayAttendance.check_in.endsWith('Z') ? todayAttendance.check_in : todayAttendance.check_in + 'Z')
      const now = new Date()
      const diffMs = now.getTime() - start.getTime()
      if (diffMs < 0) {
        setDuration('0h 0m')
        return
      }
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      setDuration(`${diffHrs}h ${diffMins}m`)
    }

    updateDuration()
    const timer = setInterval(updateDuration, 60000)
    return () => clearInterval(timer)
  }, [todayAttendance, checkedIn, checkedOut])

  return (
    <div className="bg-[#4A1F6F]/5 border border-[#4A1F6F]/15 rounded-2xl p-5 flex items-center justify-between shadow-[0_4px_16px_rgba(74,31,111,0.06)]">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-[#4A1F6F] text-white flex items-center justify-center font-bold shadow-sm shrink-0">
          <Clock size={22} />
        </div>
        <div>
          <p className="text-xs text-[#4A1F6F] font-bold uppercase tracking-wider">Working Hours Today</p>
          <p className="text-xl sm:text-2xl font-black text-slate-800 mt-1">{duration}</p>
        </div>
      </div>
      {checkedIn && !checkedOut && (
        <span className="flex h-3 w-3 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
      )}
    </div>
  )
}


const PRIORITY_STYLE: Record<string, { bg: string; text: string; label: string; border: string }> = {
  low:    { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Low',    border: 'border-green-200' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Medium', border: 'border-yellow-200' },
  high:   { bg: 'bg-orange-50', text: 'text-orange-700', label: 'High',   border: 'border-orange-200' },
  urgent: { bg: 'bg-red-50',    text: 'text-red-700',    label: 'Urgent', border: 'border-red-200' },
}

export default function EmployeeDashboard() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [activeTaskTab, setActiveTaskTab] = useState<'all' | 'todo' | 'in_progress'>('all')

  const [greeting, setGreeting] = useState('Welcome')
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const updateTimeAndGreeting = () => {
      const now = new Date()
      const formattedTime = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
      setCurrentTime(formattedTime)

      const hours = now.getHours()
      if (hours < 12) {
        setGreeting('Good Morning')
      } else if (hours < 17) {
        setGreeting('Good Afternoon')
      } else {
        setGreeting('Good Evening')
      }
    }

    updateTimeAndGreeting()
    const interval = setInterval(updateTimeAndGreeting, 1000)
    return () => clearInterval(interval)
  }, [])

  // Read from prefetch store
  const { todayAttendance, attendanceHistory, myTasks, holidays, leaves, status, isPrefetched, prefetchAll } = usePrefetchStore()
  const loading = status.attendance === 'loading' && !isPrefetched

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login')
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && !isPrefetched && status.attendance === 'idle') {
      prefetchAll()
    }
  }, [user, isPrefetched, status.attendance, prefetchAll])

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Entering workspace...</p>
      </div>
    )
  }

  const checkedIn  = !!todayAttendance?.check_in
  const checkedOut = !!todayAttendance?.check_out

  // Filter and process tasks
  const pendingTasks = (myTasks || []).filter(t => t.status === 'todo' || t.status === 'in_progress')
  const filteredTasks = pendingTasks.filter(t => {
    if (activeTaskTab === 'todo') return t.status === 'todo'
    if (activeTaskTab === 'in_progress') return t.status === 'in_progress'
    return true
  })

  // Dynamic statistics
  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const presentDaysThisMonth = (attendanceHistory || []).filter(rec => 
    rec.date.startsWith(currentMonthStr) && 
    (rec.status === 'present' || rec.status === 'late_within_buffer' || rec.status === 'half_day' || rec.status === 'approved_short_leave')
  ).length

  const upcomingHolidays = (holidays || [])
    .filter(h => new Date(h.date) >= new Date(new Date().setHours(0,0,0,0)))
    .slice(0, 3)

  const activeLeaves = (leaves || [])
    .filter(l => l.status === 'pending' || (l.status === 'approved' && new Date(l.end_date) >= new Date()))
    .slice(0, 2)

  // Handlers
  const handleCompleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    usePrefetchStore.getState().updateTaskStatus(taskId, 'done')
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const token = localStorage.getItem('authToken')
      await fetch(`${BACKEND_URL}/api/v1/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'done' })
      })
      prefetchAll()
    } catch (err) {
      console.error('Failed to complete task', err)
    }
  }

  const handleTaskClick = (task: any) => {
    setSelectedTask(task)
  }

  return (
    <PageWrapper
      title=""
      subtitle=""
    >
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* ── Welcome Banner ──────────────────────────────────────────────────────── */}
        <div 
          style={{ background: 'linear-gradient(135deg, #4A1F6F 0%, #2D0F47 100%)' }}
          className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white shadow-xl"
        >
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute right-1/4 bottom-0 w-24 h-24 bg-white/5 rounded-full blur-lg pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-xl font-bold border border-white/20 shadow-md shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-jakarta">{greeting}, {user?.name}</h1>
                  <Sparkles size={18} className="text-yellow-400 animate-pulse hidden sm:inline" />
                </div>
                <p className="text-xs text-gray-300 mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 font-sans shrink-0">
              {/* Dynamic Clock Widget */}
              {currentTime && (
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                    <Clock size={14} className="text-[#D9A441] animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-350 tracking-wider">Local Time</p>
                    <p className="text-xs font-bold text-white tracking-wider">{currentTime}</p>
                  </div>
                </div>
              )}

              {/* Monthly Progress Stats */}
              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-3 min-w-[200px] shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-300 font-medium">Month Attendance</span>
                  <span className="text-xs font-bold text-emerald-450">{presentDaysThisMonth} Days</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (presentDaysThisMonth / 22) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 text-right">Targeting 22 working days</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Dashboard Workspace ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ── Left Column: Tasks & Attendance Details (8 / 12) ─────────────────── */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Today's Attendance Widget */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_4px_18px_rgba(0,0,0,0.05)] space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-slate-500" />
                  <h2 className="font-semibold text-slate-800 text-base">Attendance & Work Hours</h2>
                </div>
                <div>
                  {checkedIn && !checkedOut && (
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full font-semibold border border-emerald-200 animate-pulse">Checked In</span>
                  )}
                  {checkedIn && checkedOut && (
                    <span className="px-2.5 py-0.5 bg-[#4A1F6F]/10 text-[#4A1F6F] text-xs rounded-full font-semibold border border-[#4A1F6F]/25 flex items-center gap-1">
                      <CheckCircle size={12} /> Complete
                    </span>
                  )}
                  {!checkedIn && (
                    <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full font-semibold border border-amber-200">Not Checked In</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* Column 1: Status and Controls */}
                <div className="border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6 flex flex-col justify-center">
                  <div>
                    {todayAttendance ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Check In</p>
                          <p className="text-sm font-semibold text-slate-800">{formatTimeIST(todayAttendance.check_in)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Mark Out</p>
                          <p className="text-sm font-semibold text-slate-800">{formatTimeIST(todayAttendance.check_out)}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Today Status</p>
                          <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-xs font-medium capitalize mt-0.5">
                            {todayAttendance.status?.replace(/_/g, ' ') || '—'}
                          </span>
                          {todayAttendance.address && (
                            <p className="text-[11px] text-slate-400 mt-2 truncate" title={todayAttendance.address}>
                              📍 {todayAttendance.address}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-2">
                        <p className="text-sm text-slate-500 mb-4">Begin your work day by marking your attendance.</p>
                        <Link
                          href="/attendance"
                          className="inline-flex items-center justify-center gap-1.5 px-6 py-3 bg-[#4A1F6F] hover:bg-[#3b1859] text-white rounded-xl text-sm font-semibold transition-all shadow-sm group"
                        >
                          Mark Attendance
                          <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: Working Hours Widget */}
                <div className="flex flex-col justify-center">
                  <WorkingHoursWidget todayAttendance={todayAttendance} />
                  
                  {checkedIn && !checkedOut && (
                    <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-500 flex items-start gap-2">
                      <Sparkles size={14} className="text-[#4A1F6F] mt-0.5 shrink-0" />
                      <p>Your working hours are updating live. Remember to mark out at the end of your shift!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ClickUp-style Tasks Widget */}
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-[0_4px_18px_rgba(0,0,0,0.05)]">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CheckSquare size={18} className="text-slate-500" />
                  <h2 className="font-semibold text-slate-800 text-base">My Ongoing Tasks</h2>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/50">
                  {(['all', 'todo', 'in_progress'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTaskTab(tab)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        activeTaskTab === tab
                          ? 'bg-[#4A1F6F] text-white shadow-xs'
                          : 'text-slate-500 hover:text-[#4A1F6F]'
                      }`}
                    >
                      {tab === 'all' ? 'All' : tab === 'todo' ? 'To Do' : 'In Progress'}
                      <span className="ml-1 text-[10px] px-1 bg-slate-200/60 rounded">
                        {tab === 'all' 
                          ? pendingTasks.length 
                          : pendingTasks.filter(t => t.status === tab).length
                        }
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tasks List */}
              <div className="divide-y divide-slate-100">
                {filteredTasks.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <ClipboardList className="mx-auto text-slate-300 mb-2" size={36} />
                    <p className="text-sm font-medium">All caught up! No pending tasks.</p>
                  </div>
                ) : (
                  filteredTasks.map(task => {
                    const priority = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date()
                    
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Checkbox button to complete */}
                          <button
                            onClick={(e) => handleCompleteTask(task.id, e)}
                            title="Mark as Complete"
                            className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center hover:border-emerald-500 hover:bg-emerald-50 transition shrink-0"
                          >
                            <CheckCircle size={12} className="text-transparent group-hover:text-emerald-500 hover:text-emerald-600" />
                          </button>

                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-800 text-sm group-hover:text-black truncate">{task.title}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {/* Board name */}
                              {task.board?.name && (
                                <span className="inline-block text-[10px] px-1.5 py-0.5 bg-[#4A1F6F]/5 text-[#4A1F6F] rounded border border-[#4A1F6F]/10 font-semibold uppercase tracking-wider">
                                  {task.board.name}
                                </span>
                              )}
                              {/* Priority badge */}
                              <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border font-semibold ${priority.bg} ${priority.text} ${priority.border}`}>
                                {priority.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {/* Due date */}
                          {task.due_date && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                              isOverdue 
                                ? 'bg-red-50 text-red-600 font-bold border border-red-100' 
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {format(new Date(task.due_date), 'MMM d')}
                              {isOverdue && <span className="ml-1 text-[9px] uppercase tracking-wider hidden sm:inline">Overdue</span>}
                            </span>
                          )}
                          <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

          </div>

          {/* ── Right Column: Leave Agenda & Actions (4 / 12) ──────────────────── */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Toolbar */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_18px_rgba(0,0,0,0.05)]">
              <h2 className="font-semibold text-slate-800 text-base mb-4">Workspace Utilities</h2>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/attendance"
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 hover:border-[#4A1F6F]/30 hover:bg-[#4A1F6F]/5 hover:shadow-sm transition text-center group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#4A1F6F]/5 text-[#4A1F6F] flex items-center justify-center mb-2.5 transition group-hover:scale-105">
                    <Clock size={20} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Attendance</span>
                </Link>

                <Link
                  href="/leaves"
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 hover:border-[#4A1F6F]/30 hover:bg-[#4A1F6F]/5 hover:shadow-sm transition text-center group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#4A1F6F]/5 text-[#4A1F6F] flex items-center justify-center mb-2.5 transition group-hover:scale-105">
                    <CalendarDays size={20} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Apply Leave</span>
                </Link>

                <Link
                  href="/salary"
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 hover:border-[#4A1F6F]/30 hover:bg-[#4A1F6F]/5 hover:shadow-sm transition text-center group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#4A1F6F]/5 text-[#4A1F6F] flex items-center justify-center mb-2.5 transition group-hover:scale-105">
                    <DollarSign size={20} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Salary Slip</span>
                </Link>

                <Link
                  href="/my-passwords"
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 hover:border-[#4A1F6F]/30 hover:bg-[#4A1F6F]/5 hover:shadow-sm transition text-center group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#4A1F6F]/5 text-[#4A1F6F] flex items-center justify-center mb-2.5 transition group-hover:scale-105">
                    <KeyRound size={20} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">My Vault</span>
                </Link>
              </div>
            </div>

            {/* Agenda Widget (Leaves & Holidays) */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_18px_rgba(0,0,0,0.05)] space-y-5">
              {/* Leaves section */}
              <div>
                <h2 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
                  <Calendar size={15} className="text-slate-400" />
                  My Active Leaves
                </h2>
                {activeLeaves.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3 border border-slate-100">No pending or active leaves</p>
                ) : (
                  <div className="space-y-2">
                    {activeLeaves.map(l => (
                      <div key={l.id} className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-700 capitalize">{l.type} Leave</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            l.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {l.status}
                          </span>
                        </div>
                        <p className="text-slate-500">{l.start_date} {l.end_date !== l.start_date ? `to ${l.end_date}` : ''}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Holidays section */}
              <div>
                <h2 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
                  <Gift size={15} className="text-slate-400" />
                  Upcoming Holidays
                </h2>
                {upcomingHolidays.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3 border border-slate-100">No upcoming holidays scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingHolidays.map(h => {
                      const daysLeft = Math.ceil((new Date(h.date).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24))
                      return (
                        <div key={h.date} className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl text-xs flex justify-between items-center gap-2">
                          <div>
                            <p className="font-semibold text-slate-700">{h.name}</p>
                            <p className="text-slate-400 mt-0.5">{format(new Date(h.date), 'MMM d, yyyy')}</p>
                          </div>
                          {daysLeft >= 0 && (
                            <span className="bg-[#4A1F6F]/5 text-[#4A1F6F] px-2 py-0.5 rounded border border-[#4A1F6F]/10 text-[10px] font-bold">
                              {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `in ${daysLeft} days`}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Account settings */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
              <h2 className="font-semibold text-slate-800 text-base mb-3">Security & Account</h2>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="w-full flex items-center gap-3 px-4 py-3 border border-slate-100 hover:border-[#4A1F6F]/30 rounded-xl hover:bg-[#4A1F6F]/5 transition text-left group"
              >
                <Lock size={18} className="text-slate-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-700">Change Password</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Secure your employee login credentials</p>
                </div>
                <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={{ ...selectedTask, list_id: selectedTask.list_id ?? '' } as any}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => {
            prefetchAll() // Refresh prefetch store
          }}
          boardId={selectedTask.list_id || ''}
          projectId={'c691dc11-b522-4e80-8ae6-337244d2a28d'}
        />
      )}
    </PageWrapper>
  )
}

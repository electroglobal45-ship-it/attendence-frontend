'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { StatsLoadingSkeleton, TableLoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import {
  Users, Clock, Calendar, CheckCircle, XCircle,
  AlertCircle, RefreshCw, UserPlus, Settings, FileText, Lock,
  Search, Check, X, Eye, ClipboardList, ArrowRight, MapPin, ChevronRight, UserCheck
} from 'lucide-react'
import Link from 'next/link'
import { adminAPI, leavesAPI, tasksAPI } from '@/lib/tasks-api'
import { usePrefetchStore } from '@/lib/store/prefetch-store'
import { useAuth } from '@/lib/auth-context'

interface Stats {
  totalEmployees: number
  presentToday: number
  absentToday: number
  pendingLeaves: number
  activeTasks?: number
  pendingShortLeaves?: number
}

interface AttendanceRecord {
  id: string
  employee_id: string
  date: string
  check_in: string | null
  check_out: string | null
  status: string
  users?: { name: string; email: string }
  address?: string
  selfie_url?: string
}

interface LeaveRequest {
  id: string
  employee_id: string
  type: string
  start_date: string
  end_date: string
  reason: string
  status: string
  users?: { name: string; email: string }
}

interface ShortLeave {
  id: string
  employee_id: string
  date: string
  short_leave_type: string
  reason: string
  status: string
  users?: { name: string; email: string }
}

// ── Pure-CSS Initials Avatar Generator ──────────────────────────────────────────
function EmployeeAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'E'
  const colors = [
    'bg-blue-500 text-white',
    'bg-indigo-500 text-white',
    'bg-purple-500 text-white',
    'bg-pink-500 text-white',
    'bg-teal-500 text-white',
    'bg-emerald-500 text-white',
  ]
  const charCodeSum = name?.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) || 0
  const colorClass = colors[charCodeSum % colors.length]
  return (
    <div className={`rounded-full flex items-center justify-center font-bold text-xs select-none shrink-0 ${colorClass}`} style={{ width: size, height: size }}>
      {initials}
    </div>
  )
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const isHR = user?.role === 'hr'

  // Live ticking clock & dynamic greeting logic
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

  const stats = usePrefetchStore((state) => state.adminStats)
  const attendance = usePrefetchStore((state) => state.adminAttendance)
  const leaves = usePrefetchStore((state) => state.adminLeaves)
  const shortLeaves = usePrefetchStore((state) => state.adminShortLeaves)
  const allTasks = usePrefetchStore((state) => state.adminTasks)
  const prefetchStatus = usePrefetchStore((state) => state.status)

  const loading = 
    prefetchStatus.attendance === 'loading' ||
    prefetchStatus.leaves === 'loading' ||
    prefetchStatus.tasks === 'loading' ||
    prefetchStatus.employees === 'loading'

  const [syncing, setSyncing] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves' | 'shortLeaves' | 'tasks'>('attendance')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  
  // Attendance Search and Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'half_day' | 'late_within_buffer'>('all')

  // Manual marking state
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [isManualMark, setIsManualMark] = useState(false)
  const [showMarkModal, setShowMarkModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string; date: string } | null>(null)
  const [markAction, setMarkAction] = useState<'present' | 'absent' | 'half_day' | 'late_within_buffer' | 'mark_checkout'>('absent')
  const [markReason, setMarkReason] = useState('')
  const [customCheckIn, setCustomCheckIn] = useState('')
  const [customCheckOut, setCustomCheckOut] = useState('')
  const [marking, setMarking] = useState(false)

  // Selfie Preview state
  const [hoveredSelfie, setHoveredSelfie] = useState<string | null>(null)

  // Read employees list from prefetch store
  const storeEmployees = usePrefetchStore((state) => state.employees)

  const handleSync = async () => {
    setSyncing(true)
    try {
      await Promise.allSettled([
        usePrefetchStore.getState().refreshChunk('attendance', selectedDate),
        usePrefetchStore.getState().refreshChunk('leaves'),
        usePrefetchStore.getState().refreshChunk('tasks'),
        usePrefetchStore.getState().refreshChunk('employees'),
      ])
    } catch (err) {
      console.error('Sync error:', err)
    } finally {
      setSyncing(false)
    }
  }

  const handleDateChange = async (dateStr: string) => {
    setSelectedDate(dateStr)
    try {
      await usePrefetchStore.getState().refreshChunk('attendance', dateStr)
    } catch (err) {
      console.error('Date change error:', err)
    }
  }

  useEffect(() => {
    const store = usePrefetchStore.getState()
    if (!store.isPrefetched) {
      store.prefetchAll().catch(console.error)
    }
  }, [])

  const handleLeaveAction = async (leaveId: string, status: 'approved' | 'rejected') => {
    setApprovingId(leaveId)
    try {
      await adminAPI.updateLeaveStatus(leaveId, status)
      usePrefetchStore.setState((state) => ({
        adminLeaves: state.adminLeaves.map((l) => (l.id === leaveId ? { ...l, status } : l))
      }))
      usePrefetchStore.getState().refreshChunk('leaves')
    } catch (error) {
      console.error('Failed to update leave:', error)
    } finally {
      setApprovingId(null)
    }
  }

  const handleShortLeaveAction = async (shortLeaveId: string, status: 'approved' | 'rejected') => {
    setApprovingId(shortLeaveId)
    try {
      await leavesAPI.updateShortLeaveStatus(shortLeaveId, status)
      usePrefetchStore.setState((state) => ({
        adminShortLeaves: state.adminShortLeaves.map((sl) => (sl.id === shortLeaveId ? { ...sl, status } : sl))
      }))
      usePrefetchStore.getState().refreshChunk('leaves')
    } catch (error) {
      console.error('Failed to update short leave:', error)
    } finally {
      setApprovingId(null)
    }
  }

  const handleOpenMarkModal = (employeeId: string, employeeName: string, date: string, existingRecord?: any) => {
    setIsManualMark(false)
    setSelectedEmployee({ id: employeeId, name: employeeName, date })
    setMarkAction((existingRecord?.status as any) || 'absent')
    setMarkReason(existingRecord?.admin_reason || '')

    const parseTime = (iso: string | null) => {
      if (!iso) return ''
      const timestamp = iso.endsWith('Z') ? iso : iso + 'Z'
      const d = new Date(timestamp)
      const hrs = String(d.toLocaleTimeString('en-IN', { hour: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })).split(':')
      return `${hrs[0]}:${hrs[1]}`
    }

    setCustomCheckIn(parseTime(existingRecord?.check_in))
    setCustomCheckOut(parseTime(existingRecord?.check_out))
    setShowMarkModal(true)
  }

  const handleOpenManualMarkModal = () => {
    setIsManualMark(true)
    setSelectedEmployee({ id: '', name: '', date: selectedDate })
    setMarkAction('present')
    setMarkReason('')
    setCustomCheckIn('09:00')
    setCustomCheckOut('18:00')
    setShowMarkModal(true)
  }

  const handleMarkAttendance = async () => {
    if (!selectedEmployee || (isManualMark && !selectedEmployee.id)) {
      alert('Please select an employee')
      return
    }

    setMarking(true)
    try {
      await adminAPI.markAttendance({
        employeeId: selectedEmployee.id,
        date: selectedEmployee.date,
        action: markAction,
        reason: markReason || undefined,
        checkIn: customCheckIn || undefined,
        checkOut: customCheckOut || undefined,
      })

      setShowMarkModal(false)
      setSelectedEmployee(null)
      setMarkReason('')
      setCustomCheckIn('')
      setCustomCheckOut('')
      await usePrefetchStore.getState().refreshChunk('attendance', selectedDate)
    } catch (error: any) {
      alert(error.message || 'Failed to mark attendance')
    } finally {
      setMarking(false)
    }
  }

  const statusColor: Record<string, string> = {
    present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    late_within_buffer: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    half_day: 'bg-orange-50 text-orange-700 border-orange-200',
    absent: 'bg-red-50 text-red-700 border-red-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
  }

  const badge = (s: string) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold capitalize ${statusColor[s] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {s?.replace(/_/g, ' ')}
    </span>
  )

  const fmtTime = (iso: string | null) => {
    if (!iso) return '—'
    const timestamp = iso.endsWith('Z') ? iso : iso + 'Z'
    return new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
  }

  // Filter Attendance list based on Search query and Status filter
  const filteredAttendance = attendance.filter(rec => {
    const name = rec.users?.name?.toLowerCase() || ''
    const email = rec.users?.email?.toLowerCase() || ''
    const matchesSearch = name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase())
    
    if (statusFilter === 'all') return matchesSearch
    return matchesSearch && rec.status === statusFilter
  })

  // Group workforce tasks by employee
  const employeesWithTasks = (storeEmployees || []).map(emp => {
    const empTasks = allTasks.filter(t => t.assigned_to === emp.id || t.assigned_user?.id === emp.id)
    const empAttendance = attendance.find(a => a.employee_id === emp.id)
    return {
      ...emp,
      attendance: empAttendance,
      tasks: empTasks
    }
  })

  const presentPercentage = stats?.totalEmployees ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0
  const absentPercentage = stats?.totalEmployees ? Math.round((stats.absentToday / stats.totalEmployees) * 100) : 0

  return (
    <PageWrapper
      title={<span className="font-jakarta font-extrabold text-gray-900 tracking-tight text-2xl">{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>}
      actions={
        <button onClick={handleSync} disabled={syncing || loading}
          className="flex items-center gap-2 px-4 py-2 border border-[#4A1F6F]/20 text-[#4A1F6F] hover:bg-[#4A1F6F]/5 bg-white text-xs font-semibold rounded-xl active:scale-98 shadow-sm transition-all cursor-pointer font-sans">
          <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync Dashboard'}
        </button>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans bg-transparent">
        {/* ── Executive Hero Greeting Banner ────────────────────────────────────────── */}
        <div 
          className="rounded-2xl p-6 text-white relative overflow-hidden shadow-sm border border-[#4A1F6F]/10"
          style={{ background: 'linear-gradient(135deg, #4A1F6F 0%, #3B1859 100%)' }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:20px_20px] opacity-20" />
          <div className="absolute right-0 bottom-0 w-64 h-64 bg-[#D9A441]/10 rounded-full translate-x-16 translate-y-16 blur-2xl animate-pulse" style={{ animationDuration: '8s' }} />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold font-jakarta tracking-tight text-white">{greeting}, {isHR ? 'HR Manager' : 'Administrator'}!</h2>
              <p className="text-xs sm:text-xs text-slate-350 font-medium max-w-md font-sans">
                Manage your team logs, override attendance, and process leave requests.
              </p>
            </div>

            {/* Right Corner stats: Ongoing, Imp, Clock */}
            <div className="flex flex-wrap items-center gap-3 shrink-0 font-jakarta">
              {/* Dynamic Clock Widget */}
              {currentTime && (
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <Clock size={14} className="text-[#D9A441] animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-350 tracking-wider font-sans">Local Time</p>
                    <p className="text-xs font-bold text-white tracking-wider">{currentTime}</p>
                  </div>
                </div>
              )}

              {/* Ongoing Tasks */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <ClipboardList size={14} className="text-[#D9A441]" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-350 tracking-wider font-sans">Ongoing Tasks</p>
                  <p className="text-xs font-bold text-white">{allTasks.filter((t: any) => t.status !== 'done').length} Active</p>
                </div>
              </div>

              {/* Imp Alerts */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center relative">
                  <AlertCircle size={14} className="text-[#D9A441]" />
                  {((stats?.pendingLeaves ?? 0) + (stats?.pendingShortLeaves ?? 0)) > 0 && (
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full absolute -right-0.5 -top-0.5 animate-pulse" />
                  )}
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-350 tracking-wider font-sans">Imp Alerts</p>
                  <p className="text-xs font-bold text-white">
                    {((stats?.pendingLeaves ?? 0) + (stats?.pendingShortLeaves ?? 0)) || 0} Pending
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Utility Grid Toolbar ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link href="/employees" className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_rgba(74,31,111,0.08)] hover:border-[#4A1F6F]/30 hover:bg-[#4A1F6F]/2 transition-all duration-300 group">
            <div className="w-9 h-9 rounded-xl bg-[#4A1F6F]/5 flex items-center justify-center shrink-0 border border-[#4A1F6F]/10 group-hover:bg-[#4A1F6F]/10">
              <Users size={16} className="text-[#4A1F6F]" />
            </div>
            <div className="min-w-0 font-jakarta">
              <p className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-[#4A1F6F] transition-colors">Employees</p>
              <p className="text-[10px] text-slate-400 font-medium font-sans">Workforce Directory</p>
            </div>
          </Link>

          {!isHR && (
            <Link href="/users/create" className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_rgba(74,31,111,0.08)] hover:border-[#4A1F6F]/30 hover:bg-[#4A1F6F]/2 transition-all duration-300 group">
              <div className="w-9 h-9 rounded-xl bg-[#4A1F6F]/5 flex items-center justify-center shrink-0 border border-[#4A1F6F]/10 group-hover:bg-[#4A1F6F]/10">
                <UserPlus size={16} className="text-[#4A1F6F]" />
              </div>
              <div className="min-w-0 font-jakarta">
                <p className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-[#4A1F6F] transition-colors">Create User</p>
                <p className="text-[10px] text-slate-400 font-medium font-sans">Onboard Employee</p>
              </div>
            </Link>
          )}

          {!isHR && (
            <Link href="/settings" className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_rgba(74,31,111,0.08)] hover:border-[#4A1F6F]/30 hover:bg-[#4A1F6F]/2 transition-all duration-300 group">
              <div className="w-9 h-9 rounded-xl bg-[#4A1F6F]/5 flex items-center justify-center shrink-0 border border-[#4A1F6F]/10 group-hover:bg-[#4A1F6F]/10">
                <Settings size={16} className="text-[#4A1F6F]" />
              </div>
              <div className="min-w-0 font-jakarta">
                <p className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-[#4A1F6F] transition-colors">Settings</p>
                <p className="text-[10px] text-slate-400 font-medium font-sans">Office Boundaries</p>
              </div>
            </Link>
          )}

          <button onClick={() => setShowPasswordModal(true)} className="flex items-center text-left gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_rgba(74,31,111,0.08)] hover:border-[#4A1F6F]/30 hover:bg-[#4A1F6F]/2 w-full transition-all duration-300 group cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-[#4A1F6F]/5 flex items-center justify-center shrink-0 border border-[#4A1F6F]/10 group-hover:bg-[#4A1F6F]/10">
              <Lock size={16} className="text-[#4A1F6F]" />
            </div>
            <div className="min-w-0 font-jakarta">
              <p className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-[#4A1F6F] transition-colors">Security</p>
              <p className="text-[10px] text-slate-400 font-medium font-sans">Update Password</p>
            </div>
          </button>
        </div>

        {/* ── KPI Metric Control Cards (Minimalist Theme) ────────────────────────── */}
        {loading && !stats ? (
          <StatsLoadingSkeleton count={5} />
        ) : (
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isHR ? 'lg:grid-cols-3' : 'lg:grid-cols-5'} gap-4`}>
            {/* Total Workforce */}
            <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-[0_4px_18px_rgba(0,0,0,0.05)] flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#4A1F6F]/5 flex items-center justify-center border border-[#4A1F6F]/10 shrink-0">
                <Users size={16} className="text-[#4A1F6F]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans">Total Workforce</p>
                <p className="text-xl font-bold text-slate-900 font-jakarta mt-0.5">{stats?.totalEmployees ?? 0}</p>
              </div>
            </div>

            {/* Present Today */}
            <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-[0_4px_18px_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[110px]">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shrink-0">
                  <CheckCircle size={16} className="text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans">Present Today</p>
                  <p className="text-xl font-bold text-slate-900 font-jakarta mt-0.5">{stats?.presentToday ?? 0}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1 font-sans">
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-550" style={{ width: `${presentPercentage}%` }} />
                </div>
                <div className="flex justify-between text-[9px] text-slate-455 font-bold uppercase tracking-wide">
                  <span>Attendance</span>
                  <span>{presentPercentage}%</span>
                </div>
              </div>
            </div>

            {/* Absent Today */}
            <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-[0_4px_18px_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[110px]">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100 shrink-0">
                  <XCircle size={16} className="text-rose-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans">Absent Today</p>
                  <p className="text-xl font-bold text-slate-900 font-jakarta mt-0.5">{stats?.absentToday ?? 0}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1 font-sans">
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full transition-all duration-550" style={{ width: `${absentPercentage}%` }} />
                </div>
                <div className="flex justify-between text-[9px] text-slate-455 font-bold uppercase tracking-wide">
                  <span>Absence Rate</span>
                  <span>{absentPercentage}%</span>
                </div>
              </div>
            </div>

            {/* Pending Leaves */}
            {!isHR && (
            <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-[0_4px_18px_rgba(0,0,0,0.05)] flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100 shrink-0 relative">
                <Calendar size={16} className="text-amber-600" />
                {(stats?.pendingLeaves ?? 0) > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 absolute -right-0.5 -top-0.5 border border-white" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans">Pending Leaves</p>
                <p className="text-xl font-bold text-slate-900 font-jakarta mt-0.5">{stats?.pendingLeaves ?? 0}</p>
              </div>
            </div>
            )}

            {/* Pending Short Leaves */}
            {!isHR && (
            <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-[0_4px_18px_rgba(0,0,0,0.05)] flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100 shrink-0 relative">
                <Clock size={16} className="text-orange-600" />
                {(stats?.pendingShortLeaves ?? 0) > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 absolute -right-0.5 -top-0.5 border border-white" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans">Pending Short</p>
                <p className="text-xl font-bold text-slate-900 font-jakarta mt-0.5">{stats?.pendingShortLeaves ?? 0}</p>
              </div>
            </div>
            )}
          </div>
        )}

        {/* ── Segmented Pill Tab Workspace ────────────────────────────────────────── */}
        <div className="bg-slate-100 p-1 rounded-2xl flex flex-wrap gap-0.5 shadow-sm max-w-max border border-gray-150">
          {/* Today's Attendance Tab */}
          <button onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-[#4A1F6F] text-white shadow-xs'
                : 'text-slate-500 hover:text-[#4A1F6F] hover:bg-[#4A1F6F]/5'
            }`}>
            <Clock size={13} />
            Today&apos;s Attendance
            <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded font-extrabold ${
              activeTab === 'attendance' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-655'
            }`}>
              {attendance.length}
            </span>
          </button>

          {/* Leave Requests Tab — hidden for HR */}
          {!isHR && (
            <button onClick={() => setActiveTab('leaves')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'leaves'
                  ? 'bg-[#4A1F6F] text-white shadow-xs'
                  : 'text-slate-500 hover:text-[#4A1F6F] hover:bg-[#4A1F6F]/5'
              }`}>
              <Calendar size={13} />
              Leave Requests
              {leaves.length > 0 && (
                <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded font-extrabold ${
                  activeTab === 'leaves' ? 'bg-white/20 text-white' : 'bg-[#D9A441] text-white'
                }`}>
                  {leaves.length}
                </span>
              )}
            </button>
          )}

          {/* Short Leaves Tab — hidden for HR */}
          {!isHR && (
            <button onClick={() => setActiveTab('shortLeaves')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'shortLeaves'
                  ? 'bg-[#4A1F6F] text-white shadow-xs'
                  : 'text-slate-500 hover:text-[#4A1F6F] hover:bg-[#4A1F6F]/5'
              }`}>
              <Clock size={13} />
              Short Leaves
              {shortLeaves.length > 0 && (
                <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded font-extrabold ${
                  activeTab === 'shortLeaves' ? 'bg-white/20 text-white' : 'bg-[#D9A441] text-white'
                }`}>
                  {shortLeaves.length}
                </span>
              )}
            </button>
          )}

          {/* Workforce Tasks Tab — hidden for HR */}
          {!isHR && (
            <button onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-[#4A1F6F] text-white shadow-xs'
                  : 'text-slate-500 hover:text-[#4A1F6F] hover:bg-[#4A1F6F]/5'
              }`}>
              <ClipboardList size={13} />
              Workforce Tasks
              <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded font-extrabold ${
                activeTab === 'tasks' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-655'
              }`}>
                {allTasks.length}
              </span>
            </button>
          )}
        </div>

        {/* ── Tab Content Workspace ────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_6px_24px_rgba(0,0,0,0.05)] overflow-hidden min-h-[350px]">
          
          {/* Today's Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="p-6 space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-slate-50/50 p-4 rounded-xl border border-gray-150">
                <div className="relative flex-1 max-w-md font-sans">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search employees by name or email..."
                    className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A1F6F] focus:ring-2 focus:ring-[#4A1F6F]/10 bg-white transition-all font-medium text-gray-900"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3.5 font-sans">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date:</span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={e => handleDateChange(e.target.value)}
                      className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A1F6F] focus:ring-2 focus:ring-[#4A1F6F]/10 bg-white font-semibold text-slate-700 cursor-pointer transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value as any)}
                      className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A1F6F] focus:ring-2 focus:ring-[#4A1F6F]/10 bg-white font-semibold text-slate-700 cursor-pointer transition-all"
                    >
                      <option value="all">All Statuses</option>
                      <option value="present">Present</option>
                      <option value="late_within_buffer">Late</option>
                      <option value="half_day">Half Day</option>
                      <option value="absent">Absent</option>
                    </select>
                  </div>

                  {!isHR && (
                    <button
                      onClick={handleOpenManualMarkModal}
                      className="py-1.5 px-4 bg-gradient-to-r from-[#4A1F6F] to-[#3B1859] text-white text-xs font-semibold rounded-xl hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-[#4A1F6F]/10"
                    >
                      <UserCheck size={13} />
                      Manual Mark
                    </button>
                  )}
                </div>
              </div>

              {/* Attendance SaaS List Cards */}
              {loading ? (
                <TableLoadingSkeleton rows={5} cols={5} />
              ) : filteredAttendance.length === 0 ? (
                <div className="py-16 text-center text-slate-400 bg-slate-50/20 rounded-2xl border border-dashed border-slate-200">
                  <Clock className="mx-auto text-slate-300 mb-2" size={28} />
                  <p className="text-sm font-semibold">No attendance records found</p>
                  <p className="text-xs text-slate-400 mt-1">Try resetting filters or queries</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden font-sans">
                  {filteredAttendance.map((rec) => (
                    <div key={rec.id} className="p-4 bg-white hover:bg-slate-50/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                      
                      {/* Left: Employee details */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <EmployeeAvatar name={rec.users?.name || ''} size={36} />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm group-hover:text-[#4A1F6F] transition-colors truncate font-jakarta">{rec.users?.name ?? rec.employee_id}</p>
                          <p className="text-[11px] text-slate-450 font-medium truncate mt-0.5">{rec.users?.email}</p>
                        </div>
                      </div>

                      {/* Middle: Checkin Details */}
                      <div className="grid grid-cols-2 gap-6 text-xs shrink-0 sm:max-w-xs w-full sm:w-auto">
                        <div>
                          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Check In</span>
                          <span className="font-semibold text-slate-700 mt-0.5 block">{fmtTime(rec.check_in)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Check Out</span>
                          <span className="font-semibold text-slate-700 mt-0.5 block">{fmtTime(rec.check_out)}</span>
                        </div>
                      </div>

                      {/* Right: Selfie, Status & Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        {/* Selfie zoom icon */}
                        {rec.selfie_url ? (
                          <div className="relative">
                            <button
                              onMouseEnter={() => setHoveredSelfie(rec.id)}
                              onMouseLeave={() => setHoveredSelfie(null)}
                              onClick={() => window.open(rec.selfie_url!, '_blank')}
                              className="w-8 h-8 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200/60 flex items-center justify-center transition shadow-2xs cursor-pointer"
                              title="View selfie verification"
                            >
                              <Eye size={13} />
                            </button>
                            {hoveredSelfie === rec.id && (
                              <div className="absolute z-50 bottom-10 right-0 w-32 h-32 bg-white border border-slate-200 rounded-xl shadow-xl p-1 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                <img src={rec.selfie_url} alt="Selfie" className="w-full h-full object-cover rounded-lg" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 w-8 text-center">—</span>
                        )}

                        <div className="w-24 text-right">
                          {badge(rec.status)}
                        </div>

                        {!isHR && (
                          <button onClick={() => handleOpenMarkModal(rec.employee_id, rec.users?.name || 'Employee', rec.date, rec)}
                            className="py-1.5 px-3 border border-gray-200 hover:border-[#4A1F6F] hover:text-[#4A1F6F] hover:bg-[#4A1F6F]/2 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer">
                            Override
                          </button>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Leave Requests Tab */}
          {activeTab === 'leaves' && (
            <div className="p-6">
              {loading ? (
                <TableLoadingSkeleton rows={3} cols={4} />
              ) : leaves.length === 0 ? (
                <div className="py-16 text-center text-slate-400 bg-slate-50/20 rounded-2xl border border-dashed border-slate-200">
                  <Calendar className="mx-auto text-slate-300 mb-2" size={28} />
                  <p className="text-sm font-semibold">No pending leave requests</p>
                  <p className="text-xs text-slate-400 mt-1">Excellent! All requests are processed</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {leaves.map((leave) => (
                    <div key={leave.id} className="bg-white p-5 border border-gray-150 hover:border-[#4A1F6F]/20 rounded-2xl hover:scale-[1.005] transition-all flex flex-col justify-between gap-4 shadow-2xs font-jakarta">
                      
                      {/* Ticket header info */}
                      <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-3.5">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar name={leave.users?.name || ''} size={36} />
                          <div>
                            <p className="font-bold text-slate-800 text-sm leading-tight">{leave.users?.name}</p>
                            <p className="text-[11px] text-slate-450 font-medium font-sans mt-0.5">{leave.users?.email}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-[#4A1F6F]/5 text-[#4A1F6F] rounded-lg border border-[#4A1F6F]/10">
                          {leave.type} Leave
                        </span>
                      </div>

                      {/* Request data box */}
                      <div className="bg-slate-50/50 p-4 rounded-xl border border-gray-150 space-y-2.5 text-xs font-sans">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Leave Duration</span>
                          <span className="font-bold text-slate-700">
                            {leave.start_date} {leave.end_date !== leave.start_date ? ` to ${leave.end_date}` : ''}
                          </span>
                        </div>
                        <div className="border-t border-slate-150 pt-2.5">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Reason Description</p>
                          <p className="text-slate-650 italic bg-white border border-gray-150 rounded-lg p-2.5 shadow-2xs leading-relaxed">{leave.reason || 'No description provided'}</p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3 pt-1 font-sans">
                        <button
                          onClick={() => handleLeaveAction(leave.id, 'approved')}
                          disabled={approvingId === leave.id}
                          className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold rounded-lg shadow-2xs hover:opacity-95 transition-all cursor-pointer"
                        >
                          Approve Request
                        </button>
                        <button
                          onClick={() => handleLeaveAction(leave.id, 'rejected')}
                          disabled={approvingId === leave.id}
                          className="flex-1 py-2 border border-rose-200 text-rose-600 text-xs font-semibold rounded-lg shadow-2xs hover:bg-rose-50 transition-all cursor-pointer"
                        >
                          Reject Request
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Short Leaves Tab */}
          {activeTab === 'shortLeaves' && (
            <div className="p-6">
              {loading ? (
                <TableLoadingSkeleton rows={3} cols={4} />
              ) : shortLeaves.length === 0 ? (
                <div className="py-16 text-center text-slate-400 bg-slate-50/20 rounded-2xl border border-dashed border-slate-200">
                  <Clock className="mx-auto text-slate-300 mb-2" size={28} />
                  <p className="text-sm font-semibold">No pending short leaves</p>
                  <p className="text-xs text-slate-400 mt-1">Excellent! All short requests processed</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {shortLeaves.map((sl) => (
                    <div key={sl.id} className="bg-white p-5 border border-gray-150 hover:border-[#4A1F6F]/20 rounded-2xl hover:scale-[1.005] transition-all flex flex-col justify-between gap-4 shadow-2xs font-jakarta">
                      
                      {/* Ticket header info */}
                      <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-3.5">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar name={sl.users?.name || ''} size={36} />
                          <div>
                            <p className="font-bold text-slate-800 text-sm leading-tight">{sl.users?.name}</p>
                            <p className="text-[11px] text-slate-450 font-medium font-sans mt-0.5">{sl.users?.email}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-orange-50 text-orange-700 rounded-lg border border-orange-200/50">
                          {sl.short_leave_type?.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Request data box */}
                      <div className="bg-slate-50/50 p-4 rounded-xl border border-gray-150 space-y-2.5 text-xs font-sans">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Requested Date</span>
                          <span className="font-bold text-slate-700">{sl.date}</span>
                        </div>
                        <div className="border-t border-slate-150 pt-2.5">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Reason Description</p>
                          <p className="text-slate-650 italic bg-white border border-gray-150 rounded-lg p-2.5 shadow-2xs leading-relaxed">{sl.reason || 'No description provided'}</p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3 pt-1 font-sans">
                        <button
                          onClick={() => handleShortLeaveAction(sl.id, 'approved')}
                          disabled={approvingId === sl.id}
                          className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold rounded-lg shadow-2xs hover:opacity-95 transition-all cursor-pointer"
                        >
                          Approve Request
                        </button>
                        <button
                          onClick={() => handleShortLeaveAction(sl.id, 'rejected')}
                          disabled={approvingId === sl.id}
                          className="flex-1 py-2 border border-rose-200 text-rose-600 text-xs font-semibold rounded-lg shadow-2xs hover:bg-rose-50 transition-all cursor-pointer"
                        >
                          Reject Request
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Workforce Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="p-6">
              {loading ? (
                <TableLoadingSkeleton rows={5} cols={5} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {employeesWithTasks.map((emp) => {
                    const checkedIn = !!emp.attendance?.check_in
                    const checkedOut = !!emp.attendance?.check_out
                    
                    // Task metrics
                    const totalTasks = emp.tasks.length
                    const completedTasks = emp.tasks.filter((t: any) => t.status === 'done').length
                    const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0

                    return (
                      <div key={emp.id} className="bg-white border border-gray-150 hover:border-[#4A1F6F]/20 hover:shadow-md transition-all duration-200 rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xs font-jakarta">
                        
                        {/* Employee info header */}
                        <div className="bg-slate-50/50 p-4 border-b border-gray-150 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <EmployeeAvatar name={emp.name || ''} size={36} />
                            <div>
                              <p className="font-bold text-slate-800 text-sm leading-tight">{emp.name}</p>
                              <p className="text-[11px] text-slate-455 font-medium font-sans mt-0.5">{emp.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-150 rounded-lg shadow-2xs font-sans">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              checkedIn && !checkedOut 
                                ? 'bg-emerald-500 animate-pulse' 
                                : checkedIn && checkedOut 
                                ? 'bg-blue-500' 
                                : 'bg-slate-300'
                            }`} />
                            <span className="text-[10px] text-slate-550 font-bold capitalize">
                              {checkedIn && !checkedOut 
                                ? 'Working' 
                                : checkedIn && checkedOut 
                                ? 'Checked Out' 
                                : 'Inactive'
                              }
                            </span>
                          </div>
                        </div>

                        {/* Progress ratio indicator */}
                        <div className="p-4 border-b border-slate-100 space-y-1.5 font-sans">
                          <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400">
                            <span className="uppercase tracking-wider">Completion Ratio</span>
                            <span className="text-[#4A1F6F] font-bold">{completedTasks} / {totalTasks} Tasks</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-[#4A1F6F] to-[#6B2D8C] h-full rounded-full transition-all duration-550" style={{ width: `${completionRate}%` }} />
                          </div>
                          <p className="text-[9px] text-slate-400 font-semibold text-right">{completionRate}% Completed</p>
                        </div>

                        {/* Tasks list */}
                        <div className="bg-white divide-y divide-slate-100 flex-1 max-h-[200px] overflow-y-auto pr-1 font-sans">
                          {emp.tasks.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-450 italic">
                              No active tasks assigned
                            </div>
                          ) : (
                            emp.tasks.map((task: any) => (
                              <div key={task.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/20 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                  <ClipboardList size={14} className="text-slate-400 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-800 text-xs truncate">{task.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      {task.board?.name && (
                                        <span className="inline-block text-[9px] px-1.5 bg-[#4A1F6F]/5 text-[#4A1F6F] rounded font-semibold uppercase tracking-wider border border-[#4A1F6F]/10">
                                          {task.board.name}
                                        </span>
                                      )}
                                      <span className="inline-block text-[9px] px-1.5 bg-slate-100 text-slate-500 rounded font-bold capitalize">
                                        {task.status?.replace(/_/g, ' ')}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {task.due_date && (
                                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                                    Due {format(new Date(task.due_date), 'MMM d')}
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                        </div>

                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admin Override Attendance Modal */}
      {showMarkModal && selectedEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-150 font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 font-jakarta">
                  {isManualMark ? 'Manual Attendance Entry' : 'Attendance Override Action'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Fill in the details below to manually mark or override attendance records.
                </p>
              </div>
              <button 
                onClick={() => { setShowMarkModal(false); setSelectedEmployee(null); setMarkReason(''); setCustomCheckIn(''); setCustomCheckOut(''); }}
                className="text-slate-400 hover:text-slate-655 p-1 hover:bg-slate-100 rounded-lg transition-all animate-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {isManualMark ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Employee *</label>
                    <select 
                      value={selectedEmployee.id}
                      onChange={(e) => {
                        const empId = e.target.value;
                        const empName = (storeEmployees || []).find(emp => emp.id === empId)?.name || 'Employee';
                        setSelectedEmployee({ ...selectedEmployee, id: empId, name: empName });
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A1F6F] focus:ring-2 focus:ring-[#4A1F6F]/10 font-semibold text-slate-700 text-sm bg-slate-50/50 cursor-pointer transition-all"
                    >
                      <option value="">-- Choose Employee --</option>
                      {(storeEmployees || []).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date *</label>
                    <input 
                      type="date"
                      value={selectedEmployee.date}
                      onChange={(e) => setSelectedEmployee({ ...selectedEmployee, date: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A1F6F] focus:ring-2 focus:ring-[#4A1F6F]/10 text-sm text-slate-700 bg-slate-50/50 transition-all cursor-pointer"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="font-jakarta">
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-sans">Employee</span>
                    <span className="font-bold text-slate-800 text-sm mt-1 block">{selectedEmployee.name}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Date</span>
                    <span className="font-semibold text-slate-600 text-xs mt-1 block">{selectedEmployee.date}</span>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Override Status Value *</label>
                <select value={markAction} onChange={(e) => setMarkAction(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A1F6F] focus:ring-2 focus:ring-[#4A1F6F]/10 font-semibold text-slate-700 text-sm bg-slate-50/50 cursor-pointer transition-all">
                  <option value="present">Mark as Present (value = 1.0)</option>
                  <option value="late_within_buffer">Mark as Late (value = 1.0)</option>
                  <option value="half_day">Mark as Half Day (value = 0.5)</option>
                  <option value="absent">Mark as Absent (value = 0.0)</option>
                  <option value="mark_checkout">Mark Checkout Time</option>
                </select>
              </div>

              {markAction !== 'absent' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Check In Time</label>
                    <input 
                      type="time" 
                      value={customCheckIn} 
                      onChange={(e) => setCustomCheckIn(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A1F6F] focus:ring-2 focus:ring-[#4A1F6F]/10 text-sm text-slate-700 bg-slate-50/50 transition-all cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Check Out Time</label>
                    <input 
                      type="time" 
                      value={customCheckOut} 
                      onChange={(e) => setCustomCheckOut(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A1F6F] focus:ring-2 focus:ring-[#4A1F6F]/10 text-sm text-slate-700 bg-slate-50/50 transition-all cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Override Justification *</label>
                <textarea value={markReason} onChange={(e) => setMarkReason(e.target.value)}
                  placeholder="Enter manual marking reason (e.g. forgot to check in, client site visit)..." rows={3}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A1F6F] focus:ring-2 focus:ring-[#4A1F6F]/10 text-sm text-slate-700 placeholder:text-slate-400 resize-none bg-slate-50/50 transition-all" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => { setShowMarkModal(false); setSelectedEmployee(null); setMarkReason(''); setCustomCheckIn(''); setCustomCheckOut(''); }} 
                disabled={marking}
                className="flex-1 py-2 px-3 border border-gray-200 hover:bg-gray-50 text-sm font-semibold rounded-xl active:scale-98 transition-all cursor-pointer text-gray-700">
                Cancel
              </button>
              <button 
                onClick={handleMarkAttendance} 
                disabled={marking}
                className="flex-1 bg-gradient-to-r from-[#4A1F6F] to-[#3B1859] text-white py-2.5 text-sm font-semibold rounded-xl active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-[#4A1F6F]/10">
                {marking ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Apply Override'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </PageWrapper>
  )
}

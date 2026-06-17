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
  const [showMarkModal, setShowMarkModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string; date: string } | null>(null)
  const [markAction, setMarkAction] = useState<'absent' | 'half_day' | 'mark_checkout'>('absent')
  const [markReason, setMarkReason] = useState('')
  const [marking, setMarking] = useState(false)

  // Selfie Preview state
  const [hoveredSelfie, setHoveredSelfie] = useState<string | null>(null)

  // Read employees list from prefetch store
  const storeEmployees = usePrefetchStore((state) => state.employees)

  const handleSync = async () => {
    setSyncing(true)
    try {
      await Promise.allSettled([
        usePrefetchStore.getState().refreshChunk('attendance'),
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

  const handleOpenMarkModal = (employeeId: string, employeeName: string, date: string) => {
    setSelectedEmployee({ id: employeeId, name: employeeName, date })
    setMarkAction('absent')
    setMarkReason('')
    setShowMarkModal(true)
  }

  const handleMarkAttendance = async () => {
    if (!selectedEmployee) return

    setMarking(true)
    try {
      await adminAPI.markAttendance({
        employeeId: selectedEmployee.id,
        date: selectedEmployee.date,
        action: markAction,
        reason: markReason || undefined,
      })

      setShowMarkModal(false)
      setSelectedEmployee(null)
      setMarkReason('')
      await usePrefetchStore.getState().refreshChunk('attendance')
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
      title={<span className="font-jakarta font-bold text-gray-900">Admin Dashboard</span>}
      subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')}
      actions={
        <button onClick={handleSync} disabled={syncing || loading}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50 font-sans">
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          Sync Data
        </button>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
        {/* ── Quick Utility Toolbar ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link href="/employees" className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 hover:shadow-md hover:border-slate-300 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Users size={20} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 font-jakarta">Employees</p>
              <p className="text-[11px] text-slate-400 truncate">Directory & Profile</p>
            </div>
          </Link>

          <Link href="/users/create" className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 hover:shadow-md hover:border-slate-300 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <UserPlus size={20} className="text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 font-jakarta">Create User</p>
              <p className="text-[11px] text-slate-400 truncate">Onboard Employee</p>
            </div>
          </Link>

          <Link href="/settings" className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 hover:shadow-md hover:border-slate-300 transition">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <Settings size={20} className="text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 font-jakarta">Settings</p>
              <p className="text-[11px] text-slate-400 truncate">Office Boundaries</p>
            </div>
          </Link>

          <button onClick={() => setShowPasswordModal(true)} className="flex items-center text-left gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 hover:shadow-md hover:border-slate-300 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Lock size={20} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 font-jakarta">Security</p>
              <p className="text-[11px] text-slate-400 truncate">Update Password</p>
            </div>
          </button>
        </div>

        {/* ── KPI Metric Control Room ────────────────────────────────────────────── */}
        {loading && !stats ? (
          <StatsLoadingSkeleton count={5} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Employees */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 flex items-center gap-4.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-300" />
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-blue-600 bg-blue-50/70 border border-blue-100/50 shadow-2xs">
                <Users size={24} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-jakarta">Total Employees</p>
                <p className="text-3xl font-black text-slate-800 mt-1 font-jakarta">{stats?.totalEmployees ?? 0}</p>
              </div>
            </div>

            {/* Present Today */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-3.5 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-300" />
              <div className="flex items-center gap-4.5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-emerald-600 bg-emerald-50/70 border border-emerald-100/50 shadow-2xs">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-jakarta">Present Today</p>
                  <p className="text-3xl font-black text-slate-800 mt-1 font-jakarta">{stats?.presentToday ?? 0}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" style={{ width: `${presentPercentage}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 text-right font-semibold">{presentPercentage}% active workforce</p>
              </div>
            </div>

            {/* Absent Today */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-3.5 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-300" />
              <div className="flex items-center gap-4.5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-red-600 bg-red-50/70 border border-red-100/50 shadow-2xs">
                  <XCircle size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-jakarta">Absent Today</p>
                  <p className="text-3xl font-black text-slate-800 mt-1 font-jakarta">{stats?.absentToday ?? 0}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-red-500 to-rose-400 h-full rounded-full transition-all duration-500" style={{ width: `${absentPercentage}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 text-right font-semibold">{absentPercentage}% absence rate</p>
              </div>
            </div>

            {/* Pending Leaves */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 flex items-center justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-300" />
              <div className="flex items-center gap-4.5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-amber-600 bg-amber-50/70 border border-amber-100/50 shadow-2xs relative">
                  <Calendar size={24} />
                  {(stats?.pendingLeaves ?? 0) > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 absolute -right-0.5 -top-0.5 border border-white" />
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-jakarta">Pending Leaves</p>
                  <p className="text-3xl font-black text-slate-800 mt-1 font-jakarta">{stats?.pendingLeaves ?? 0}</p>
                </div>
              </div>
              {(stats?.pendingLeaves ?? 0) > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping absolute right-4 top-4" />
              )}
            </div>

            {/* Pending Short Leaves */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 flex items-center justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-orange-500/5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-300" />
              <div className="flex items-center gap-4.5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-orange-600 bg-orange-50/70 border border-orange-100/50 shadow-2xs relative">
                  <Clock size={24} />
                  {(stats?.pendingShortLeaves ?? 0) > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 absolute -right-0.5 -top-0.5 border border-white" />
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-jakarta">Pending Short</p>
                  <p className="text-3xl font-black text-slate-800 mt-1 font-jakarta">{stats?.pendingShortLeaves ?? 0}</p>
                </div>
              </div>
              {(stats?.pendingShortLeaves ?? 0) > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping absolute right-4 top-4" />
              )}
            </div>
          </div>
        )}

        {/* ── Interactive Workspace Tabs ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="flex flex-wrap border-b border-slate-200 bg-slate-50/50">
            {/* Today's Attendance Tab */}
            <button onClick={() => setActiveTab('attendance')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition ${
                activeTab === 'attendance' ? 'border-black text-black bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}>
              <Clock size={16} />
              Today&apos;s Attendance
              <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-full font-bold">
                {attendance.length}
              </span>
            </button>

            {/* Leave Requests Tab */}
            <button onClick={() => setActiveTab('leaves')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition ${
                activeTab === 'leaves' ? 'border-black text-black bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}>
              <Calendar size={16} />
              Leave Requests
              {leaves.length > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-amber-500 text-white rounded-full font-bold">
                  {leaves.length}
                </span>
              )}
            </button>

            {/* Short Leaves Tab */}
            <button onClick={() => setActiveTab('shortLeaves')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition ${
                activeTab === 'shortLeaves' ? 'border-black text-black bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}>
              <Clock size={16} />
              Short Leaves
              {shortLeaves.length > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-orange-500 text-white rounded-full font-bold">
                  {shortLeaves.length}
                </span>
              )}
            </button>

            {/* Workforce Tasks Tab */}
            <button onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition ${
                activeTab === 'tasks' ? 'border-black text-black bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}>
              <ClipboardList size={16} />
              Workforce Tasks
              <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-full font-bold">
                {allTasks.length}
              </span>
            </button>
          </div>

          {/* ── Tab Content ── */}
          
          {/* Today's Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="space-y-4 p-5">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-slate-100 pb-4">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search employees by name or email..."
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-black transition"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                    className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-black font-semibold"
                  >
                    <option value="all">All Statuses</option>
                    <option value="present">Present</option>
                    <option value="late_within_buffer">Late</option>
                    <option value="half_day">Half Day</option>
                    <option value="absent">Absent</option>
                  </select>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="overflow-x-auto">
                {loading ? (
                  <TableLoadingSkeleton rows={5} cols={5} />
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200/60">
                      <tr>
                        {['Employee', 'Check In', 'Check Out', 'Selfie', 'Status', 'Manual Override'].map(h => (
                          <th key={h} className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                            No attendance records match your search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredAttendance.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50/60 transition group">
                            <td className="px-6 py-4 flex items-center gap-3">
                              <EmployeeAvatar name={rec.users?.name || ''} size={36} />
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 group-hover:text-black truncate">{rec.users?.name ?? rec.employee_id}</p>
                                <p className="text-[11px] text-slate-400 truncate">{rec.users?.email}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-700 font-medium">{fmtTime(rec.check_in)}</td>
                            <td className="px-6 py-4 text-slate-700 font-medium">{fmtTime(rec.check_out)}</td>
                            
                            {/* Selfie preview column */}
                            <td className="px-6 py-4 relative">
                              {rec.selfie_url ? (
                                <div className="relative">
                                  <button
                                    onMouseEnter={() => setHoveredSelfie(rec.id)}
                                    onMouseLeave={() => setHoveredSelfie(null)}
                                    onClick={() => window.open(rec.selfie_url, '_blank')}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                                    title="View Selfie"
                                  >
                                    <Eye size={15} />
                                  </button>
                                  
                                  {/* Floating selfie card popup on hover */}
                                  {hoveredSelfie === rec.id && (
                                    <div className="absolute z-50 bottom-12 left-0 w-36 h-36 bg-white border border-slate-200 rounded-xl shadow-xl p-1 animate-in fade-in zoom-in-95 duration-100">
                                      <img src={rec.selfie_url} alt="Selfie" className="w-full h-full object-cover rounded-lg" />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>

                            <td className="px-6 py-4">{badge(rec.status)}</td>
                            <td className="px-6 py-4">
                              <button onClick={() => handleOpenMarkModal(rec.employee_id, rec.users?.name || 'Employee', rec.date)}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition">
                                Override
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Leave Requests Tab */}
          {activeTab === 'leaves' && (
            <div className="p-5">
              {loading ? (
                <TableLoadingSkeleton rows={5} cols={6} />
              ) : leaves.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-medium">
                  <Calendar className="mx-auto text-slate-300 mb-2" size={36} />
                  No pending leave requests found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {leaves.map((leave) => (
                    <div key={leave.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between gap-4 hover:shadow-sm transition">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar name={leave.users?.name || ''} size={36} />
                          <div>
                            <p className="font-semibold text-slate-800">{leave.users?.name}</p>
                            <p className="text-[10px] text-slate-400">{leave.users?.email}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100">
                          {leave.type} Leave
                        </span>
                      </div>

                      <div className="bg-white rounded-xl p-3 border border-slate-100 text-xs space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Dates:</span>
                          <span className="font-bold text-slate-700">
                            {leave.start_date} {leave.end_date !== leave.start_date ? `to ${leave.end_date}` : ''}
                          </span>
                        </div>
                        <div className="border-t border-slate-50 pt-2">
                          <p className="text-slate-400 font-medium mb-1">Reason:</p>
                          <p className="text-slate-700 italic">{leave.reason || 'No reason provided'}</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <button
                          onClick={() => handleLeaveAction(leave.id, 'approved')}
                          disabled={approvingId === leave.id}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleLeaveAction(leave.id, 'rejected')}
                          disabled={approvingId === leave.id}
                          className="flex-1 py-2 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <X size={14} /> Reject
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
            <div className="p-5">
              {loading ? (
                <TableLoadingSkeleton rows={5} cols={6} />
              ) : shortLeaves.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-medium">
                  <Clock className="mx-auto text-slate-300 mb-2" size={36} />
                  No pending short leave requests found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shortLeaves.map((sl) => (
                    <div key={sl.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between gap-4 hover:shadow-sm transition">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar name={sl.users?.name || ''} size={36} />
                          <div>
                            <p className="font-semibold text-slate-800">{sl.users?.name}</p>
                            <p className="text-[10px] text-slate-400">{sl.users?.email}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-orange-50 text-orange-600 rounded border border-orange-100">
                          {sl.short_leave_type?.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="bg-white rounded-xl p-3 border border-slate-100 text-xs space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Date:</span>
                          <span className="font-bold text-slate-700">{sl.date}</span>
                        </div>
                        <div className="border-t border-slate-50 pt-2">
                          <p className="text-slate-400 font-medium mb-1">Reason:</p>
                          <p className="text-slate-700 italic">{sl.reason || 'No reason provided'}</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <button
                          onClick={() => handleShortLeaveAction(sl.id, 'approved')}
                          disabled={approvingId === sl.id}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleShortLeaveAction(sl.id, 'rejected')}
                          disabled={approvingId === sl.id}
                          className="flex-1 py-2 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <X size={14} /> Reject
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
            <div className="p-5">
              {loading ? (
                <TableLoadingSkeleton rows={5} cols={5} />
              ) : (
                <div className="space-y-4">
                  {employeesWithTasks.map((emp) => {
                    const checkedIn = !!emp.attendance?.check_in
                    const checkedOut = !!emp.attendance?.check_out
                    
                    return (
                      <div key={emp.id} className="border border-slate-200/80 rounded-2xl overflow-hidden hover:shadow-md transition">
                        {/* Employee summary row */}
                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <EmployeeAvatar name={emp.name || ''} size={38} />
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{emp.name}</p>
                              <p className="text-[11px] text-slate-400">{emp.email}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            {/* Attendance status */}
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${
                                checkedIn && !checkedOut 
                                  ? 'bg-emerald-500 animate-pulse' 
                                  : checkedIn && checkedOut 
                                  ? 'bg-blue-500' 
                                  : 'bg-slate-300'
                              }`} />
                              <span className="text-xs text-slate-500 font-semibold capitalize">
                                {checkedIn && !checkedOut 
                                  ? 'Working' 
                                  : checkedIn && checkedOut 
                                  ? 'Checked Out' 
                                  : 'Inactive'
                                }
                              </span>
                            </div>

                            {/* Active Tasks count */}
                            <span className="text-xs px-2.5 py-0.5 bg-slate-200/70 text-slate-700 font-bold rounded-full">
                              {emp.tasks.length} active tasks
                            </span>
                          </div>
                        </div>

                        {/* Tasks list */}
                        <div className="bg-white divide-y divide-slate-100">
                          {emp.tasks.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400">
                              No active tasks assigned
                            </div>
                          ) : (
                            emp.tasks.map((task: any) => (
                              <div key={task.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/40 transition">
                                <div className="flex items-center gap-3 min-w-0">
                                  <ClipboardList size={15} className="text-slate-400 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-800 text-xs truncate">{task.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      {task.board?.name && (
                                        <span className="inline-block text-[9px] px-1 bg-blue-50 text-blue-600 rounded font-semibold uppercase tracking-wider">
                                          {task.board.name}
                                        </span>
                                      )}
                                      <span className="inline-block text-[9px] px-1 bg-slate-100 text-slate-500 rounded font-bold capitalize">
                                        {task.status?.replace(/_/g, ' ')}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {task.due_date && (
                                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 shrink-0">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-base font-bold text-slate-900">Mark Attendance Override</h3>
              <p className="text-xs text-slate-500 mt-1">
                Employee: <span className="font-semibold text-slate-700">{selectedEmployee.name}</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Date: {selectedEmployee.date}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Override Action</label>
              <select value={markAction} onChange={(e) => setMarkAction(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-black font-medium text-sm">
                <option value="absent">Mark as Absent (value = 0)</option>
                <option value="half_day">Mark as Half Day (value = 0.5)</option>
                <option value="mark_checkout">Mark Checkout Time</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Reason for Manual Marking</label>
              <textarea value={markReason} onChange={(e) => setMarkReason(e.target.value)}
                placeholder="Enter justification or reason for override..." rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-black text-sm resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowMarkModal(false); setSelectedEmployee(null); setMarkReason('') }} disabled={marking}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleMarkAttendance} disabled={marking}
                className="flex-1 py-2.5 bg-black hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
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

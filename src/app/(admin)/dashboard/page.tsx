'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import {
  Users, Clock, Calendar, CheckCircle, XCircle,
  AlertCircle, RefreshCw, UserPlus, Settings, FileText, Lock,
} from 'lucide-react'
import Link from 'next/link'

interface Stats {
  totalEmployees: number
  presentToday: number
  absentToday: number
  pendingLeaves: number
}

interface AttendanceRecord {
  id: string
  employee_id: string
  date: string
  check_in: string | null
  check_out: string | null
  status: string
  users?: { name: string; email: string }
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

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves'>('attendance')
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const token = () => localStorage.getItem('authToken')

  const fetchAll = async () => {
    setLoading(true)
    try {
      console.log('🔄 [Dashboard] Fetching all data...')
      console.log('🔑 [Dashboard] Token:', token() ? 'Present' : 'Missing')
      
      const [statsRes, attendanceRes, leavesRes] = await Promise.all([
        fetch('/api/admin/stats',      { headers: { Authorization: `Bearer ${token()}` } }),
        fetch('/api/admin/attendance', { headers: { Authorization: `Bearer ${token()}` } }),
        fetch('/api/admin/leaves',     { headers: { Authorization: `Bearer ${token()}` } }),
      ])
      
      console.log('📊 [Dashboard] Stats response:', statsRes.status)
      console.log('📋 [Dashboard] Attendance response:', attendanceRes.status)
      console.log('🏖️ [Dashboard] Leaves response:', leavesRes.status)
      
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        console.log('📊 [Dashboard] Stats data:', statsData)
        setStats(statsData)
      }
      
      if (attendanceRes.ok) {
        const attendanceData = await attendanceRes.json()
        console.log('📋 [Dashboard] Attendance data:', attendanceData)
        console.log('📋 [Dashboard] Records count:', attendanceData.records?.length || 0)
        setAttendance(attendanceData.records || [])
      } else {
        console.error('❌ [Dashboard] Attendance failed:', await attendanceRes.text())
      }
      
      if (leavesRes.ok) {
        const leavesData = await leavesRes.json()
        console.log('🏖️ [Dashboard] Leaves data:', leavesData)
        setLeaves(leavesData.leaves || [])
      } else {
        console.error('❌ [Dashboard] Leaves failed:', await leavesRes.text())
      }
    } catch (err) {
      console.error('❌ [Dashboard] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleLeaveAction = async (leaveId: string, status: 'approved' | 'rejected') => {
    setApprovingId(leaveId)
    try {
      const res = await fetch('/api/leaves/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ leaveRequestId: leaveId, status }),
      })
      if (res.ok) {
        setLeaves((prev) => prev.map((l) => (l.id === leaveId ? { ...l, status } : l)))
        const statsRes = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token()}` } })
        if (statsRes.ok) setStats(await statsRes.json())
      }
    } finally {
      setApprovingId(null)
    }
  }

  const statusColor: Record<string, string> = {
    present:            'bg-green-100 text-green-700',
    late_within_buffer: 'bg-yellow-100 text-yellow-700',
    half_day:           'bg-orange-100 text-orange-700',
    absent:             'bg-red-100 text-red-700',
    approved:           'bg-green-100 text-green-700',
    rejected:           'bg-red-100 text-red-700',
    pending:            'bg-yellow-100 text-yellow-700',
  }
  const badge = (s: string) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[s] || 'bg-gray-100 text-gray-600'}`}>
      {s?.replace(/_/g, ' ')}
    </span>
  )

  const fmtTime = (iso: string | null) => {
    if (!iso) return '—'
    // Ensure timestamp has Z suffix for proper UTC parsing
    const timestamp = iso.endsWith('Z') ? iso : iso + 'Z'
    return new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
  }

  return (
    <PageWrapper
      title="Dashboard"
      subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')}
      actions={
        <button onClick={fetchAll} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      }
    >
      <div className="space-y-6">

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/employees"
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Employees</p>
              <p className="text-xs text-gray-400">View & manage</p>
            </div>
          </Link>

          <Link href="/users/create"
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <UserPlus size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Create User</p>
              <p className="text-xs text-gray-400">Add employee</p>
            </div>
          </Link>

          <Link href="/settings"
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <Settings size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Settings</p>
              <p className="text-xs text-gray-400">Office & GPS</p>
            </div>
          </Link>

          <button onClick={() => setShowPasswordModal(true)}
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
              <Lock size={18} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Change Password</p>
              <p className="text-xs text-gray-400">Update password</p>
            </div>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Employees', value: stats?.totalEmployees ?? 0, icon: <Users size={20} />,       color: 'text-blue-600 bg-blue-50' },
            { label: 'Present Today',   value: stats?.presentToday   ?? 0, icon: <CheckCircle size={20} />, color: 'text-green-600 bg-green-50' },
            { label: 'Absent Today',    value: stats?.absentToday    ?? 0, icon: <XCircle size={20} />,     color: 'text-red-600 bg-red-50' },
            { label: 'Pending Leaves',  value: stats?.pendingLeaves  ?? 0, icon: <AlertCircle size={20} />, color: 'text-yellow-600 bg-yellow-50' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {(['attendance', 'leaves'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === tab ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab === 'attendance' ? <Clock size={16} /> : <Calendar size={16} />}
                {tab === 'attendance' ? "Today's Attendance" : 'Leave Requests'}
                {tab === 'attendance' && (
                  <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{attendance.length}</span>
                )}
                {tab === 'leaves' && (stats?.pendingLeaves ?? 0) > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                    {stats?.pendingLeaves} pending
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Attendance tab */}
          {activeTab === 'attendance' && (
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Employee', 'Check In', 'Check Out', 'Status'].map(h => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendance.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">No attendance records for today yet</td></tr>
                    ) : attendance.map((rec) => (
                      <tr key={rec.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{rec.users?.name ?? rec.employee_id}</p>
                          <p className="text-xs text-gray-400">{rec.users?.email}</p>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{fmtTime(rec.check_in)}</td>
                        <td className="px-6 py-4 text-gray-700">{fmtTime(rec.check_out)}</td>
                        <td className="px-6 py-4">{badge(rec.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Leaves tab */}
          {activeTab === 'leaves' && (
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Employee', 'Type', 'Dates', 'Reason', 'Status', 'Action'].map(h => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leaves.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">No leave requests found</td></tr>
                    ) : leaves.map((leave) => (
                      <tr key={leave.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{leave.users?.name ?? leave.employee_id}</p>
                          <p className="text-xs text-gray-400">{leave.users?.email}</p>
                        </td>
                        <td className="px-6 py-4 capitalize text-gray-700">{leave.type}</td>
                        <td className="px-6 py-4 text-gray-700">
                          <p>{leave.start_date}</p>
                          {leave.end_date !== leave.start_date && <p className="text-xs text-gray-400">to {leave.end_date}</p>}
                        </td>
                        <td className="px-6 py-4 text-gray-600 max-w-xs"><p className="truncate">{leave.reason || '—'}</p></td>
                        <td className="px-6 py-4">{badge(leave.status)}</td>
                        <td className="px-6 py-4">
                          {leave.status === 'pending' ? (
                            <div className="flex gap-2">
                              <button onClick={() => handleLeaveAction(leave.id, 'approved')} disabled={approvingId === leave.id}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
                                Approve
                              </button>
                              <button onClick={() => handleLeaveAction(leave.id, 'rejected')} disabled={approvingId === leave.id}
                                className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50 transition">
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 capitalize">{leave.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

      </div>

      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </PageWrapper>
  )
}

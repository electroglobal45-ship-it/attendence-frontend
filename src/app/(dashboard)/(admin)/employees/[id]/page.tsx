'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ArrowLeft, Calendar, DollarSign, Clock, X, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { formatTimeIST, calculateHours } from '@/lib/time-utils'
import { adminAPI } from '@/lib/tasks-api'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const employeeId = params.id as string

  const [employee, setEmployee] = useState<any>(null)
  const [calendar, setCalendar] = useState<any>(null)
  const [salary, setSalary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Attendance Override Modal states
  const [showMarkModal, setShowMarkModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [markAction, setMarkAction] = useState<'present' | 'absent' | 'half_day' | 'late_within_buffer' | 'mark_checkout'>('absent')
  const [markReason, setMarkReason] = useState('')
  const [customCheckIn, setCustomCheckIn] = useState('')
  const [customCheckOut, setCustomCheckOut] = useState('')
  const [marking, setMarking] = useState(false)

  const fetchCalendarAndSalary = async (m: number, y: number) => {
    const token = localStorage.getItem('authToken')
    try {
      const [calRes, salRes] = await Promise.all([
        fetch(`/api/calendar?month=${m}&year=${y}&employeeId=${employeeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/salary/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ month: m, year: y, employeeId }),
        })
      ])
      const calData = await calRes.json()
      const salData = await salRes.json()
      setCalendar(calData)
      setSalary(salData.error ? null : salData)
    } catch (err) {
      console.error('Fetch error:', err)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    setLoading(true)
    
    // Fetch employee details
    fetch(`${BACKEND_URL}/api/v1/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const emp = d.data?.users?.find((e: any) => e.id === employeeId)
        setEmployee(emp)
      })

    fetchCalendarAndSalary(selectedMonth, selectedYear)
      .finally(() => setLoading(false))
  }, [employeeId, selectedMonth, selectedYear])

  const handleOpenMarkModal = (dateStr: string, existingDayRecord?: any) => {
    setSelectedDate(dateStr)
    setMarkAction((existingDayRecord?.dayType as any) || 'absent')
    setMarkReason(existingDayRecord?.admin_reason || '')

    const parseTime = (iso: string | null) => {
      if (!iso) return ''
      const timestamp = iso.endsWith('Z') ? iso : iso + 'Z'
      const d = new Date(timestamp)
      const hrs = String(d.toLocaleTimeString('en-IN', { hour: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })).split(':')
      return `${hrs[0]}:${hrs[1]}`
    }

    setCustomCheckIn(parseTime(existingDayRecord?.checkIn))
    setCustomCheckOut(parseTime(existingDayRecord?.checkOut))
    setShowMarkModal(true)
  }

  const handleMarkAttendance = async () => {
    setMarking(true)
    try {
      await adminAPI.markAttendance({
        employeeId: employeeId,
        date: selectedDate,
        action: markAction,
        reason: markReason || undefined,
        checkIn: customCheckIn || undefined,
        checkOut: customCheckOut || undefined,
      })

      setShowMarkModal(false)
      setMarkReason('')
      setCustomCheckIn('')
      setCustomCheckOut('')
      
      // Refresh page data
      setLoading(true)
      await fetchCalendarAndSalary(selectedMonth, selectedYear)
    } catch (error: any) {
      alert(error.message || 'Failed to mark attendance')
    } finally {
      setMarking(false)
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!employee) {
    return <div className="min-h-screen flex items-center justify-center">Employee not found</div>
  }

  return (
    <PageWrapper
      title={employee.name}
      subtitle={employee.email}
      actions={
        <button onClick={() => router.back()} className="btn-secondary flex items-center gap-2">
          <ArrowLeft size={16} />
          Back
        </button>
      }
    >
      <div className="space-y-6">
        {/* Employee Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-xs text-gray-400 mb-1">Category</p>
            <p className="text-lg font-semibold capitalize">{employee.category}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-400 mb-1">Monthly Salary</p>
            <p className="text-lg font-semibold">₹{employee.monthly_salary?.toLocaleString()}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-400 mb-1">Joining Date</p>
            <p className="text-lg font-semibold">{employee.joining_date?.split('T')[0]}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-400 mb-1">Status</p>
            <p className="text-lg font-semibold">{employee.is_active ? 'Active' : 'Inactive'}</p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="card">
          <div className="flex items-center gap-4">
            <Calendar size={20} className="text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="input"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {format(new Date(2024, i, 1), 'MMMM')}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="input"
            >
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        {calendar && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-xs text-gray-400 mb-1">Working Days</p>
              <p className="text-2xl font-bold">{calendar.summary?.workingDays || 0}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-400 mb-1">Present</p>
              <p className="text-2xl font-bold text-green-600">{calendar.summary?.presentDays || 0}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-400 mb-1">Half Days</p>
              <p className="text-2xl font-bold text-orange-600">{calendar.summary?.halfDays || 0}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-400 mb-1">Attendance Value</p>
              <p className="text-2xl font-bold text-blue-600">{calendar.summary?.totalAttendanceValue || 0}</p>
            </div>
          </div>
        )}

        {/* Salary Info */}
        {salary && (
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign size={20} className="text-gray-400" />
              <h3 className="font-semibold text-gray-900">Salary Breakdown</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Payable Salary</p>
                <p className="text-lg font-bold text-green-600">₹{salary.payable_salary?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Deductions</p>
                <p className="text-lg font-bold text-red-600">₹{salary.deductions?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">No-Leave Bonus</p>
                <p className="text-lg font-bold text-blue-600">₹{salary.no_leave_bonus?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Total</p>
                <p className="text-lg font-bold">₹{salary.total_with_bonus?.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        {calendar && (
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Clock size={20} className="text-gray-400" />
              <h3 className="font-semibold text-gray-900">Daily Attendance</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Hours</th>
                    <th>Value</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {calendar.days?.map((day: any) => (
                    <tr key={day.date} className={day.isWeekend || day.isHoliday ? 'bg-gray-50' : ''}>
                      <td className="font-medium">{format(new Date(day.date), 'MMM dd, EEE')}</td>
                      <td>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            day.dayType === 'present' || day.dayType === 'late_within_buffer'
                              ? 'bg-green-100 text-green-700'
                              : day.dayType === 'half_day'
                              ? 'bg-orange-100 text-orange-700'
                              : day.dayType === 'leave'
                              ? 'bg-blue-100 text-blue-700'
                              : day.dayType === 'absent'
                              ? 'bg-red-100 text-red-700'
                              : day.dayType === 'holiday' || day.dayType === 'sunday'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {day.label}
                        </span>
                      </td>
                      <td>
                        {formatTimeIST(day.checkIn)}
                      </td>
                      <td>
                        {formatTimeIST(day.checkOut)}
                      </td>
                      <td>{calculateHours(day.checkIn, day.checkOut)}</td>
                      <td className="font-semibold">{day.attendanceValue}</td>
                      <td>
                        <button
                          onClick={() => handleOpenMarkModal(day.date, day)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-650 transition cursor-pointer border border-slate-200"
                        >
                          Override
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Override Modal */}
      {showMarkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 font-jakarta">Attendance Override Action</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Override attendance record for <span className="font-semibold text-indigo-650">{employee.name}</span>
                </p>
              </div>
              <button 
                onClick={() => { setShowMarkModal(false); setMarkReason(''); setCustomCheckIn(''); setCustomCheckOut(''); }}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition animate-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Date</span>
                <span className="font-semibold text-slate-600 text-xs mt-1 block">{selectedDate}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Override Status Value *</label>
                <select value={markAction} onChange={(e) => setMarkAction(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-semibold text-slate-700 text-sm bg-slate-50/50 cursor-pointer transition">
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
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-sm text-slate-700 bg-slate-50/50 transition cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Check Out Time</label>
                    <input 
                      type="time" 
                      value={customCheckOut} 
                      onChange={(e) => setCustomCheckOut(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-sm text-slate-700 bg-slate-50/50 transition cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Override Justification *</label>
                <textarea value={markReason} onChange={(e) => setMarkReason(e.target.value)}
                  placeholder="Enter manual marking reason (e.g. forgot to check in, client site visit)..." rows={3}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-sm text-slate-700 placeholder:text-slate-400 resize-none bg-slate-50/50 transition" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => { setShowMarkModal(false); setMarkReason(''); setCustomCheckIn(''); setCustomCheckOut(''); }} 
                disabled={marking}
                className="flex-1 btn-crm-secondary py-2.5 text-sm font-semibold rounded-xl active:scale-98 transition disabled:opacity-50">
                Cancel
              </button>
              <button 
                onClick={handleMarkAttendance} 
                disabled={marking}
                className="flex-1 btn-crm-primary py-2.5 text-sm font-semibold rounded-xl active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2">
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
    </PageWrapper>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ArrowLeft, Calendar, DollarSign, Clock, X, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { formatTimeIST, calculateHours } from '@/lib/time-utils'
import { adminAPI } from '@/lib/tasks-api'
import { authedFetch } from '@/lib/backend-api'

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
    try {
      const [calRes, salRes] = await Promise.all([
        authedFetch(`/api/calendar?month=${m}&year=${y}&employeeId=${employeeId}`),
        authedFetch(`/api/salary/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      title="Employee Details"
      onBack={() => router.back()}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
        {/* Employee Profile Header Banner */}
        <div 
          style={{ background: 'linear-gradient(135deg, #4A1F6F 0%, #2D0F47 100%)' }}
          className="rounded-3xl p-6 text-white relative overflow-hidden shadow-md border border-[#4A1F6F]/20 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl font-bold border border-white/20 shadow-md select-none">
              {employee.name?.[0]?.toUpperCase() || 'E'}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black font-jakarta tracking-tight text-white">{employee.name}</h1>
              <p className="text-sm text-purple-200 mt-0.5">{employee.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="px-2.5 py-0.5 bg-white/10 border border-white/15 rounded-md text-[10px] font-bold uppercase tracking-wider text-purple-100">
                  {employee.category}
                </span>
                <span className={`px-2.5 py-0.5 border rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  employee.is_active ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/15 border-rose-500/20 text-rose-400'
                }`}>
                  {employee.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 sm:gap-12 text-sm border-t border-white/10 pt-4 md:border-t-0 md:pt-0 w-full md:w-auto justify-between md:justify-end">
            <div className="flex-1 md:flex-none">
              <p className="text-[10px] text-purple-200 font-bold uppercase tracking-wider mb-1">Monthly Salary</p>
              <p className="text-lg font-black text-[#D9A441] whitespace-nowrap">
                ₹{employee.monthly_salary ? Number(employee.monthly_salary).toLocaleString('en-IN') : '—'}
              </p>
            </div>
            <div className="border-l border-white/15 pl-6 sm:pl-12 flex-1 md:flex-none">
              <p className="text-[10px] text-purple-200 font-bold uppercase tracking-wider mb-1">Joining Date</p>
              <p className="text-lg font-bold text-white whitespace-nowrap">
                {employee.joining_date ? (() => {
                  try {
                    const d = new Date(employee.joining_date)
                    return isNaN(d.getTime()) ? employee.joining_date?.split('T')[0] : format(d, 'dd MMM yyyy')
                  } catch (e) {
                    return employee.joining_date?.split('T')[0] || '—'
                  }
                })() : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Summary Section */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-slate-500" />
              <h2 className="font-semibold text-slate-800 text-base">Monthly Overview</h2>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A1F6F] focus:ring-1 focus:ring-[#4A1F6F]/15 bg-white font-semibold text-slate-700 cursor-pointer"
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
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A1F6F] focus:ring-1 focus:ring-[#4A1F6F]/15 bg-white font-semibold text-slate-700 cursor-pointer"
              >
                {[2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Attendance Stats (6/12) */}
            {calendar && (
              <div className="lg:col-span-6 grid grid-cols-2 gap-4 border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-6">
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Working Days</p>
                  <p className="text-xl font-bold text-slate-800">{calendar.summary?.workingDays || 0}</p>
                </div>
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Present</p>
                  <p className="text-xl font-bold text-emerald-600">{calendar.summary?.presentDays || 0}</p>
                </div>
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Half Days</p>
                  <p className="text-xl font-bold text-orange-600">{calendar.summary?.halfDays || 0}</p>
                </div>
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Attendance Value</p>
                  <p className="text-xl font-bold text-[#4A1F6F]">{calendar.summary?.totalAttendanceValue || 0}</p>
                </div>
              </div>
            )}

            {/* Right: Salary Breakdown (6/12) */}
            {salary && (
              <div className="lg:col-span-6 flex flex-col justify-between pl-0 lg:pl-2">
                <div className="space-y-4">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Salary Breakdown</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Payable Salary</p>
                      <p className="text-base font-bold text-emerald-650">₹{salary.payable_salary?.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Deductions</p>
                      <p className="text-base font-bold text-red-650">₹{salary.deductions?.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">No-Leave Bonus</p>
                      <p className="text-base font-bold text-[#4A1F6F]">₹{salary.no_leave_bonus?.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-[#4A1F6F]/20 bg-[#4A1F6F]/5">
                      <p className="text-[10px] text-[#4A1F6F] font-bold uppercase tracking-wider mb-1">Total Payout</p>
                      <p className="text-base font-black text-[#4A1F6F]">₹{salary.total_with_bonus?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Daily Attendance Grid */}
        {calendar && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Clock size={18} className="text-slate-500" />
              <h2 className="font-semibold text-slate-800 text-base">Daily Attendance</h2>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-100 no-scrollbar">
              <table className="table min-w-[750px]">
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
                    <tr key={day.date} className={`${day.isWeekend || day.isHoliday ? 'bg-slate-50/50' : ''} hover:bg-[#4A1F6F]/5 transition group`}>
                      <td className="font-bold text-slate-800 whitespace-nowrap">{format(new Date(day.date), 'MMM dd, EEE')}</td>
                      <td className="whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded border text-xs font-semibold capitalize ${
                            day.dayType === 'present' || day.dayType === 'late_within_buffer'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : day.dayType === 'half_day'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : day.dayType === 'leave'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : day.dayType === 'absent'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : day.dayType === 'holiday' || day.dayType === 'sunday'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}
                        >
                          {day.label}
                        </span>
                      </td>
                      <td className="text-slate-650 font-medium whitespace-nowrap">{formatTimeIST(day.checkIn)}</td>
                      <td className="text-slate-650 font-medium whitespace-nowrap">{formatTimeIST(day.checkOut)}</td>
                      <td className="text-slate-550 font-medium whitespace-nowrap">{calculateHours(day.checkIn, day.checkOut)}</td>
                      <td className="font-bold text-slate-800 whitespace-nowrap">{day.attendanceValue}</td>
                      <td className="whitespace-nowrap">
                        <button
                          onClick={() => handleOpenMarkModal(day.date, day)}
                          className="btn-crm-secondary py-1 px-2.5 text-xs shadow-2xs"
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
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A1F6F] focus:ring-1 focus:ring-[#4A1F6F]/15 font-semibold text-slate-700 text-sm bg-slate-50/50 cursor-pointer transition">
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
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A1F6F] focus:ring-1 focus:ring-[#4A1F6F]/15 text-sm text-slate-700 bg-slate-50/50 transition cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Check Out Time</label>
                    <input 
                      type="time" 
                      value={customCheckOut} 
                      onChange={(e) => setCustomCheckOut(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A1F6F] focus:ring-1 focus:ring-[#4A1F6F]/15 text-sm text-slate-700 bg-slate-50/50 transition cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Override Justification *</label>
                <textarea value={markReason} onChange={(e) => setMarkReason(e.target.value)}
                  placeholder="Enter manual marking reason (e.g. forgot to check in, client site visit)..." rows={3}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A1F6F] focus:ring-1 focus:ring-[#4A1F6F]/15 text-sm text-slate-700 placeholder:text-slate-400 resize-none bg-slate-50/50 transition" />
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

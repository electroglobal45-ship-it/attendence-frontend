'use client'

import { useEffect, useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ChevronLeft, ChevronRight, X, RefreshCw } from 'lucide-react'
import { adminAPI } from '@/lib/tasks-api'
import { formatTimeIST } from '@/lib/time-utils'

const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  present:             { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Present' },
  late_within_buffer:  { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Late' },
  half_day:            { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Half Day' },
  approved_short_leave:{ bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Short Leave' },
  leave:               { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Leave' },
  leave_pending:       { bg: 'bg-purple-50',  text: 'text-purple-500', label: 'Leave (Pending)' },
  absent:              { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Absent' },
  holiday:             { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Holiday' },
  sunday:              { bg: 'bg-gray-50',    text: 'text-gray-400',   label: 'Sunday' },
  future:              { bg: 'bg-white',      text: 'text-gray-300',   label: '' },
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

export default function AdminCalendarPage() {
  const now = new Date()
  const [month,      setMonth]      = useState(now.getMonth() + 1)
  const [year,       setYear]       = useState(now.getFullYear())
  const [employees,  setEmployees]  = useState<any[]>([])
  const [selectedEmp, setSelectedEmp] = useState<string>('')
  const [calData,    setCalData]    = useState<any>(null)
  const [salary,     setSalary]     = useState<any>(null)
  const [loading,    setLoading]    = useState(false)
  const [selected,   setSelected]   = useState<any>(null)

  // Attendance Override Modal states
  const [showMarkModal, setShowMarkModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [markAction, setMarkAction] = useState<'present' | 'absent' | 'half_day' | 'late_within_buffer' | 'mark_checkout'>('absent')
  const [markReason, setMarkReason] = useState('')
  const [customCheckIn, setCustomCheckIn] = useState('')
  const [customCheckOut, setCustomCheckOut] = useState('')
  const [marking, setMarking] = useState(false)

  const handleOpenMarkModal = (dateStr: string, existingDayRecord?: any) => {
    setSelectedDate(dateStr)
    setMarkAction((existingDayRecord?.dayType as any) || 'absent')
    setMarkReason(existingDayRecord?.admin_reason || '')

    const parseTime = (iso: string | null) => {
      if (!iso) return ''
      try {
        let timestamp = iso.trim()
        if (timestamp.includes(' ') && !timestamp.includes('T')) {
          timestamp = timestamp.replace(' ', 'T')
        }
        if (timestamp.includes('+')) {
          // Has timezone offset
        } else if (!timestamp.endsWith('Z')) {
          timestamp = timestamp + 'Z'
        }
        const d = new Date(timestamp)
        if (isNaN(d.getTime())) {
          const fallback = new Date(iso)
          if (isNaN(fallback.getTime())) return ''
          const hrs = fallback.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).split(':')
          return `${hrs[0]}:${hrs[1]}`
        }
        const hrs = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).split(':')
        return `${hrs[0]}:${hrs[1]}`
      } catch (err) {
        return ''
      }
    }

    setCustomCheckIn(parseTime(existingDayRecord?.checkIn))
    setCustomCheckOut(parseTime(existingDayRecord?.checkOut))
    setShowMarkModal(true)
  }

  const handleMarkAttendance = async () => {
    if (!selectedEmp) return
    setMarking(true)
    try {
      await adminAPI.markAttendance({
        employeeId: selectedEmp,
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
      setSelected(null)

      // Refresh data
      await fetchData(month, year, selectedEmp)
    } catch (error: any) {
      alert(error.message || 'Failed to mark attendance')
    } finally {
      setMarking(false)
    }
  }

  const token = () => localStorage.getItem('authToken')

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/v1/users`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        const users = d.data?.users || []
        const emps = users.filter((u: any) => u.role === 'employee')
        setEmployees(emps)
        if (emps.length > 0) setSelectedEmp(emps[0].id)
      })
  }, [])

  useEffect(() => {
    if (selectedEmp) fetchData(month, year, selectedEmp)
  }, [selectedEmp])

  const fetchData = async (m: number, y: number, empId: string) => {
    setLoading(true); setSelected(null)
    try {
      const [calRes, salRes] = await Promise.all([
        fetch(`/api/calendar?month=${m}&year=${y}&employeeId=${empId}`, { headers: { Authorization: `Bearer ${token()}` } }),
        fetch('/api/salary/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ month: m, year: y, employeeId: empId }),
        }),
      ])
      const [cal, sal] = await Promise.all([calRes.json(), salRes.json()])
      setCalData(cal)
      setSalary(sal.error ? null : sal)
    } catch {}
    finally { setLoading(false) }
  }

  const prev = () => {
    const m = month === 1 ? 12 : month - 1
    const y = month === 1 ? year - 1 : year
    setMonth(m); setYear(y); if (selectedEmp) fetchData(m, y, selectedEmp)
  }
  const next = () => {
    const m = month === 12 ? 1 : month + 1
    const y = month === 12 ? year + 1 : year
    setMonth(m); setYear(y); if (selectedEmp) fetchData(m, y, selectedEmp)
  }

  const firstDow = calData?.days?.[0]?.dayOfWeek ?? 0
  const cells = [...Array(firstDow).fill(null), ...(calData?.days || [])]
  const s = calData?.summary
  const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

  const fmtTimeCompact = (iso: string | null) => {
    if (!iso) return ''
    const formatted = formatTimeIST(iso)
    if (formatted === '—') return ''
    return formatted.replace(/\s?[AP]M/i, (m) => m.trim().toLowerCase())
  }

  return (
    <PageWrapper title="Employee Calendar" subtitle="View attendance calendar and salary for any employee">
      <div className="max-w-4xl space-y-5">

        {/* Controls */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-gray-500 mb-1">Employee</label>
            <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black">
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.email})</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prev} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /></button>
            <span className="font-medium text-sm min-w-32 text-center">{MONTHS[month-1]} {year}</span>
            <button onClick={next} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={18} /></button>
          </div>
        </div>

        {/* Summary + Salary */}
        {s && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Working Days',  value: s.workingDays,                    color: 'text-gray-700' },
              { label: 'Present',       value: s.presentDays,                    color: 'text-green-700' },
              { label: 'Half Days',     value: s.halfDays,                       color: 'text-orange-700' },
              { label: 'Absent',        value: s.absentDays,                     color: 'text-red-700' },
              { label: 'Att. Value',    value: s.totalAttendanceValue.toFixed(1), color: 'text-blue-700' },
              { label: 'Net Salary',    value: salary ? fmt(salary.net_salary) : '—', color: 'text-green-700' },
              { label: 'Deductions',    value: salary ? fmt(salary.deductions) : '—', color: 'text-red-700' },
              { label: 'No-Leave Bonus',value: salary ? fmt(salary.no_leave_bonus) : '—', color: 'text-purple-700' },
            ].map(item => (
              <div key={item.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Calendar */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200">
            {DAY_LABELS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
            ))}
          </div>
          {loading ? (
            <div className="py-16 text-center text-gray-400">Loading...</div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((cell, i) => {
                if (!cell) return <div key={`e-${i}`} className="aspect-square border-b border-r border-gray-100" />
                const style = STATUS_STYLE[cell.dayType] || STATUS_STYLE.future
                return (
                  <button key={cell.date} onClick={() => setSelected(cell)}
                    className="aspect-square border-b border-r border-gray-100 flex flex-col items-center justify-center p-1 gap-0.5 hover:opacity-80 transition cursor-pointer">
                    <span className="text-sm font-medium text-gray-800">{cell.day}</span>
                    {style.label && (
                      <span className={`text-[9px] px-1 rounded font-medium ${style.bg} ${style.text} leading-tight`}>
                        {style.label}
                      </span>
                    )}
                    {(cell.checkIn || cell.checkOut || cell.check_out) && (
                      <div className="text-[8px] text-gray-400 font-mono mt-0.5 flex flex-col items-center leading-none scale-90">
                        {cell.checkIn && <span>↓{fmtTimeCompact(cell.checkIn)}</span>}
                        {(cell.checkOut || cell.check_out) && <span>↑{fmtTimeCompact(cell.checkOut || cell.check_out)}</span>}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(STATUS_STYLE).filter(([,v]) => v.label).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${val.bg}`} />
              <span className="text-xs text-gray-500">{val.label}</span>
            </div>
          ))}
        </div>

        {/* Day detail */}
        {selected && selected.dayType !== 'future' && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{selected.date}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="font-medium capitalize">{selected.label || selected.dayType.replace(/_/g,' ')}</span></div>
              {selected.checkIn && <div className="flex justify-between"><span className="text-gray-500">Check In</span><span className="font-medium">{formatTimeIST(selected.checkIn)}</span></div>}
              {selected.checkOut && <div className="flex justify-between"><span className="text-gray-500">Check Out</span><span className="font-medium">{formatTimeIST(selected.checkOut)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Attendance Value</span><span className="font-medium">{selected.attendanceValue}</span></div>
              {selected.shortLeave && <div className="flex justify-between"><span className="text-gray-500">Short Leave</span><span className="font-medium capitalize">{selected.shortLeave.type} — {selected.shortLeave.status}</span></div>}
              {selected.selfieUrl && <div className="mt-3"><p className="text-gray-500 mb-1">Selfie</p><img src={selected.selfieUrl} alt="selfie" className="w-24 h-24 rounded-lg object-cover border border-gray-200" /></div>}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => handleOpenMarkModal(selected.date, selected)}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-650 transition cursor-pointer border border-slate-200"
              >
                Override Attendance
              </button>
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
                  Override attendance record for selected employee
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

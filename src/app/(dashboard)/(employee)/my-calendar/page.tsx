'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatTimeIST, calculateHours } from '@/lib/time-utils'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  present:            { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Present' },
  late_within_buffer: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Late' },
  half_day:           { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Half Day' },
  approved_short_leave:{ bg: 'bg-blue-100',  text: 'text-blue-800',   label: 'Short Leave' },
  leave:              { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Leave' },
  leave_pending:      { bg: 'bg-purple-50',  text: 'text-purple-500', label: 'Leave (Pending)' },
  absent:             { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Absent' },
  holiday:            { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Holiday' },
  sunday:             { bg: 'bg-gray-50',    text: 'text-gray-400',   label: 'Sunday' },
  future:             { bg: 'bg-white',      text: 'text-gray-300',   label: '' },
}

const STATUS_DOTS: Record<string, string> = {
  present:             'bg-green-500',
  late_within_buffer:  'bg-yellow-500',
  half_day:            'bg-orange-500',
  approved_short_leave:'bg-blue-500',
  leave:               'bg-purple-500',
  leave_pending:       'bg-purple-300',
  absent:              'bg-red-500',
  holiday:             'bg-gray-400',
  sunday:              'bg-gray-300',
  future:              'bg-transparent',
}

export default function CalendarPage() {
  const { user } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [data,  setData]  = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'table' | 'both'>('both')

  const fetchCalendar = async (m: number, y: number) => {
    setLoading(true)
    setSelected(null)
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch(`/api/calendar?month=${m}&year=${y}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await res.json()
      setData(d)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { if (user) fetchCalendar(month, year) }, [user])

  const prev = () => {
    const m = month === 1 ? 12 : month - 1
    const y = month === 1 ? year - 1 : year
    setMonth(m); setYear(y); fetchCalendar(m, y)
  }
  const next = () => {
    const m = month === 12 ? 1 : month + 1
    const y = month === 12 ? year + 1 : year
    setMonth(m); setYear(y); fetchCalendar(m, y)
  }

  // Build grid with leading empty cells
  const firstDow = data?.days?.[0]?.dayOfWeek ?? 0
  const cells = [...Array(firstDow).fill(null), ...(data?.days || [])]

  const s = data?.summary

  const fmtTimeCompact = (iso: string | null) => {
    if (!iso) return ''
    const formatted = formatTimeIST(iso)
    if (formatted === '—') return ''
    return formatted.replace(/\s?[AP]M/i, (m) => m.trim().toLowerCase())
  }

  return (
    <PageWrapper title="My Calendar" subtitle="Attendance overview by month">
      <div className="max-w-3xl mx-auto px-4 sm:px-0 space-y-4 sm:space-y-5 pb-10">

        {/* Month navigator */}
        <div className="flex flex-wrap gap-4 items-center justify-between bg-white border border-gray-200 rounded-xl px-4 sm:px-5 py-3">
          <div className="flex items-center gap-2">
            <button onClick={prev} className="p-1.5 hover:bg-gray-100 rounded-lg touch-manipulation"><ChevronLeft size={20} /></button>
            <h2 className="font-semibold text-gray-900 text-base sm:text-lg min-w-32 text-center">{MONTHS[month-1]} {year}</h2>
            <button onClick={next} className="p-1.5 hover:bg-gray-100 rounded-lg touch-manipulation"><ChevronRight size={20} /></button>
          </div>
          
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-medium border border-gray-200 shrink-0">
            <button onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-md transition ${viewMode === 'calendar' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}>
              Calendar Grid
            </button>
            <button onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md transition ${viewMode === 'table' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}>
              Tabular Sheet
            </button>
            <button onClick={() => setViewMode('both')}
              className={`px-3 py-1.5 rounded-md transition ${viewMode === 'both' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}>
              Show Both
            </button>
          </div>
        </div>

        {/* Summary strip */}
        {s && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { label: 'Working Days', value: s.workingDays,         color: 'text-gray-700' },
              { label: 'Present',      value: s.presentDays,         color: 'text-green-700' },
              { label: 'Half Days',    value: s.halfDays,            color: 'text-orange-700' },
              { label: 'Leaves',       value: s.leaveDays,           color: 'text-purple-700' },
              { label: 'Absent',       value: s.absentDays,          color: 'text-red-700' },
              { label: 'Att. Value',   value: s.totalAttendanceValue.toFixed(1), color: 'text-blue-700' },
            ].map(item => (
              <div key={item.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                <p className={`text-lg sm:text-xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Calendar grid */}
        {viewMode !== 'table' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Day headers */}
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
                  const isToday = cell.date === new Date().toISOString().split('T')[0]
                  return (
                    <button
                      key={cell.date}
                      onClick={() => setSelected(cell)}
                      className={`aspect-square border-b border-r border-gray-100 flex flex-col items-center justify-center p-1 gap-0.5 hover:opacity-80 transition touch-manipulation ${cell.dayType !== 'future' ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <span className={`text-xs sm:text-sm font-medium w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-black text-white' : 'text-gray-800'}`}>
                        {cell.day}
                      </span>
                      {style.label && (
                        <>
                          <span className={`text-[8px] sm:text-[9px] px-1 rounded font-medium ${style.bg} ${style.text} leading-tight hidden sm:inline-block`}>
                            {style.label}
                          </span>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOTS[cell.dayType] || 'bg-transparent'} sm:hidden`} />
                        </>
                      )}
                      {(cell.checkIn || cell.checkOut || cell.check_out) && (
                        <div className="text-[8px] sm:text-[9px] text-gray-400 font-mono mt-0.5 flex-col items-center leading-none scale-90 sm:scale-100 hidden sm:flex">
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
        )}

        {/* Legend */}
        {viewMode !== 'table' && (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {Object.entries(STATUS_STYLE).filter(([,v]) => v.label).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${val.bg}`} />
                <span className="text-xs text-gray-500">{val.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Day detail panel */}
        {viewMode !== 'table' && selected && selected.dayType !== 'future' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-base">{selected.date}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none touch-manipulation w-8 h-8 flex items-center justify-center">×</button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Status</span>
                <span className="font-medium capitalize">{selected.label || selected.dayType.replace(/_/g,' ')}</span>
              </div>
              {selected.checkIn && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Check In</span>
                  <span className="font-medium">
                    {formatTimeIST(selected.checkIn)}
                  </span>
                </div>
              )}
              {(selected.checkOut || selected.check_out) && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Mark Out</span>
                  <span className="font-medium">
                    {formatTimeIST(selected.checkOut || selected.check_out)}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Attendance Value</span>
                <span className="font-medium">{selected.attendanceValue}</span>
              </div>
              {selected.shortLeave && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Short Leave</span>
                  <span className="font-medium capitalize">{selected.shortLeave.type} — {selected.shortLeave.status}</span>
                </div>
              )}
              {selected.selfieUrl && (
                <div className="mt-3">
                  <p className="text-gray-500 mb-1">Selfie</p>
                  <img src={selected.selfieUrl} alt="selfie" className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover border border-gray-200" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timesheet Details Table */}
        {viewMode !== 'calendar' && data && data.days && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs mt-6">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/50">
              <h3 className="font-semibold text-gray-950 text-sm sm:text-base">My Timesheet Details</h3>
              <p className="text-xs text-gray-500 mt-0.5">Detailed log of your daily check-in/out timings and working hours</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-gray-50 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Check In</th>
                    <th className="py-3 px-4">Check Out</th>
                    <th className="py-3 px-4">Working Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                  {data.days
                    .filter((day: any) => day.dayType !== 'future')
                    .map((day: any) => {
                      const style = STATUS_STYLE[day.dayType] || STATUS_STYLE.future
                      const checkInTime = day.checkIn ? formatTimeIST(day.checkIn) : '—'
                      const checkOutTime = (day.checkOut || day.check_out) ? formatTimeIST(day.checkOut || day.check_out) : '—'
                      const hrsStr = calculateHours(day.checkIn, day.checkOut || day.check_out)
                      
                      const dateObj = new Date(day.date + 'T00:00:00Z')
                      const dayName = DAY_LABELS[dateObj.getUTCDay()]
                      const formattedDate = `${String(day.day).padStart(2, '0')} ${MONTHS[month-1].substring(0, 3)} (${dayName})`
                      
                      return (
                        <tr key={day.date} className="hover:bg-gray-50/50 transition">
                          <td className="py-3 px-4 font-medium text-gray-900">{formattedDate}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                              {style.label || day.dayType.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-mono">{checkInTime}</td>
                          <td className="py-3 px-4 text-gray-600 font-mono">{checkOutTime}</td>
                          <td className="py-3 px-4 text-gray-600">{hrsStr}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
            {data.days.filter((day: any) => day.dayType !== 'future').length === 0 && (
              <div className="py-8 text-center text-gray-400 text-sm">No days to display for this month.</div>
            )}
          </div>
        )}

      </div>
    </PageWrapper>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatTimeIST } from '@/lib/time-utils'

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

export default function CalendarPage() {
  const { user } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [data,  setData]  = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any>(null)

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
      <div className="max-w-3xl px-4 sm:px-0 space-y-4 sm:space-y-5 pb-6">

        {/* Month navigator */}
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 sm:px-5 py-3">
          <button onClick={prev} className="p-1.5 hover:bg-gray-100 rounded-lg touch-manipulation"><ChevronLeft size={20} /></button>
          <h2 className="font-semibold text-gray-900 text-base sm:text-lg">{MONTHS[month-1]} {year}</h2>
          <button onClick={next} className="p-1.5 hover:bg-gray-100 rounded-lg touch-manipulation"><ChevronRight size={20} /></button>
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
                      <span className={`text-[8px] sm:text-[9px] px-1 rounded font-medium ${style.bg} ${style.text} leading-tight`}>
                        {style.label}
                      </span>
                    )}
                    {(cell.checkIn || cell.checkOut || cell.check_out) && (
                      <div className="text-[8px] sm:text-[9px] text-gray-400 font-mono mt-0.5 flex flex-col items-center leading-none scale-90 sm:scale-100">
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
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {Object.entries(STATUS_STYLE).filter(([,v]) => v.label).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${val.bg}`} />
              <span className="text-xs text-gray-500">{val.label}</span>
            </div>
          ))}
        </div>

        {/* Day detail panel */}
        {selected && selected.dayType !== 'future' && (
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

      </div>
    </PageWrapper>
  )
}

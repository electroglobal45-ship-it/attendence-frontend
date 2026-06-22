'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { meetingsAPI, Meeting } from '@/lib/tasks-api'
import { useMeetings } from '@/lib/meetings-context'
import { useAuth } from '@/lib/auth-context'
import { usePrefetchStore } from '@/lib/store/prefetch-store'
import {
  Video, Plus, Trash2, RefreshCw, AlertTriangle,
  Clock, Calendar, Users, X, ChevronDown,
} from 'lucide-react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

interface Employee { id: string; name: string; email: string }

// ── Multi-employee selector ──────────────────────────────────────────────────
function EmployeeMultiSelect({
  employees, selected, onChange,
}: {
  employees: Employee[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  const selectedNames = employees.filter(e => selected.includes(e.id)).map(e => e.name)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#4A1F6F]/10 focus:border-[#4A1F6F] outline-none text-left transition-all"
      >
        <span className={selected.length === 0 ? 'text-gray-400' : 'text-gray-800'}>
          {selected.length === 0
            ? 'Select members…'
            : selectedNames.length <= 2
              ? selectedNames.join(', ')
              : `${selectedNames[0]}, ${selectedNames[1]} +${selected.length - 2} more`}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {employees.length > 0 && (
            <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50 sticky top-0 z-10">
              <span className="text-xs text-gray-500 font-semibold">{selected.length} selected</span>
              <button
                type="button"
                onClick={() => {
                  if (selected.length === employees.length) {
                    onChange([])
                  } else {
                    onChange(employees.map(e => e.id))
                  }
                }}
                className="text-xs text-[#4A1F6F] hover:text-[#3B1859] font-semibold transition"
              >
                {selected.length === employees.length ? 'Clear All' : 'Select All'}
              </button>
            </div>
          )}
          {employees.length === 0 ? (
            <p className="p-3 text-xs text-gray-400 text-center">No members found</p>
          ) : employees.map(emp => (
            <label key={emp.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selected.includes(emp.id)}
                onChange={() => toggle(emp.id)}
                className="w-4 h-4 rounded border-gray-300 text-[#4A1F6F] focus:ring-[#4A1F6F] accent-[#4A1F6F]"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{emp.name}</p>
                <p className="text-xs text-gray-400 truncate">{emp.email}</p>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MeetingsPage() {
  const { user } = useAuth()
  const { activeMeeting, isMinimized, joinMeeting, leaveMeeting, setIsMinimized } = useMeetings()
  
  const storeMeetings = usePrefetchStore((state) => state.meetings)
  const storeEmployees = usePrefetchStore((state) => state.employees)
  const [meetings, setMeetings] = useState<Meeting[]>(() => storeMeetings ?? [])
  const [employees, setEmployees] = useState<Employee[]>(() => storeEmployees ?? [])
  const [loading, setLoading] = useState(() => !storeMeetings || storeMeetings.length === 0)
  const [error, setError] = useState<string | null>(null)
  
  // Create Modal State
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [meetingType, setMeetingType] = useState<'quick' | 'scheduled'>('quick')
  
  const [form, setForm] = useState({
    title: '',
    scheduled_at: '',
    is_permanent: false,
  })
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [meetingsRes, usersRes] = await Promise.all([
        meetingsAPI.getMeetings(),
        fetch(`${BACKEND_URL}/api/v1/users`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        }).then(r => r.json()),
      ])
      const fetchedMeetings = meetingsRes.data.meetings
      const fetchedEmployees = (usersRes.data?.users || []).filter((u: any) => u.role === 'employee')
      setMeetings(fetchedMeetings)
      setEmployees(fetchedEmployees)
      
      // Update prefetch store
      usePrefetchStore.setState({
        meetings: fetchedMeetings,
        employees: fetchedEmployees,
        status: {
          ...usePrefetchStore.getState().status,
          meetings: 'done',
          employees: 'done',
        }
      })
    } catch (err: any) {
      if (!silent) setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Sync state if prefetch store updates externally
  useEffect(() => {
    if (storeMeetings) {
      setMeetings(storeMeetings)
    }
  }, [storeMeetings])

  useEffect(() => {
    if (storeEmployees) {
      setEmployees(storeEmployees)
    }
  }, [storeEmployees])

  useEffect(() => {
    const hasData = storeMeetings && storeMeetings.length > 0
    fetchData(hasData)
  }, [fetchData])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await meetingsAPI.createMeeting({
        title:        form.title,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        is_permanent: form.is_permanent,
        assigned_to:  selectedEmployees,
      })
      const newMeeting = res.data.meeting
      setMeetings((prev) => [newMeeting, ...prev])
      usePrefetchStore.setState({
        meetings: [newMeeting, ...usePrefetchStore.getState().meetings]
      })
      setShowModal(false)
      setForm({ title: '', scheduled_at: '', is_permanent: false })
      setMeetingType('quick')
      setSelectedEmployees([])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this meeting?')) return
    try {
      setMeetings((prev) => prev.filter((m) => m.id !== id))
      usePrefetchStore.setState({
        meetings: usePrefetchStore.getState().meetings.filter((m: any) => m.id !== id)
      })
      await meetingsAPI.deleteMeeting(id)
      fetchData(true)
    } catch (err: any) {
      setError(err.message)
      fetchData(true)
    }
  }

  // Filter meetings
  const permanentMeetings = meetings.filter((m) => m.is_permanent)
  const scheduledMeetings = meetings.filter((m) => !m.is_permanent && m.scheduled_at)
  const quickMeetings     = meetings.filter((m) => !m.is_permanent && !m.scheduled_at)

  // ── Render Dashboard ──
  return (
    <PageWrapper
      title="Conference Rooms"
      subtitle="Start or join video conferences instantly"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(false)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-[#4A1F6F]/5 hover:text-[#4A1F6F] hover:border-[#4A1F6F]/20 disabled:opacity-50 transition-all cursor-pointer font-semibold text-gray-700"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-[#4A1F6F] to-[#3B1859] text-white rounded-lg hover:opacity-95 transition-all font-semibold shadow-sm shadow-[#4A1F6F]/10 cursor-pointer"
          >
            <Plus size={16} /> New Meeting
          </button>
        </div>
      }
    >
      {/* Alert banner if active call is floating/minimized */}
      {activeMeeting && isMinimized && (
        <div className="mb-6 bg-[#4A1F6F]/5 border border-[#4A1F6F]/10 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Video className="text-[#4A1F6F] animate-pulse" size={20} />
            <div>
              <p className="text-sm font-semibold text-[#4A1F6F]">You are in an active meeting</p>
              <p className="text-xs text-[#4A1F6F]/80 mt-0.5">"{activeMeeting.title}" is currently minimized. You can navigate the CRM freely.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(false)}
              className="px-3 py-1.5 bg-[#4A1F6F] hover:bg-[#3B1859] text-white text-xs font-semibold rounded-lg transition-all"
            >
              Open Fullscreen
            </button>
            <button
              onClick={leaveMeeting}
              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-lg transition-all"
            >
              Hang Up
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
          <AlertTriangle size={14} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14}/></button>
        </div>
      )}

      {/* Grid: Permanent daily standup at the top */}
      {permanentMeetings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase text-[#4A1F6F] tracking-wider mb-4">Daily Standup Meetings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {permanentMeetings.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => joinMeeting(meeting.id, meeting.room_name, meeting.title, user?.role === 'admin')}
                className="group relative cursor-pointer bg-gradient-to-br from-[#2D0F47] to-[#1E0533] border border-[#3B1859]/30 hover:border-[#D9A441] rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Background decorative gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#4A1F6F]/10 to-[#D9A441]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#D9A441]/10 border border-[#D9A441]/20 rounded-full text-xs font-medium text-[#D9A441]">
                      <Users size={12} /> Daily Standup
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-[#D9A441] transition-colors">
                      {meeting.title}
                    </h3>
                    {meeting.assignments && meeting.assignments.length > 0 && (
                      <p className="text-xs text-slate-350">
                        Assigned members: {meeting.assignments.map(a => a.assignee?.name).join(', ')}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {user?.role === 'admin' && (
                      <button
                        onClick={(e) => handleDelete(e, meeting.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-[#4A1F6F]/20 rounded-lg transition-all"
                        title="Delete daily meeting"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <div className="w-12 h-12 rounded-xl bg-[#D9A441]/10 border border-[#D9A441]/20 flex items-center justify-center text-[#D9A441] group-hover:bg-[#4A1F6F] group-hover:text-white transition-all">
                      <Video size={20} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Meetings */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-4">Scheduled Meetings</h2>
        
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-[#4A1F6F]/40" />
            Loading rooms…
          </div>
        ) : scheduledMeetings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
            <Calendar size={28} className="mx-auto text-[#4A1F6F]/30 mb-2" />
            <p className="text-sm font-medium">No scheduled meetings</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduledMeetings.map((meeting) => {
              const isHost = user?.role === 'admin' || user?.id === meeting.created_by
              const isStarted = !!meeting.started_at
              const canJoin = isHost || isStarted

              const handleJoinClick = async (e: React.MouseEvent) => {
                e.stopPropagation()
                if (!canJoin) return

                if (isHost && !isStarted) {
                  try {
                    const startedRes = await meetingsAPI.startMeeting(meeting.id)
                    meeting.started_at = startedRes.data.meeting.started_at
                  } catch (err: any) {
                    setError(err.message)
                    return
                  }
                }

                joinMeeting(meeting.id, meeting.room_name, meeting.title, isHost)
              }

              return (
                <div
                  key={meeting.id}
                  onClick={handleJoinClick}
                  className={`bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md rounded-2xl p-5 transition flex flex-col justify-between gap-4 ${
                    canJoin ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-gray-900 truncate max-w-[200px]">{meeting.title}</h3>
                      <div className="flex gap-1.5">
                        {(user?.role === 'admin' || user?.id === meeting.created_by) && (
                          <button
                            onClick={(e) => handleDelete(e, meeting.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete room"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-xs text-[#D9A441] font-semibold flex items-center gap-1 mt-1.5">
                      <Clock size={12} />
                      {new Date(meeting.scheduled_at!).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>

                    {meeting.assignments && meeting.assignments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">Assigned:</span>
                        {meeting.assignments.map(a => (
                          <span key={a.id} className="text-[10px] bg-[#4A1F6F]/5 text-[#4A1F6F] border border-[#4A1F6F]/10 px-1.5 py-0.5 rounded-full font-medium">
                            {a.assignee?.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400">
                    <span>Created by {meeting.creator?.name || 'User'}</span>
                    {isStarted ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold hover:text-emerald-700">
                        Join Call <Video size={12} />
                      </span>
                    ) : isHost ? (
                      <span className="flex items-center gap-1 text-[#4A1F6F] font-bold hover:text-[#3B1859]">
                        Start Meeting <Video size={12} />
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#D9A441] font-semibold animate-pulse">
                        Waiting for Host… <Clock size={12} />
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Meetings */}
      <div>
        <h2 className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-4">Quick Meetings</h2>
        
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-[#4A1F6F]/40" />
            Loading rooms…
          </div>
        ) : quickMeetings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
            <Video size={28} className="mx-auto text-[#4A1F6F]/30 mb-2" />
            <p className="text-sm font-medium">No active quick meetings</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickMeetings.map((meeting) => {
              const isHost = user?.role === 'admin' || user?.id === meeting.created_by
              const isStarted = !!meeting.started_at
              const canJoin = isHost || isStarted

              const handleJoinClick = async (e: React.MouseEvent) => {
                e.stopPropagation()
                if (!canJoin) return

                if (isHost && !isStarted) {
                  try {
                    const startedRes = await meetingsAPI.startMeeting(meeting.id)
                    meeting.started_at = startedRes.data.meeting.started_at
                  } catch (err: any) {
                    setError(err.message)
                    return
                  }
                }

                joinMeeting(meeting.id, meeting.room_name, meeting.title, isHost)
              }

              return (
                <div
                  key={meeting.id}
                  onClick={handleJoinClick}
                  className={`bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md rounded-2xl p-5 transition flex flex-col justify-between gap-4 ${
                    canJoin ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-gray-900 truncate max-w-[200px]">{meeting.title}</h3>
                      <div className="flex gap-1.5">
                        {(user?.role === 'admin' || user?.id === meeting.created_by) && (
                          <button
                            onClick={(e) => handleDelete(e, meeting.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete room"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1.5">
                      <Video size={12} />
                      Quick Meeting (Start Now)
                    </p>

                    {meeting.assignments && meeting.assignments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">Assigned:</span>
                        {meeting.assignments.map(a => (
                          <span key={a.id} className="text-[10px] bg-[#4A1F6F]/5 text-[#4A1F6F] border border-[#4A1F6F]/10 px-1.5 py-0.5 rounded-full font-medium">
                            {a.assignee?.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400">
                    <span>Created by {meeting.creator?.name || 'User'}</span>
                    {isStarted ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold hover:text-emerald-700">
                        Join Call <Video size={12} />
                      </span>
                    ) : isHost ? (
                      <span className="flex items-center gap-1 text-[#4A1F6F] font-bold hover:text-[#3B1859]">
                        Start Meeting <Video size={12} />
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#D9A441] font-semibold animate-pulse">
                        Waiting for Host… <Clock size={12} />
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Create Meeting Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="font-bold text-gray-900">Create Meeting</h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setForm({ title: '', scheduled_at: '', is_permanent: false })
                  setSelectedEmployees([])
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Meeting Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Weekly Design Sync"
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4A1F6F]/10 focus:border-[#4A1F6F] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Meeting Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMeetingType('quick')
                      setForm(p => ({ ...p, scheduled_at: '' }))
                    }}
                    className={`py-2 px-3 rounded-lg border text-sm font-semibold text-center transition-all ${
                      meetingType === 'quick'
                        ? 'bg-[#4A1F6F] border-[#4A1F6F] text-white font-bold'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Quick Meeting
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMeetingType('scheduled')
                    }}
                    className={`py-2 px-3 rounded-lg border text-sm font-semibold text-center transition-all ${
                      meetingType === 'scheduled'
                        ? 'bg-[#4A1F6F] border-[#4A1F6F] text-white font-bold'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Scheduled Meeting
                  </button>
                </div>
              </div>

              {meetingType === 'scheduled' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Scheduled Time *</label>
                  <input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4A1F6F]/10 focus:border-[#4A1F6F] outline-none transition-all"
                  />
                </div>
              )}

              {/* Multi-employee selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Assign Members <span className="text-gray-400 font-normal">(They will receive a join alert pop-up)</span>
                </label>
                <EmployeeMultiSelect
                  employees={employees}
                  selected={selectedEmployees}
                  onChange={setSelectedEmployees}
                />
              </div>

              {/* Admin Only Option: Permanent Standup */}
              {user?.role === 'admin' && (
                <label className="flex items-center gap-2.5 cursor-pointer py-1.5 select-none">
                  <input
                    type="checkbox"
                    checked={form.is_permanent}
                    onChange={(e) => setForm((p) => ({ ...p, is_permanent: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-[#4A1F6F] focus:ring-[#4A1F6F] accent-[#4A1F6F]"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-gray-900">Make Daily Recurring Standup</p>
                    <p className="text-gray-400 font-normal">Created room will be permanently available in everyone's dashboard.</p>
                  </div>
                </label>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setForm({ title: '', scheduled_at: '', is_permanent: false })
                    setSelectedEmployees([])
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.title.trim()}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#4A1F6F] to-[#3B1859] text-white rounded-xl hover:opacity-95 text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-[#4A1F6F]/10 cursor-pointer"
                >
                  {submitting ? (
                    <><RefreshCw size={14} className="animate-spin" />Creating…</>
                  ) : (
                    <>Start Call</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}

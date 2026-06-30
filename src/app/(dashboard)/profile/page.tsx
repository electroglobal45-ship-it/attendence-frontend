'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { PageWrapper } from '@/components/layout/PageWrapper'
import {
  User, Mail, Briefcase, Tag, IndianRupee, Clock, Calendar,
  CheckCircle2, XCircle, CalendarDays, Edit3, Save, X, Loader2,
  ChevronLeft, ChevronRight, TrendingUp, Phone, CreditCard, Shield
} from 'lucide-react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_COLORS: Record<string, { bg: string; dot: string; label: string }> = {
  present:             { bg: 'bg-green-100',  dot: 'bg-green-500',  label: 'Present' },
  late_within_buffer:  { bg: 'bg-yellow-100', dot: 'bg-yellow-500', label: 'Late' },
  half_day:            { bg: 'bg-orange-100', dot: 'bg-orange-500', label: 'Half Day' },
  approved_short_leave:{ bg: 'bg-blue-100',   dot: 'bg-blue-500',   label: 'Short Leave' },
  leave:               { bg: 'bg-purple-100', dot: 'bg-purple-500', label: 'Leave' },
  leave_pending:       { bg: 'bg-purple-50',  dot: 'bg-purple-300', label: 'Leave (Pending)' },
  absent:              { bg: 'bg-red-100',    dot: 'bg-red-500',    label: 'Absent' },
  holiday:             { bg: 'bg-gray-100',   dot: 'bg-gray-400',   label: 'Holiday' },
  sunday:              { bg: 'bg-slate-50',   dot: 'bg-slate-300',  label: 'Sunday' },
  future:              { bg: 'bg-white',      dot: 'bg-transparent',label: '' },
}

function getInitials(name: string) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function formatTime(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
}

function computeWorkingHours(checkIn: string | null, checkOut: string | null) {
  if (!checkIn) return null
  const inTime = new Date(checkIn)
  const outTime = checkOut ? new Date(checkOut) : new Date()
  const diffMs = outTime.getTime() - inTime.getTime()
  if (diffMs < 0) return null
  const hrs = Math.floor(diffMs / 3600000)
  const mins = Math.floor((diffMs % 3600000) / 60000)
  return `${hrs}h ${mins}m`
}

// Module-level cache for instant loads
let cachedProfile: any = null
let cachedTodayRecord: any = null
let cachedCalData: Record<string, any> = {}

export default function ProfilePage() {
  const { user } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const [profile, setProfile] = useState<any>(cachedProfile)
  const [todayRecord, setTodayRecord] = useState<any>(cachedTodayRecord)
  const [calData, setCalData] = useState<any>(cachedCalData[`${now.getMonth() + 1}-${now.getFullYear()}`] || null)
  const [loading, setLoading] = useState(!cachedProfile)

  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [editForm, setEditForm] = useState({
    first_name: cachedProfile?.name?.split(' ')[0] || '',
    last_name: cachedProfile?.name?.split(' ').slice(1).join(' ') || '',
    email: cachedProfile?.email || '',
    phone: cachedProfile?.phone || '',
    aadhar_card: cachedProfile?.aadhar_card || '',
    pan_card: cachedProfile?.pan_card || '',
  })

  // Live working hours clock
  const [liveHours, setLiveHours] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch(`${BACKEND_URL}/api/v1/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const d = await res.json()
      const p = d.data?.user || d.data || d
      cachedProfile = p
      setProfile(p)
      const nameParts = (p.name || '').split(' ')
      setEditForm({
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        email: p.email || '',
        phone: p.phone || '',
        aadhar_card: p.aadhar_card || '',
        pan_card: p.pan_card || '',
      })
    } catch (e) {
      console.error('Profile fetch failed', e)
    }
  }, [user?.id])

  const fetchTodayAttendance = useCallback(async () => {
    if (!user?.id) return
    try {
      const token = localStorage.getItem('authToken')
      const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      const res = await fetch(`${BACKEND_URL}/api/v1/attendance/history?start=${todayIST}&end=${todayIST}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const d = await res.json()
      const records = d.data?.records || d.data?.history || d.records || []
      cachedTodayRecord = records[0] || null
      setTodayRecord(records[0] || null)
    } catch (e) { /* silent */ }
  }, [user?.id])

  const fetchCalendar = useCallback(async (m: number, y: number) => {
    if (!user?.id) return
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch(`/api/calendar?month=${m}&year=${y}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const d = await res.json()
      cachedCalData[`${m}-${y}`] = d
      setCalData(d)
    } catch (e) { /* silent */ }
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    const forceLoad = !cachedProfile
    if (forceLoad) {
      setLoading(true)
    }
    Promise.all([fetchProfile(), fetchTodayAttendance(), fetchCalendar(month, year)])
      .finally(() => setLoading(false))
  }, [user])

  // Live clock for working hours
  useEffect(() => {
    if (!todayRecord?.check_in) { setLiveHours(null); return }
    const update = () => setLiveHours(computeWorkingHours(todayRecord.check_in, todayRecord.check_out || null))
    update()
    if (!todayRecord.check_out) {
      const interval = setInterval(update, 60000)
      return () => clearInterval(interval)
    }
  }, [todayRecord])

  const prevMonth = () => {
    const m = month === 1 ? 12 : month - 1
    const y = month === 1 ? year - 1 : year
    setMonth(m); setYear(y); fetchCalendar(m, y)
  }
  const nextMonth = () => {
    const m = month === 12 ? 1 : month + 1
    const y = month === 12 ? year + 1 : year
    setMonth(m); setYear(y); fetchCalendar(m, y)
  }

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    setSaveError(null)
    try {
      const token = localStorage.getItem('authToken')
      const fullName = `${editForm.first_name.trim()} ${editForm.last_name.trim()}`.trim()
      const res = await fetch(`${BACKEND_URL}/api/v1/users/${user.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email: editForm.email,
          phone: editForm.phone || null,
          aadhar_card: editForm.aadhar_card || null,
          pan_card: editForm.pan_card || null,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.message || 'Failed to save')
      setSaveSuccess(true)
      setIsEditing(false)
      await fetchProfile()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const s = calData?.summary
  const calDays: any[] = calData?.days || []
  const firstDow = calDays[0]?.dayOfWeek ?? 0
  const cells = [...Array(firstDow).fill(null), ...calDays]

  const isActive = profile?.is_active !== false
  const displayName = profile?.name || user?.name || 'User'
  const role = profile?.role || user?.role || 'employee'

  if (loading) {
    return (
      <PageWrapper title="My Profile">
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-[#4A1F6F]" />
            <p className="text-sm text-gray-500 font-medium">Loading your profile...</p>
          </div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper title="My Profile">
      <div className="max-w-4xl mx-auto space-y-4 pb-8 px-2 sm:px-0">

        {/* ── Profile Header Card ── */}
        <div className="rounded-2xl overflow-hidden shadow-sm"
          style={{ background: 'linear-gradient(135deg, #1E0A2E 0%, #2D1152 100%)' }}>
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left w-full sm:w-auto">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center text-xl sm:text-2xl font-black text-white shadow-md border-2 border-white/10"
                    style={{ background: 'linear-gradient(135deg, #4A1F6F, #D9A441)' }}>
                    {getInitials(displayName)}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full border-2 border-[#1E0A2E] shadow ${isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>

                {/* Name + Role + Status */}
                <div className="min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-center sm:justify-start gap-1 sm:gap-2 mb-1">
                    <h1 className="text-white text-lg sm:text-xl font-extrabold truncate">{displayName}</h1>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border self-center ${isActive ? 'bg-green-400/20 text-green-300 border-green-400/30' : 'bg-red-400/20 text-red-300 border-red-400/30'}`}>
                      {isActive ? 'Active' : 'Left'}
                    </span>
                  </div>
                  <p className="text-purple-200/80 text-xs font-semibold capitalize mb-1">{role}</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    {profile?.department && (
                      <span className="flex items-center gap-1 text-purple-200/70 text-[11px]">
                        <Briefcase size={11} />{profile.department}
                      </span>
                    )}
                    {profile?.joining_date && (
                      <span className="flex items-center gap-1 text-purple-200/70 text-[11px]">
                        <CalendarDays size={11} />Joined {new Date(profile.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit Toggle */}
              <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-end">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl text-xs font-bold transition cursor-pointer w-full sm:w-auto"
                  >
                    <Edit3 size={13} /> Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2 w-full sm:w-auto justify-center">
                    <button
                      onClick={() => { setIsEditing(false); setSaveError(null) }}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl text-xs font-bold transition cursor-pointer flex-1 sm:flex-initial"
                    >
                      <X size={13} /> Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center justify-center gap-1 px-4 py-2 bg-[#D9A441] hover:bg-[#C49035] text-white rounded-xl text-xs font-black transition disabled:opacity-60 cursor-pointer flex-1 sm:flex-initial"
                    >
                      {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Success/Error alerts */}
            {saveSuccess && (
              <div className="mt-4 flex items-center gap-2 bg-green-400/20 border border-green-400/30 text-green-300 px-4 py-2.5 rounded-xl text-sm font-semibold">
                <CheckCircle2 size={16} /> Profile updated successfully!
              </div>
            )}
            {saveError && (
              <div className="mt-4 flex items-center gap-2 bg-red-400/20 border border-red-400/30 text-red-300 px-4 py-2.5 rounded-xl text-sm font-semibold">
                <XCircle size={16} /> {saveError}
              </div>
            )}
          </div>
        </div>

        {/* ── Two Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* LEFT: Personal Info */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <User size={14} className="text-[#4A1F6F]" /> Personal Info
              </h2>
              <div className="space-y-2">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wide">First Name</label>
                        <input
                          value={editForm.first_name}
                          onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))}
                          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#4A1F6F] focus:ring-1 focus:ring-[#4A1F6F]/10 transition"
                          placeholder="First name"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wide">Last Name</label>
                        <input
                          value={editForm.last_name}
                          onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))}
                          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#4A1F6F] focus:ring-1 focus:ring-[#4A1F6F]/10 transition"
                          placeholder="Last name"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wide">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#4A1F6F] focus:ring-1 focus:ring-[#4A1F6F]/10 transition"
                        placeholder="Email address"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wide">Phone / Mobile</label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                        className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#4A1F6F] focus:ring-1 focus:ring-[#4A1F6F]/10 transition"
                        placeholder="Mobile number"
                        maxLength={10}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wide">Aadhar Card</label>
                        <input
                          value={editForm.aadhar_card}
                          onChange={e => setEditForm(p => ({ ...p, aadhar_card: e.target.value }))}
                          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#4A1F6F] focus:ring-1 focus:ring-[#4A1F6F]/10 transition"
                          placeholder="XXXX XXXX XXXX"
                          maxLength={14}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wide">PAN Card</label>
                        <input
                          value={editForm.pan_card}
                          onChange={e => setEditForm(p => ({ ...p, pan_card: e.target.value.toUpperCase() }))}
                          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#4A1F6F] focus:ring-1 focus:ring-[#4A1F6F]/10 transition"
                          placeholder="ABCDE1234F"
                          maxLength={10}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {[
                      { label: 'Full Name',   value: displayName,                           icon: <User size={13} className="text-[#4A1F6F]" /> },
                      { label: 'Email',       value: profile?.email || user?.email,          icon: <Mail size={13} className="text-[#4A1F6F]" /> },
                      { label: 'Phone',       value: profile?.phone,                         icon: <Phone size={13} className="text-[#4A1F6F]" /> },
                      { label: 'Aadhar Card', value: profile?.aadhar_card ? `XXXX XXXX ${profile.aadhar_card.slice(-4)}` : null, icon: <CreditCard size={13} className="text-[#4A1F6F]" /> },
                      { label: 'PAN Card',    value: profile?.pan_card,                     icon: <Shield size={13} className="text-[#4A1F6F]" /> },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                        <div className="flex-shrink-0">{item.icon}</div>
                        <div className="min-w-0 flex-1 flex items-center justify-between">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mr-2">{item.label}</p>
                          <p className="text-xs font-semibold text-gray-800 truncate">{item.value || '—'}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Work Details */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Briefcase size={14} className="text-[#4A1F6F]" /> Work Details
              </h2>
              <div className="space-y-2">
                {[
                  { label: 'Designation', value: profile?.designation || profile?.department || '—', icon: <Briefcase size={13} /> },
                  { label: 'Category', value: profile?.category || '—', icon: <Tag size={13} /> },
                  { label: 'Monthly Salary', value: profile?.monthly_salary ? `₹${Number(profile.monthly_salary).toLocaleString('en-IN')}` : '—', icon: <IndianRupee size={13} /> },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                    <div className="text-[#4A1F6F] flex-shrink-0">{item.icon}</div>
                    <div className="min-w-0 flex-1 flex items-center justify-between">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mr-2">{item.label}</p>
                      <p className="text-xs font-bold text-gray-800 capitalize">{item.value}</p>
                    </div>
                    <span className="text-[9px] text-gray-300 font-semibold ml-2">read-only</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Today's Working Hours ── */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 sm:p-6">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock size={16} className="text-[#4A1F6F]" /> Today's Working Hours
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl text-center"
              style={{ background: 'rgba(74,31,111,0.06)', border: '1px solid rgba(74,31,111,0.12)' }}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Check In</p>
              <p className="text-lg font-black text-[#4A1F6F]">{formatTime(todayRecord?.check_in)}</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl text-center"
              style={{ background: liveHours ? 'rgba(34,197,94,0.08)' : 'rgba(156,163,175,0.06)', border: liveHours ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(156,163,175,0.12)' }}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                {todayRecord?.check_out ? 'Total Hours' : 'Hours So Far'}
              </p>
              <p className={`text-xl font-black ${liveHours ? 'text-green-600' : 'text-gray-400'}`}>
                {liveHours || '—'}
              </p>
              {!todayRecord?.check_out && liveHours && (
                <span className="text-[9px] text-green-500 font-semibold mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live
                </span>
              )}
            </div>
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl text-center"
              style={{ background: 'rgba(74,31,111,0.06)', border: '1px solid rgba(74,31,111,0.12)' }}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Check Out</p>
              <p className="text-lg font-black text-[#4A1F6F]">{formatTime(todayRecord?.check_out)}</p>
            </div>
          </div>
        </div>

        {/* ── Monthly Stats + Calendar ── */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 sm:p-6">
          {/* Header with month navigation */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={16} className="text-[#4A1F6F]" /> Attendance Calendar
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition cursor-pointer" title="Previous Month">
                <ChevronLeft size={16} />
              </button>
              <span className="font-bold text-xs px-2 text-gray-700 min-w-[90px] text-center">
                {MONTHS[month - 1]} {year}
              </span>
              <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition cursor-pointer" title="Next Month">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Monthly Summary Stats */}
          {s && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Present', value: s.presentDays ?? 0, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100', dot: 'bg-green-500' },
                { label: 'Absent',  value: s.absentDays  ?? 0, color: 'text-red-700',   bg: 'bg-red-50',   border: 'border-red-100',   dot: 'bg-red-500' },
                { label: 'Leaves',  value: s.leaveDays   ?? 0, color: 'text-purple-700',bg: 'bg-purple-50',border: 'border-purple-100',dot: 'bg-purple-500' },
                { label: 'Half Days',value: s.halfDays   ?? 0, color: 'text-orange-700',bg: 'bg-orange-50',border: 'border-orange-100',dot: 'bg-orange-500' },
              ].map(stat => (
                <div key={stat.label} className={`flex flex-col items-center p-3 rounded-xl border ${stat.bg} ${stat.border}`}>
                  <div className={`w-2 h-2 rounded-full ${stat.dot} mb-1.5`} />
                  <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] font-bold text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Calendar Grid */}
          <div>
            {/* Day header */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1 uppercase tracking-wide">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell, idx) => {
                if (!cell) return <div key={`empty-${idx}`} />
                const st = STATUS_COLORS[cell.status] || STATUS_COLORS.future
                const isToday = cell.date === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
                return (
                  <div
                    key={cell.date}
                    title={`${cell.date} - ${st.label}`}
                    className={`relative flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-lg min-h-[36px] sm:min-h-[44px] transition-all ${st.bg} ${
                      isToday ? 'ring-2 ring-[#4A1F6F] ring-offset-1' : ''
                    } ${cell.status !== 'future' ? 'cursor-default' : ''}`}
                  >
                    <span className={`text-[10px] sm:text-xs font-bold leading-tight ${
                      cell.status === 'absent' ? 'text-red-700' :
                      cell.status === 'present' ? 'text-green-700' :
                      cell.status === 'leave' ? 'text-purple-700' :
                      cell.status === 'holiday' ? 'text-gray-600' :
                      cell.status === 'sunday' ? 'text-slate-400' :
                      cell.status === 'future' ? 'text-gray-300' :
                      'text-gray-600'
                    }`}>
                      {new Date(cell.date + 'T00:00:00').getDate()}
                    </span>
                    {cell.status !== 'future' && cell.status !== 'sunday' && (
                      <div className={`w-1 h-1 rounded-full mt-0.5 ${st.dot}`} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-gray-100">
              {[
                { label: 'Present', dot: 'bg-green-500' },
                { label: 'Absent',  dot: 'bg-red-500' },
                { label: 'Leave',   dot: 'bg-purple-500' },
                { label: 'Holiday', dot: 'bg-gray-400' },
                { label: 'Late',    dot: 'bg-yellow-500' },
                { label: 'Half Day',dot: 'bg-orange-500' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${l.dot}`} />
                  <span className="text-[10px] text-gray-500 font-semibold">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Attendance Value ── */}
        {s?.totalAttendanceValue !== undefined && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2 mb-1">
                  <TrendingUp size={16} className="text-[#4A1F6F]" /> Attendance Score
                </h2>
                <p className="text-xs text-gray-500">{MONTHS[month - 1]} {year} — out of {s.workingDays} working days</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-[#4A1F6F]">{Number(s.totalAttendanceValue).toFixed(1)}</p>
                <p className="text-xs text-gray-400 font-semibold">attendance value</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageWrapper>
  )
}

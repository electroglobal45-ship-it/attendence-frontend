'use client'

import { useState, useEffect } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { leavesAPI } from '@/lib/tasks-api'
import { usePrefetchStore } from '@/lib/store/prefetch-store'
import { CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, Send } from 'lucide-react'

// ─── Schemas ──────────────────────────────────────────────────────────────────
const leaveSchema = z.object({
  leaveType: z.enum(['full_day', 'half_day', 'sick', 'casual', 'earned', 'personal']),
  startDate: z.string().min(1, 'Start date required'),
  endDate:   z.string().min(1, 'End date required'),
  reason:    z.string().min(5, 'Please provide a reason (min 5 characters)'),
})
type LeaveForm = z.infer<typeof leaveSchema>

const shortLeaveSchema = z.object({
  type:   z.enum(['morning', 'evening']),
  reason: z.string().min(3, 'Please provide a reason'),
})
type ShortLeaveForm = z.infer<typeof shortLeaveSchema>

// ─── Theme ────────────────────────────────────────────────────────────────────
const PURPLE      = '#4A1F6F'
const PURPLE_DARK = '#2D0F47'
const GOLD        = '#D9A441'
const P06  = 'rgba(74,31,111,0.06)'
const P10  = 'rgba(74,31,111,0.10)'
const P15  = 'rgba(74,31,111,0.15)'
const grad = `linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_DARK} 100%)`
const gradHover = `linear-gradient(135deg, ${PURPLE_DARK} 0%, #1a0930 100%)`

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { bg: string; color: string; dot: string; icon: React.ReactNode }> = {
    pending:  { bg: 'rgba(217,164,65,0.12)',  color: '#92650a', dot: GOLD,      icon: <AlertCircle size={11} /> },
    approved: { bg: 'rgba(34,197,94,0.12)',   color: '#15803D', dot: '#22C55E', icon: <CheckCircle2 size={11} /> },
    rejected: { bg: 'rgba(239,68,68,0.12)',   color: '#B91C1C', dot: '#EF4444', icon: <XCircle size={11} /> },
  }
  const c = cfg[status] || { bg: P06, color: PURPLE, dot: PURPLE, icon: null }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: c.bg, color: c.color, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
      {c.icon}{status}
    </span>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────
const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>{label}</label>
    {children}
    {error && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>{error}</p>}
  </div>
)

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: `1.5px solid #E5E7EB`, borderRadius: 10, fontSize: 13,
  color: '#111827', background: '#FAFAFA', outline: 'none', transition: 'border-color 0.15s', fontFamily: 'inherit',
  boxSizing: 'border-box',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LeavesPage() {
  const [tab, setTab] = useState<'leave' | 'short'>('leave')
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  const { leaves, shortLeaves, addLeave, addShortLeave, status, isPrefetched, prefetchAll } = usePrefetchStore()

  useEffect(() => {
    if (!isPrefetched && status.leaves === 'idle') prefetchAll()
  }, [isPrefetched, status.leaves, prefetchAll])

  const { register: regLeave, handleSubmit: handleLeave, reset: resetLeave, formState: { errors: leaveErrors } } =
    useForm<LeaveForm>({ resolver: zodResolver(leaveSchema) })

  const { register: regShort, handleSubmit: handleShort, reset: resetShort, formState: { errors: shortErrors } } =
    useForm<ShortLeaveForm>({ resolver: zodResolver(shortLeaveSchema) })

  const onLeaveSubmit = async (data: LeaveForm) => {
    setLoading(true); setError(null); setSuccess(null)
    try {
      const res = await leavesAPI.applyLeave({ type: data.leaveType, start_date: data.startDate, end_date: data.endDate, reason: data.reason })
      setSuccess('Leave applied successfully!')
      resetLeave()
      addLeave(res.data.leave)
    } catch (err: any) { setError(err.message || 'Failed to apply leave') }
    finally { setLoading(false) }
  }

  const onShortLeaveSubmit = async (data: ShortLeaveForm) => {
    setLoading(true); setError(null); setSuccess(null)
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await leavesAPI.requestShortLeave({ date: today, short_leave_type: data.type, reason: data.reason })
      setSuccess('Short leave applied successfully!')
      resetShort()
      addShortLeave(res.data.leave)
    } catch (err: any) { setError(err.message || 'Failed to apply short leave') }
    finally { setLoading(false) }
  }

  const focusInput = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = PURPLE
    e.currentTarget.style.background = '#fff'
    e.currentTarget.style.boxShadow = `0 0 0 3px ${P10}`
  }
  const blurInput = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = '#E5E7EB'
    e.currentTarget.style.background = '#FAFAFA'
    e.currentTarget.style.boxShadow = 'none'
  }

  const LEAVE_TYPE_LABELS: Record<string, string> = {
    full_day: 'Full Day', half_day: 'Half Day', sick: 'Sick', casual: 'Casual', earned: 'Earned', personal: 'Personal',
  }

  return (
    <PageWrapper title="Leaves" subtitle="Apply and track your leave requests">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .leave-card { animation: fadeIn 0.2s ease; }
        .leave-tab { white-space: nowrap; transition: all 0.15s; }
        .leave-tab:hover { color: ${PURPLE}; }
        .leave-row:hover { background: ${P06}; }
      `}</style>

      <div style={{ maxWidth: 960, paddingBottom: 32 }}>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, background: '#F8F9FA', padding: 4, borderRadius: 12, border: '1px solid #E5E7EB', width: 'fit-content', marginBottom: 20 }}>
          {(['leave', 'short'] as const).map(t => {
            const active = tab === t
            return (
              <button key={t} className="leave-tab" onClick={() => { setTab(t); setSuccess(null); setError(null) }}
                style={{ padding: '7px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#fff' : '#6B7280', background: active ? grad : 'transparent', boxShadow: active ? `0 2px 8px ${PURPLE}30` : 'none' }}>
                {t === 'leave' ? 'Full / Half Day Leave' : 'Short Leave'}
              </button>
            )
          })}
        </div>

        {/* ── Alerts ── */}
        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 12, marginBottom: 16, fontSize: 13, color: '#15803D', fontWeight: 600 }}>
            <CheckCircle2 size={16} />{success}
          </div>
        )}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, marginBottom: 16, fontSize: 13, color: '#B91C1C', fontWeight: 600 }}>
            <XCircle size={16} />{error}
          </div>
        )}

        {/* ── Full / Half Day Leave ── */}
        {tab === 'leave' && (
          <div className="leave-card" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

              {/* Apply Card */}
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CalendarDays size={16} color="#fff" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Apply for Leave</h3>
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Submit a leave request</p>
                  </div>
                </div>

                <form onSubmit={handleLeave(onLeaveSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Field label="Leave Type" error={leaveErrors.leaveType?.message}>
                    <select {...regLeave('leaveType')} style={{ ...inputStyle }} onFocus={focusInput} onBlur={blurInput}>
                      <option value="full_day">Full Day Leave</option>
                      <option value="half_day">Half Day Leave</option>
                      <option value="sick">Sick Leave</option>
                      <option value="casual">Casual Leave</option>
                      <option value="earned">Earned Leave</option>
                      <option value="personal">Personal Leave</option>
                    </select>
                  </Field>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Field label="Start Date" error={leaveErrors.startDate?.message}>
                      <input type="date" {...regLeave('startDate')} style={{ ...inputStyle }} onFocus={focusInput} onBlur={blurInput} />
                    </Field>
                    <Field label="End Date" error={leaveErrors.endDate?.message}>
                      <input type="date" {...regLeave('endDate')} style={{ ...inputStyle }} onFocus={focusInput} onBlur={blurInput} />
                    </Field>
                  </div>

                  <Field label="Reason" error={leaveErrors.reason?.message}>
                    <textarea {...regLeave('reason')} rows={3} placeholder="Reason for leave…" style={{ ...inputStyle, resize: 'none' }} onFocus={focusInput} onBlur={blurInput} />
                  </Field>

                  <button type="submit" disabled={loading}
                    style={{ width: '100%', padding: '11px 0', background: loading ? '#9CA3AF' : grad, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', boxShadow: loading ? 'none' : `0 4px 12px ${PURPLE}35`, transition: 'all 0.15s' }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.background = gradHover }}
                    onMouseLeave={e => { if (!loading) e.currentTarget.style.background = grad }}>
                    {loading ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Applying…</> : <><Send size={14} /> Apply Leave</>}
                  </button>
                </form>
              </div>

              {/* Leave History Card */}
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', minWidth: 0 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', background: P06, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarDays size={15} color={PURPLE} />
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: PURPLE, margin: 0 }}>Leave History</h3>
                  {leaves.length > 0 && (
                    <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 20, background: P10, color: PURPLE, fontSize: 11, fontWeight: 700 }}>{leaves.length}</span>
                  )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#FAFAFA' }}>
                        {['Type', 'From', 'To', 'Days', 'Status', 'Sandwich'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap', borderBottom: '1px solid #F3F4F6' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leaves.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '48px 16px', color: '#9CA3AF', fontSize: 13 }}>
                            <CalendarDays size={32} style={{ margin: '0 auto 10px', color: '#D1D5DB', display: 'block' }} />
                            No leave requests yet
                          </td>
                        </tr>
                      ) : leaves.map(l => (
                        <tr key={l.id} className="leave-row" style={{ borderBottom: '1px solid #F9FAFB' }}>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <span style={{ padding: '3px 10px', borderRadius: 6, background: P06, color: PURPLE, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                              {LEAVE_TYPE_LABELS[l.type || l.leave_type] || l.type || l.leave_type}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#374151', whiteSpace: 'nowrap' }}>{l.start_date}</td>
                          <td style={{ padding: '12px 16px', color: '#374151', whiteSpace: 'nowrap' }}>{l.end_date}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{l.total_days ?? '—'}</td>
                          <td style={{ padding: '12px 16px' }}><StatusBadge status={l.status} /></td>
                          <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: 12, whiteSpace: 'nowrap' }}>
                            {l.is_sandwich_applied ? (
                              <span style={{ color: '#B91C1C', fontWeight: 600 }}>+{l.sandwich_days?.length ?? 0} days</span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── Short Leave ── */}
        {tab === 'short' && (
          <div className="leave-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

            {/* Apply Card */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={16} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Apply Short Leave</h3>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Max 2 hours. Applies for today.</p>
                </div>
              </div>

              {/* Info banner */}
              <div style={{ marginBottom: 18, padding: '10px 14px', background: P06, borderRadius: 10, border: `1px solid ${P15}`, fontSize: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: PURPLE_DARK }}>
                  <span><strong>Morning:</strong> Report by 11:05 AM IST</span>
                  <span><strong>Evening:</strong> Leave after 4:00 PM IST</span>
                  <span style={{ color: '#6B7280' }}>First 2/month = full attendance · Extra = 0.75 value</span>
                </div>
              </div>

              <form onSubmit={handleShort(onShortLeaveSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="Type" error={shortErrors.type?.message}>
                  <select {...regShort('type')} style={{ ...inputStyle }} onFocus={focusInput} onBlur={blurInput}>
                    <option value="morning">Morning (report by 11:05 AM)</option>
                    <option value="evening">Evening (leave after 4:00 PM)</option>
                  </select>
                </Field>
                <Field label="Reason" error={shortErrors.reason?.message}>
                  <textarea {...regShort('reason')} rows={3} placeholder="Reason for short leave…" style={{ ...inputStyle, resize: 'none' }} onFocus={focusInput} onBlur={blurInput} />
                </Field>
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '11px 0', background: loading ? '#9CA3AF' : grad, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', boxShadow: loading ? 'none' : `0 4px 12px ${PURPLE}35`, transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = gradHover }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.background = grad }}>
                  {loading ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Applying…</> : <><Send size={14} /> Apply Short Leave</>}
                </button>
              </form>
            </div>

            {/* Short Leave History Card */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', minWidth: 0 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', background: P06, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={15} color={PURPLE} />
                <h3 style={{ fontSize: 14, fontWeight: 700, color: PURPLE, margin: 0 }}>Short Leave History</h3>
                {shortLeaves.length > 0 && (
                  <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 20, background: P10, color: PURPLE, fontSize: 11, fontWeight: 700 }}>{shortLeaves.length}</span>
                )}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#FAFAFA' }}>
                      {['Date', 'Type', 'Reason', 'Att. Value', 'Status'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap', borderBottom: '1px solid #F3F4F6' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shortLeaves.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '48px 16px', color: '#9CA3AF', fontSize: 13 }}>
                          <Clock size={32} style={{ margin: '0 auto 10px', color: '#D1D5DB', display: 'block' }} />
                          No short leave requests yet
                        </td>
                      </tr>
                    ) : shortLeaves.map(sl => (
                      <tr key={sl.id} className="leave-row" style={{ borderBottom: '1px solid #F9FAFB' }}>
                        <td style={{ padding: '12px 16px', color: '#374151', whiteSpace: 'nowrap' }}>{sl.date}</td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 6, background: P06, color: PURPLE, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                            {sl.short_leave_type || sl.type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6B7280', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sl.reason || '—'}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{sl.attendance_value ?? '—'}</td>
                        <td style={{ padding: '12px 16px' }}><StatusBadge status={sl.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </PageWrapper>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { authedFetch } from '@/lib/backend-api'
import { useAuth } from '@/lib/auth-context'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { IndianRupee, TrendingDown, TrendingUp, Calendar, Loader2, Eye, CheckCircle2 } from 'lucide-react'
import { usePrefetchStore } from '@/lib/store/prefetch-store'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const PURPLE      = '#4A1F6F'
const PURPLE_DARK = '#2D0F47'
const P06  = 'rgba(74,31,111,0.06)'
const P10  = 'rgba(74,31,111,0.10)'
const P15  = 'rgba(74,31,111,0.15)'
const grad = `linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_DARK} 100%)`
const gradHover = `linear-gradient(135deg, ${PURPLE_DARK} 0%, #1a0930 100%)`

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13,
  color: '#111827', background: '#FAFAFA', outline: 'none', transition: 'all 0.15s', fontFamily: 'inherit', boxSizing: 'border-box',
}

export default function SalaryPage() {
  const { user } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())

  const storeSalary = usePrefetchStore((state) => state.salaryData)
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  const [salary, setSalary] = useState<any>(() => (isCurrentMonth && storeSalary) ? storeSalary : null)
  const [loading, setLoading] = useState(() => !(isCurrentMonth && storeSalary))
  const [error, setError] = useState<string | null>(null)

  const fetchSalary = async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await authedFetch('/api/salary/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to load salary')
        setSalary(null)
      } else {
        setSalary(data)
        if (isCurrentMonth) {
          usePrefetchStore.setState({ salaryData: data, status: { ...usePrefetchStore.getState().status, salary: 'done' } })
        }
      }
    } catch { setError('Failed to load salary') }
    finally { setLoading(false) }
  }

  useEffect(() => { if (isCurrentMonth && storeSalary) setSalary(storeSalary) }, [storeSalary, isCurrentMonth])
  useEffect(() => { if (user) { const hasData = isCurrentMonth && storeSalary; fetchSalary(hasData) } }, [user, month, year])

  const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

  const focusInput = (e: React.FocusEvent<HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = PURPLE
    e.currentTarget.style.background = '#fff'
    e.currentTarget.style.boxShadow = `0 0 0 3px ${P10}`
  }
  const blurInput = (e: React.FocusEvent<HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#E5E7EB'
    e.currentTarget.style.background = '#FAFAFA'
    e.currentTarget.style.boxShadow = 'none'
  }

  const Row = ({ label, value, bold, color, icon }: { label: React.ReactNode; value: string; bold?: boolean; color?: string; icon?: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #F3F4F6' }}>
      <span style={{ fontSize: 13, color: color || '#6B7280', display: 'flex', alignItems: 'center', gap: 6, fontWeight: bold ? 700 : 500 }}>{icon}{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 600, color: color || '#111827', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )

  const attItems = salary ? [
    { label: 'Present',      value: salary.breakdown?.presentDays,  bg: 'rgba(34,197,94,0.10)',   color: '#15803D' },
    { label: 'Half Days',    value: salary.breakdown?.halfDays,     bg: 'rgba(249,115,22,0.10)',  color: '#c2410c' },
    { label: 'Absent',       value: salary.breakdown?.absentDays,   bg: 'rgba(239,68,68,0.10)',   color: '#B91C1C' },
    { label: 'Late',         value: salary.breakdown?.lateDays,     bg: 'rgba(234,179,8,0.12)',   color: '#854d0e' },
    { label: 'Leaves',       value: salary.breakdown?.leaveDays,    bg: P10,                      color: PURPLE    },
    { label: 'Att. Value',   value: salary.total_attendance_value,  bg: 'rgba(59,130,246,0.10)',  color: '#1d4ed8' },
  ] : []

  return (
    <PageWrapper title="My Salary" subtitle="Monthly salary breakdown based on attendance">
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } } .sal-card { animation: fadeIn 0.22s ease; }`}</style>

      {/* Centered container */}
      <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 32 }}>

        {/* ── Month Selector Card ── */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={15} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Select Period</p>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Choose month and year to view salary</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Month</label>
              <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ ...inputStyle }} onFocus={focusInput} onBlur={blurInput}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Year</label>
              <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...inputStyle }} onFocus={focusInput} onBlur={blurInput}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={() => fetchSalary(false)} disabled={loading}
              style={{ padding: '10px 20px', background: loading ? '#9CA3AF' : grad, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', whiteSpace: 'nowrap', boxShadow: loading ? 'none' : `0 4px 12px ${PURPLE}35`, transition: 'all 0.15s', height: 42 }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = gradHover }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = grad }}>
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />Loading</> : <><Eye size={14} />View</>}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, fontSize: 13, color: '#B91C1C', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !salary && (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '32px', textAlign: 'center', color: '#9CA3AF', fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Loader2 size={28} style={{ margin: '0 auto 10px', display: 'block', color: PURPLE, animation: 'spin 0.8s linear infinite' }} />
            Loading salary data…
          </div>
        )}

        {salary && (
          <div className="sal-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ── Net Salary Hero ── */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              {/* Header gradient banner */}
              <div style={{ background: grad, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IndianRupee size={22} color="#fff" />
                </div>
                <div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '0 0 4px', fontWeight: 600, letterSpacing: '.3px', textTransform: 'uppercase' }}>
                    {MONTHS[month - 1]} {year} — Net Payable
                  </p>
                  <p style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-1px' }}>
                    {fmt(salary.net_salary)}
                  </p>
                </div>
                {salary.no_leave_bonus > 0 && (
                  <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '6px 12px', fontSize: 11, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                    <CheckCircle2 size={13} /> Bonus Eligible
                  </div>
                )}
              </div>

              {/* Breakdown rows */}
              <div style={{ padding: '4px 24px 16px' }}>
                <Row label="Monthly Salary (CTC)"   value={fmt(salary.monthly_salary)} />
                <Row label="Working Days in Month"  value={String(salary.working_days)} />
                <Row label="Per Day Salary"         value={fmt(salary.per_day_salary)} />
                <Row label="Total Attendance Value" value={`${salary.total_attendance_value} / ${salary.working_days}`} />
                <Row label="Payable Salary"         value={fmt(salary.payable_salary)} />
                {salary.deductions > 0 && (
                  <Row label="Deductions" value={`− ${fmt(salary.deductions)}`}
                    color="#B91C1C" icon={<TrendingDown size={14} />} />
                )}
                {salary.no_leave_bonus > 0 && (
                  <Row label="No-Leave Bonus (2 days)" value={`+ ${fmt(salary.no_leave_bonus)}`}
                    color="#15803D" icon={<TrendingUp size={14} />} />
                )}
                {/* Net total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0 0', marginTop: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>Net Salary</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#15803D' }}>{fmt(salary.net_salary)}</span>
                </div>
                {salary.no_leave_bonus > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 0' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#15803D' }}>Total with Bonus</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#15803D' }}>{fmt(salary.total_with_bonus)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Attendance Breakdown ── */}
            {salary.breakdown && (
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Calendar size={15} color={PURPLE} />
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: PURPLE, margin: 0 }}>Attendance Breakdown</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {attItems.map(item => (
                    <div key={item.label} style={{ background: item.bg, borderRadius: 12, padding: '14px 10px', textAlign: 'center' }}>
                      <p style={{ fontSize: 22, fontWeight: 800, color: item.color, margin: '0 0 4px' }}>{item.value ?? '—'}</p>
                      <p style={{ fontSize: 10, color: '#6B7280', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Policy Note ── */}
            <div style={{ background: P06, border: `1px solid ${P15}`, borderRadius: 14, padding: '14px 18px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: PURPLE, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.4px' }}>Salary Policy</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#374151' }}>
                <span><strong style={{ color: PURPLE_DARK }}>Formula:</strong> (Monthly Salary ÷ Working Days) × Total Attendance Value</span>
                <span><strong style={{ color: PURPLE_DARK }}>Values:</strong> Present = 1 · Late (within 4/month) = 1 · Half Day = 0.5 · Absent = 0</span>
                <span><strong style={{ color: PURPLE_DARK }}>No-Leave Bonus:</strong> 2 days salary if zero leaves taken (requires admin approval)</span>
              </div>
            </div>

          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </PageWrapper>
  )
}

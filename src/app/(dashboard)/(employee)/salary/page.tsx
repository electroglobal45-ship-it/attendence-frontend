'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { DollarSign, TrendingDown, TrendingUp, Calendar } from 'lucide-react'
import { usePrefetchStore } from '@/lib/store/prefetch-store'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function SalaryPage() {
  const { user } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())

  const storeSalary = usePrefetchStore((state) => state.salaryData)
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  const [salary, setSalary] = useState<any>(() => {
    if (isCurrentMonth && storeSalary) return storeSalary
    return null
  })
  const [loading, setLoading] = useState(() => {
    if (isCurrentMonth && storeSalary) return false
    return true
  })
  const [error, setError] = useState<string | null>(null)

  const fetchSalary = async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch('/api/salary/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ month, year }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to load salary')
        setSalary(null)
      } else {
        setSalary(data)
        if (isCurrentMonth) {
          usePrefetchStore.setState({
            salaryData: data,
            status: { ...usePrefetchStore.getState().status, salary: 'done' }
          })
        }
      }
    } catch {
      setError('Failed to load salary')
    } finally {
      setLoading(false)
    }
  }

  // Keep in sync with store changes
  useEffect(() => {
    if (isCurrentMonth && storeSalary) {
      setSalary(storeSalary)
    }
  }, [storeSalary, isCurrentMonth])

  useEffect(() => {
    if (user) {
      const hasData = isCurrentMonth && storeSalary
      fetchSalary(hasData)
    }
  }, [user, month, year])

  const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

  return (
    <PageWrapper title="My Salary" subtitle="Monthly salary breakdown based on attendance">
      <div className="max-w-2xl px-4 sm:px-0 space-y-4 sm:space-y-5 pb-6">

        {/* Month selector */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Month</label>
              <select value={month} onChange={e => setMonth(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black touch-manipulation">
                {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
              <select value={year} onChange={e => setYear(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black touch-manipulation">
                {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={() => fetchSalary(false)} disabled={loading}
              className="px-4 py-2.5 bg-black text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 touch-manipulation">
              {loading ? 'Loading...' : 'View'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
        )}

        {salary && (
          <>
            {/* Net salary hero */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <DollarSign size={20} className="text-green-600 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">{MONTHS[month-1]} {year} — Net Payable</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{fmt(salary.net_salary)}</p>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3 border-t pt-3 sm:pt-4">
                <div className="flex justify-between text-sm gap-2">
                  <span className="text-gray-500">Monthly Salary (CTC)</span>
                  <span className="font-medium whitespace-nowrap">{fmt(salary.monthly_salary)}</span>
                </div>
                <div className="flex justify-between text-sm gap-2">
                  <span className="text-gray-500">Working Days in Month</span>
                  <span className="font-medium">{salary.working_days}</span>
                </div>
                <div className="flex justify-between text-sm gap-2">
                  <span className="text-gray-500">Per Day Salary</span>
                  <span className="font-medium whitespace-nowrap">{fmt(salary.per_day_salary)}</span>
                </div>
                <div className="flex justify-between text-sm gap-2">
                  <span className="text-gray-500">Total Attendance Value</span>
                  <span className="font-medium">{salary.total_attendance_value} / {salary.working_days}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-3 gap-2">
                  <span className="text-gray-500">Payable Salary</span>
                  <span className="font-medium whitespace-nowrap">{fmt(salary.payable_salary)}</span>
                </div>
                {salary.deductions > 0 && (
                  <div className="flex justify-between text-sm text-red-600 gap-2">
                    <span className="flex items-center gap-1"><TrendingDown size={14} className="flex-shrink-0" /> Deductions</span>
                    <span className="whitespace-nowrap">− {fmt(salary.deductions)}</span>
                  </div>
                )}
                {salary.no_leave_bonus > 0 && (
                  <div className="flex justify-between text-sm text-green-600 gap-2">
                    <span className="flex items-center gap-1"><TrendingUp size={14} className="flex-shrink-0" /> No-Leave Bonus (2 days)</span>
                    <span className="whitespace-nowrap">+ {fmt(salary.no_leave_bonus)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm sm:text-base font-bold border-t pt-3 gap-2">
                  <span>Net Salary</span>
                  <span className="text-green-700 whitespace-nowrap">{fmt(salary.net_salary)}</span>
                </div>
                {salary.no_leave_bonus > 0 && (
                  <div className="flex justify-between text-sm font-bold text-green-700 gap-2">
                    <span>Total with Bonus</span>
                    <span className="whitespace-nowrap">{fmt(salary.total_with_bonus)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Attendance breakdown */}
            {salary.breakdown && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={16} className="text-gray-500 flex-shrink-0" />
                  <h3 className="font-medium text-gray-900 text-base">Attendance Breakdown</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { label: 'Present',   value: salary.breakdown.presentDays,  color: 'text-green-700',  bg: 'bg-green-50' },
                    { label: 'Half Days', value: salary.breakdown.halfDays,     color: 'text-orange-700', bg: 'bg-orange-50' },
                    { label: 'Absent',    value: salary.breakdown.absentDays,   color: 'text-red-700',    bg: 'bg-red-50' },
                    { label: 'Late',      value: salary.breakdown.lateDays,     color: 'text-yellow-700', bg: 'bg-yellow-50' },
                    { label: 'Leaves',    value: salary.breakdown.leaveDays,    color: 'text-purple-700', bg: 'bg-purple-50' },
                    { label: 'Att. Value',value: salary.total_attendance_value, color: 'text-blue-700',   bg: 'bg-blue-50' },
                  ].map(item => (
                    <div key={item.label} className={`${item.bg} rounded-lg p-3 text-center`}>
                      <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Policy note */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4 text-xs text-gray-500 space-y-1">
              <p><strong>Salary Formula:</strong> (Monthly Salary ÷ Working Days) × Total Attendance Value</p>
              <p><strong>Attendance Values:</strong> Present = 1 · Late (within 4/month) = 1 · Half Day = 0.5 · Absent = 0</p>
              <p><strong>No-Leave Bonus:</strong> 2 days salary if zero leaves taken in the month (requires admin approval)</p>
            </div>
          </>
        )}

      </div>
    </PageWrapper>
  )
}

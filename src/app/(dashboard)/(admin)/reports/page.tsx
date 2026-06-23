'use client'

import { useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Download, Users, User } from 'lucide-react'

export default function ReportsPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [downloadingType, setDownloadingType] = useState<'monthly' | 'individual' | null>(null)

  /**
   * Downloads attendance Excel file based on type (monthly matrix or individual sheets).
   * Calls GET /api/export/attendance?type=monthly|individual&month=X&year=Y
   */
  const downloadReport = async (type: 'monthly' | 'individual') => {
    setDownloadingType(type)
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch(`/api/export/attendance?type=${type}&month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const filename = type === 'monthly'
        ? `monthly-attendance-report-${year}-${String(month).padStart(2, '0')}.xlsx`
        : `individual-attendance-reports-${year}-${String(month).padStart(2, '0')}.xlsx`
        
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Export failed. Please try again.')
    } finally {
      setDownloadingType(null)
    }
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  return (
    <PageWrapper title="Reports" subtitle="Export attendance and salary data">
      <div className="max-w-2xl space-y-6">
        {/* Select Period Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-205 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 text-base">Select Period</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-650 mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="input w-full"
              >
                {months.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-650 mb-1">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="input w-full"
              >
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Monthly All-Employee Report */}
        <div className="bg-white p-6 rounded-xl border border-slate-205 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
              <Users size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 text-base">Monthly All-Employee Report</h3>
              <p className="text-sm text-slate-500 mt-1">
                Matrix format with all employees and dates as columns. Shows attendance status, hours worked, and summary totals for each employee.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-slate-500 list-disc pl-4">
                <li>Dates as columns showing status (Present, Absent, Holiday, etc.)</li>
                <li>Hours worked per day</li>
                <li>Summary: Total working days, Total work days, Total work hours</li>
              </ul>
              
              <button
                onClick={() => downloadReport('monthly')}
                disabled={downloadingType !== null}
                className="btn-primary mt-4 flex items-center gap-2 bg-[#4A1F6F] hover:bg-[#3A1660] text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                <Download size={16} />
                {downloadingType === 'monthly' ? 'Generating...' : 'Download Monthly Report'}
              </button>
            </div>
          </div>
        </div>

        {/* Individual Employee Reports */}
        <div className="bg-white p-6 rounded-xl border border-slate-205 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex-shrink-0">
              <User size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 text-base">Individual Employee Reports</h3>
              <p className="text-sm text-slate-500 mt-1">
                Detailed individual report for each employee in separate sheets. Includes complete attendance breakdown, leave details, and monthly summary.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-slate-500 list-disc pl-4">
                <li>One sheet per employee with complete attendance details</li>
                <li>Date, Check-in/out times, Status, Hours worked, GPS info</li>
                <li>Leave requests and approvals</li>
                <li>Monthly summary with totals and statistics</li>
              </ul>
              
              <button
                onClick={() => downloadReport('individual')}
                disabled={downloadingType !== null}
                className="btn-primary mt-4 flex items-center gap-2 bg-[#4A1F6F] hover:bg-[#3A1660] text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                <Download size={16} />
                {downloadingType === 'individual' ? 'Generating...' : 'Download Individual Reports'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}

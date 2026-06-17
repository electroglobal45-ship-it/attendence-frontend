'use client'

import { useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Download } from 'lucide-react'

export default function ReportsPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [downloading, setDownloading] = useState(false)

  /**
   * Downloads attendance Excel file.
   * Calls GET /api/export/attendance?month=X&year=Y
   * The API returns a .xlsx binary which the browser downloads.
   */
  const downloadAttendance = async () => {
    setDownloading(true)
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch(`/api/export/attendance?month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance-${year}-${String(month).padStart(2, '0')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Export failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  return (
    <PageWrapper title="Reports" subtitle="Export attendance and salary data">
      <div className="max-w-lg">
        <div className="card">
          <h3 className="font-medium text-grey-900 mb-4">Attendance Export</h3>
          <p className="text-sm text-grey-500 mb-6">
            Export a complete attendance sheet for any month as an Excel (.xlsx) file.
            Includes: Employee ID, Name, Date, Check-In/Out, Status, GPS Distance, Photo URL, Late Count.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-grey-700 mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="input"
              >
                {months.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-grey-700 mb-1">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="input"
              >
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={downloadAttendance}
            disabled={downloading}
            className="btn-primary flex items-center gap-2"
          >
            <Download size={16} />
            {downloading ? 'Generating...' : 'Download Excel'}
          </button>
        </div>
      </div>
    </PageWrapper>
  )
}

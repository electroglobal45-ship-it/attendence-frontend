'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ArrowLeft, Calendar, DollarSign, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { formatTimeIST, calculateHours } from '@/lib/time-utils'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const employeeId = params.id as string

  const [employee, setEmployee] = useState<any>(null)
  const [calendar, setCalendar] = useState<any>(null)
  const [salary, setSalary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    
    // Fetch employee details
    fetch(`${BACKEND_URL}/api/v1/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const emp = d.data?.users?.find((e: any) => e.id === employeeId)
        setEmployee(emp)
      })

    // Fetch calendar
    fetch(`/api/calendar?month=${selectedMonth}&year=${selectedYear}&employeeId=${employeeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setCalendar(d))

    // Fetch salary
    fetch(`/api/salary/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ month: selectedMonth, year: selectedYear, employeeId }),
    })
      .then((r) => r.json())
      .then((d) => setSalary(d))
      .finally(() => setLoading(false))
  }, [employeeId, selectedMonth, selectedYear])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!employee) {
    return <div className="min-h-screen flex items-center justify-center">Employee not found</div>
  }

  return (
    <PageWrapper
      title={employee.name}
      subtitle={employee.email}
      actions={
        <button onClick={() => router.back()} className="btn-secondary flex items-center gap-2">
          <ArrowLeft size={16} />
          Back
        </button>
      }
    >
      <div className="space-y-6">
        {/* Employee Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-xs text-gray-400 mb-1">Category</p>
            <p className="text-lg font-semibold capitalize">{employee.category}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-400 mb-1">Monthly Salary</p>
            <p className="text-lg font-semibold">₹{employee.monthly_salary?.toLocaleString()}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-400 mb-1">Joining Date</p>
            <p className="text-lg font-semibold">{employee.joining_date?.split('T')[0]}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-400 mb-1">Status</p>
            <p className="text-lg font-semibold">{employee.is_active ? 'Active' : 'Inactive'}</p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="card">
          <div className="flex items-center gap-4">
            <Calendar size={20} className="text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="input"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {format(new Date(2024, i, 1), 'MMMM')}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="input"
            >
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        {calendar && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-xs text-gray-400 mb-1">Working Days</p>
              <p className="text-2xl font-bold">{calendar.summary?.workingDays || 0}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-400 mb-1">Present</p>
              <p className="text-2xl font-bold text-green-600">{calendar.summary?.presentDays || 0}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-400 mb-1">Half Days</p>
              <p className="text-2xl font-bold text-orange-600">{calendar.summary?.halfDays || 0}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-400 mb-1">Attendance Value</p>
              <p className="text-2xl font-bold text-blue-600">{calendar.summary?.totalAttendanceValue || 0}</p>
            </div>
          </div>
        )}

        {/* Salary Info */}
        {salary && (
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign size={20} className="text-gray-400" />
              <h3 className="font-semibold text-gray-900">Salary Breakdown</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Payable Salary</p>
                <p className="text-lg font-bold text-green-600">₹{salary.payable_salary?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Deductions</p>
                <p className="text-lg font-bold text-red-600">₹{salary.deductions?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">No-Leave Bonus</p>
                <p className="text-lg font-bold text-blue-600">₹{salary.no_leave_bonus?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Total</p>
                <p className="text-lg font-bold">₹{salary.total_with_bonus?.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        {calendar && (
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Clock size={20} className="text-gray-400" />
              <h3 className="font-semibold text-gray-900">Daily Attendance</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Hours</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {calendar.days?.map((day: any) => (
                    <tr key={day.date} className={day.isWeekend || day.isHoliday ? 'bg-gray-50' : ''}>
                      <td className="font-medium">{format(new Date(day.date), 'MMM dd, EEE')}</td>
                      <td>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            day.dayType === 'present' || day.dayType === 'late_within_buffer'
                              ? 'bg-green-100 text-green-700'
                              : day.dayType === 'half_day'
                              ? 'bg-orange-100 text-orange-700'
                              : day.dayType === 'leave'
                              ? 'bg-blue-100 text-blue-700'
                              : day.dayType === 'absent'
                              ? 'bg-red-100 text-red-700'
                              : day.dayType === 'holiday' || day.dayType === 'sunday'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {day.label}
                        </span>
                      </td>
                      <td>
                        {formatTimeIST(day.checkIn)}
                      </td>
                      <td>
                        {formatTimeIST(day.checkOut)}
                      </td>
                      <td>{calculateHours(day.checkIn, day.checkOut)}</td>
                      <td className="font-semibold">{day.attendanceValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { UserPlus } from 'lucide-react'
import { usePrefetchStore } from '@/lib/store/prefetch-store'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

export default function EmployeesPage() {
  const router = useRouter()
  const storeEmployees = usePrefetchStore((state) => state.employees)
  const [employees, setEmployees] = useState<any[]>(() => storeEmployees ?? [])
  const [loading, setLoading] = useState(() => !storeEmployees || storeEmployees.length === 0)

  const fetchEmployees = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch(`${BACKEND_URL}/api/v1/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await res.json()
      if (res.ok) {
        const users = d.data?.users || []
        // Show all users except admin and hr
        const filtered = users.filter((u: any) => 
          u.role === 'employee' || u.role === 'team leader'
        )
        setEmployees(filtered)
        usePrefetchStore.setState({
          employees: filtered,
          status: { ...usePrefetchStore.getState().status, employees: 'done' }
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Sync from store whenever it updates (e.g. prefetch completes after mount)
  useEffect(() => {
    if (storeEmployees && storeEmployees.length > 0) {
      setEmployees(storeEmployees)
    }
  }, [storeEmployees])

  useEffect(() => {
    const hasData = storeEmployees && storeEmployees.length > 0
    fetchEmployees(hasData)
  }, [])

  return (
    <PageWrapper
      title="Employees"
      actions={
        <button
          onClick={() => router.push('/users/create')}
          className="h-10 px-3.5 sm:px-4 bg-gradient-to-r from-[#4A1F6F] to-[#3B1859] text-white rounded-xl hover:opacity-95 transition-all font-semibold shadow-md shadow-[#4A1F6F]/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          title="Create User / Add Employee"
        >
          <UserPlus size={18} />
          <span className="hidden sm:inline text-sm">Add Employee</span>
        </button>
      }
    >
      {/* ── Employees table ── */}
      <div className="card p-0">
        <div className="table-wrapper border-0 rounded-none overflow-x-auto w-full no-scrollbar">
          <table className="table min-w-[850px]">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Category</th>
                <th>Department</th>
                <th>Salary</th>
                <th>Joining Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                   <td colSpan={7} className="text-center text-gray-400 py-10">
                     No employees yet. Click "Add Employee" to get started.
                   </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} onClick={() => window.location.href = `/employees/${emp.id}`} className="cursor-pointer hover:bg-[#4A1F6F]/5 transition group">
                    <td className="font-bold text-slate-800 group-hover:text-[#4A1F6F] transition whitespace-nowrap">{emp.name}</td>
                    <td className="text-slate-600 font-medium whitespace-nowrap">{emp.email}</td>
                    <td className="capitalize text-slate-600 font-medium whitespace-nowrap">{emp.category}</td>
                    <td className="text-slate-655 font-medium whitespace-nowrap">{emp.department || '—'}</td>
                    <td className="text-slate-700 font-bold whitespace-nowrap">₹{emp.monthly_salary?.toLocaleString()}</td>
                    <td className="text-slate-500 font-medium whitespace-nowrap">{emp.joining_date?.split('T')[0]}</td>
                    <td className="whitespace-nowrap">
                      <span className={emp.is_active ? 'badge-present' : 'badge-absent'}>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Additional Add Employee button at the end of the list ── */}
      <div className="mt-6 flex justify-center sm:justify-end pb-6">
        <button
          onClick={() => router.push('/users/create')}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#4A1F6F] to-[#3B1859] hover:opacity-95 text-white rounded-xl font-semibold shadow-md shadow-[#4A1F6F]/20 transition-all cursor-pointer text-sm"
        >
          <UserPlus size={18} /> Add Employee
        </button>
      </div>
    </PageWrapper>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Copy, Check } from 'lucide-react'
import { usePrefetchStore } from '@/lib/store/prefetch-store'

const employeeSchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  category: z.enum(['regular', 'probation', 'intern']),
  department: z.string().optional(),
  designation: z.string().optional(),
  monthlySalary: z.coerce.number().min(1, 'Salary required'),
  joiningDate: z.string().min(1, 'Joining date required'),
})

type EmployeeForm = z.infer<typeof employeeSchema>

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

export default function EmployeesPage() {
  const storeEmployees = usePrefetchStore((state) => state.employees)
  const [employees, setEmployees] = useState<any[]>(() => storeEmployees ?? [])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(() => !storeEmployees || storeEmployees.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [createdCreds, setCreatedCreds] = useState<{ email: string; tempPassword: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { category: 'probation' },
  })

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
        const filtered = users.filter((u: any) => u.role === 'employee')
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

  useEffect(() => {
    const hasData = storeEmployees && storeEmployees.length > 0
    fetchEmployees(hasData)
  }, [])

  useEffect(() => {
    if (storeEmployees) {
      setEmployees(storeEmployees)
    }
  }, [storeEmployees])

  const onSubmit = async (data: EmployeeForm) => {
    setLoading(true)
    setError(null)

    const token = localStorage.getItem('authToken')
    const res = await fetch(`${BACKEND_URL}/api/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...data,
        monthly_salary: data.monthlySalary,
        joining_date: data.joiningDate,
        role: 'employee'
      }),
    })

    const result = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(result.error)
      return
    }

    const newEmp = result.data.employee
    setEmployees((prev) => [newEmp, ...prev])
    usePrefetchStore.setState({
      employees: [newEmp, ...usePrefetchStore.getState().employees]
    })
    setShowForm(false)
    reset()
    // Show credentials popup
    setCreatedCreds({ email: newEmp.email, tempPassword: result.data.tempPassword })
  }

  const copyPassword = () => {
    if (createdCreds) {
      navigator.clipboard.writeText(createdCreds.tempPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <PageWrapper
      title="Employees"
      actions={
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm">
          <Plus size={16} />
          Add
        </button>
      }
    >
      {/* ── Credentials popup after creation ── */}
      {createdCreds && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Check size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Employee Created!</p>
                <p className="text-sm text-gray-500">Share these login credentials with the employee</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
                <p className="text-sm font-mono text-gray-900 mt-0.5">{createdCreds.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Temporary Password</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm font-mono text-gray-900 bg-white border border-gray-200 rounded px-3 py-1.5 flex-1 break-all">
                    {createdCreds.tempPassword}
                  </p>
                  <button
                    onClick={copyPassword}
                    className="p-2 bg-black text-white rounded hover:bg-gray-800 transition flex-shrink-0"
                    title="Copy password"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
              ⚠ Save this password now — it cannot be retrieved later. The employee should change it after first login.
            </p>

            <button
              onClick={() => setCreatedCreds(null)}
              className="w-full py-2 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Add employee modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Add New Employee</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input {...register('name')} className="input" placeholder="John Doe" />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input {...register('email')} type="email" className="input" placeholder="john@company.com" />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select {...register('category')} className="input">
                    <option value="probation">Probation</option>
                    <option value="regular">Regular</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (₹) *</label>
                  <input {...register('monthlySalary')} type="number" className="input" placeholder="30000" />
                  {errors.monthlySalary && <p className="text-xs text-red-500 mt-1">{errors.monthlySalary.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input {...register('department')} className="input" placeholder="Engineering" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <input {...register('designation')} className="input" placeholder="Developer" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
                <input {...register('joiningDate')} type="date" className="input" />
                {errors.joiningDate && <p className="text-xs text-red-500 mt-1">{errors.joiningDate.message}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Creating...' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </PageWrapper>
  )
}

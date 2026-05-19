/**
 * Admin - Create User Page
 * Admin can create new users with temporary passwords
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Copy, Check } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'

export default function CreateUserPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [userRole, setUserRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    category: 'regular',
    monthly_salary: '',
    joining_date: new Date().toISOString().split('T')[0],
  })

  const [createdUser, setCreatedUser] = useState<{
    id: string
    email: string
    name: string
    tempPassword: string
  } | null>(null)

  // Check authentication
  useEffect(() => {
    const sessionStr = localStorage.getItem('supabase_session')
    
    if (!sessionStr) {
      router.push('/login')
      return
    }

    try {
      const session = JSON.parse(sessionStr)
      const userData = session?.profile

      if (!userData || userData.role !== 'admin') {
        router.push('/home')
        return
      }

      setUserRole(userData.role)
      setLoading(false)
    } catch (error) {
      console.error('Session parse error:', error)
      router.push('/login')
    }
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setSubmitting(true)

    try {
      const response = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase(),
          name: formData.name,
          category: formData.category,
          monthly_salary: formData.monthly_salary ? parseInt(formData.monthly_salary) : 0,
          joining_date: formData.joining_date,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create user')
        setSubmitting(false)
        return
      }

      setCreatedUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        tempPassword: data.tempPassword,
      })

      setSuccess(true)
      setFormData({
        email: '',
        name: '',
        category: 'regular',
        monthly_salary: '',
        joining_date: new Date().toISOString().split('T')[0],
      })
    } catch (err) {
      setError('Failed to create user. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedPassword(true)
    setTimeout(() => setCopiedPassword(false), 2000)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (userRole !== 'admin') {
    return <div className="min-h-screen flex items-center justify-center">Access Denied</div>
  }

  return (
    <PageWrapper title="Create New User" subtitle="Add a new employee to the system">
      <div className="max-w-2xl">

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success Message with Temporary Password */}
        {success && createdUser && (
          <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex gap-3 mb-4">
              <Check size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-green-700">User created successfully!</p>
                <p className="text-sm text-green-600 mt-1">Share the temporary password with the employee</p>
              </div>
            </div>

            <div className="bg-white border border-green-200 rounded p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-600 font-medium">Email</p>
                <p className="text-sm text-black font-mono">{createdUser.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium">Name</p>
                <p className="text-sm text-black font-mono">{createdUser.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium mb-2">Temporary Password</p>
                <div className="flex gap-2">
                  <p className="text-sm text-black font-mono bg-gray-50 px-3 py-2 rounded flex-1 break-all">
                    {createdUser.tempPassword}
                  </p>
                  <button
                    onClick={() => copyToClipboard(createdUser.tempPassword)}
                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center gap-2"
                  >
                    {copiedPassword ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700">
                <strong>Note:</strong> Employee must change this password on first login
              </div>
            </div>
          </div>
        )}

        {/* Create User Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-6 space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black"
                placeholder="employee@company.com"
                required
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black"
                placeholder="John Doe"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black"
              >
                <option value="regular">Regular</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>

            {/* Monthly Salary */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">Monthly Salary</label>
              <input
                type="number"
                name="monthly_salary"
                value={formData.monthly_salary}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black"
                placeholder="0"
                min="0"
              />
            </div>

            {/* Joining Date */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">Joining Date</label>
              <input
                type="date"
                name="joining_date"
                value={formData.joining_date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-400 transition"
            >
              {submitting ? 'Creating User...' : 'Create User'}
            </button>
          </form>
        )}

        {/* Create Another Button */}
        {success && (
          <button
            onClick={() => setSuccess(false)}
            className="w-full py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
          >
            Create Another User
          </button>
        )}
      </div>
    </PageWrapper>
  )
}

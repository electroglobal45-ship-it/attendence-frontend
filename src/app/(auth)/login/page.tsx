/**
 * Login Page
 * Email/Password authentication
 */

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Use AuthProvider's login() so context state is updated immediately
      const profile = await login(email, password)
      const userRole = profile.role

      console.log('Login successful, role:', userRole)

      // Redirect based on role
      if (userRole === 'admin') {
        window.location.href = '/dashboard'
      } else {
        window.location.href = '/home'
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 sm:px-0">
      <div className="w-full max-w-md p-6 sm:p-8 bg-white border border-gray-200 rounded-lg">
        <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">CRM Attendance</h1>
        <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">Sign in with your email and password</p>

        {error && (
          <div className="mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-black text-base touch-manipulation"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-black text-base touch-manipulation"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-400 transition touch-manipulation"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-sm mt-6">
          Contact your admin to create an account
        </p>
      </div>
    </div>
  )
}

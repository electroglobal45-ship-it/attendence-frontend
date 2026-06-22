/**
 * Login Page
 * Redesigned with professional CRM layout, cadbury purple theme, and company SSO button.
 */

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { 
  AlertCircle, ShieldCheck, Mail, Lock, 
  Eye, EyeOff, Key, ArrowRight 
} from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const profile = await login(email, password)
      const userRole = profile.role

      console.log('Login successful, role:', userRole)
      router.push(userRole === 'admin' ? '/dashboard' : '/home')
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] font-sans">
      
      {/* ════════════ TOP HEADER BAR ════════════ */}
      <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-gray-150 flex-shrink-0">
        {/* Left Side: Logo & App Name */}
        <div className="flex items-center gap-2 select-none">
          <ShieldCheck size={22} className="text-[#D9A441]" />
          <span 
            className="text-[19px] font-extrabold tracking-tight text-[#4A1F6F]"
            style={{ fontFamily: "'Plus Jakarta Sans', var(--font-inter), sans-serif" }}
          >
            CRM Attendance
          </span>
        </div>
      </header>

      {/* ════════════ MAIN CONTAINER ════════════ */}
      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-0">
        <div className="w-full max-w-[420px] bg-white border border-gray-200/90 rounded-2xl shadow-xl overflow-hidden">
          
          {/* Card Header (Cadbury Purple Gradient) */}
          <div 
            style={{ background: 'linear-gradient(135deg, #4A1F6F 0%, #2D0F47 100%)' }}
            className="px-8 py-8 flex flex-col items-center justify-center text-center relative"
          >
            {/* Welcome Back Title */}
            <h1 className="text-[21px] font-bold text-white tracking-wide">
              Welcome Back
            </h1>
          </div>

          {/* Card Body (Form) */}
          <form onSubmit={handleLogin} className="p-8 space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex gap-2.5 items-start">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">{error}</p>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-400 tracking-wider uppercase select-none">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3.5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A1F6F]/15 focus:border-[#4A1F6F] text-[13.5px] text-gray-800 placeholder-gray-400 transition shadow-xs"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-gray-400 tracking-wider uppercase select-none">
                  Password
                </label>
                <a href="#" className="text-[11.5px] font-bold text-[#D9A441] hover:text-[#b8852f] transition">
                  Forgot Password?
                </a>
              </div>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A1F6F]/15 focus:border-[#4A1F6F] text-[13.5px] text-gray-800 placeholder-gray-400 transition shadow-xs"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2.5 pt-1">
              <input
                id="remember"
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-[#4A1F6F] focus:ring-[#4A1F6F]/15 accent-[#4A1F6F] cursor-pointer"
              />
              <label htmlFor="remember" className="text-[12.5px] text-gray-500 font-medium select-none cursor-pointer">
                Keep me logged in for 30 days
              </label>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#4A1F6F] hover:bg-[#3b1859] disabled:bg-[#4A1F6F]/60 text-white rounded-xl font-bold text-[14px] transition flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-[0.98]"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              {!loading && <ArrowRight size={15} />}
            </button>

          </form>
        </div>

        {/* Footer text */}
        <p className="text-center text-[12.5px] text-gray-500 mt-6 select-none">
          Don't have an account?{' '}
          <span 
            onClick={() => alert('Please contact your organization administrator to register new employee credentials.')}
            className="text-[#4A1F6F] font-bold hover:underline cursor-pointer transition-colors"
          >
            Contact your admin to create an account
          </span>
        </p>
      </main>
    </div>
  )
}

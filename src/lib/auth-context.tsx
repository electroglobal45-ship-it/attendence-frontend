/**
 * Auth Context
 * Manages authentication with Express backend
 */

'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { authAPI, getAuthToken, clearAuthToken } from '@/lib/backend-api'

interface User {
  id: string
  email: string
  name: string
  role: string
  category?: string
  is_active?: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize - check if user is logged in
  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      
      if (!token) {
        console.log('No auth token found')
        setUser(null)
        setIsLoading(false)
        return
      }

      // First try to load from localStorage to avoid delay
      if (typeof window !== 'undefined') {
        const cachedUser = localStorage.getItem('user')
        if (cachedUser) {
          try {
            const parsedUser = JSON.parse(cachedUser)
            setUser(parsedUser)
            setIsLoading(false)
            // Verify token in background
            verifyToken()
            return
          } catch (e) {
            console.error('Failed to parse cached user')
          }
        }
      }

      console.log('Loading user profile from backend...')
      const response = await authAPI.getProfile()
      
      if (response.success && response.data) {
        console.log('User loaded:', response.data.email, 'role:', response.data.role)
        setUser(response.data)
        
        // Cache user data
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(response.data))
          localStorage.setItem('userRole', response.data.role)
        }
      } else {
        console.log('Failed to load user profile - keeping cached user if available')
        // Don't force logout if we have cached user - prevents rate limit issues
        if (!user) {
          setUser(null)
          clearAuthToken()
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user')
            localStorage.removeItem('userRole')
          }
        }
      }
    } catch (err) {
      console.error('Failed to load user (network/rate limit issue):', err)
      // Don't force logout on network errors - prevents "Too many requests" logout
      if (!user) {
        setUser(null)
        clearAuthToken()
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user')
          localStorage.removeItem('userRole')
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Background token verification (doesn't block UI)
  const verifyToken = async () => {
    try {
      const response = await authAPI.getProfile()
      if (response.success && response.data) {
        // Update cached user data if it changed
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(response.data))
          localStorage.setItem('userRole', response.data.role)
        }
        setUser(response.data)
      }
      // Do NOT logout on failure — silently keep the cached user
      // Token will naturally expire and login page will handle it
    } catch (err) {
      // Network error or server down — keep user logged in, don't force logout
      // This prevents "Too many requests" errors from logging users out
      console.warn('Background token verify failed (keeping user logged in):', err)
    }
  }

  const login = async (email: string, password: string): Promise<User> => {
    try {
      console.log('Logging in with backend API...')
      const result = await authAPI.login(email, password)

      if (result.user) {
        console.log('Login successful:', result.user.email, 'role:', result.user.role)
        setUser(result.user)
        
        // Store user data and role for backward compatibility
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(result.user))
          localStorage.setItem('userRole', result.user.role)
        }
        
        return result.user
      }

      throw new Error('User data not found in response')
    } catch (error: any) {
      console.error('Login error:', error)
      throw new Error(error.message || 'Login failed')
    }
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      clearAuthToken()
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user')
        localStorage.removeItem('userRole')
      }
    }
  }

  const refreshUser = async () => {
    await loadUser()
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Export User type
export type { User }

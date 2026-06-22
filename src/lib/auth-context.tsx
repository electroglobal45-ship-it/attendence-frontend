/**
 * Auth Context
 * Manages authentication with Express backend
 */

'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { authAPI, getAuthToken, getRefreshToken, clearAuthToken } from '@/lib/backend-api'
import { usePrefetchStore } from '@/lib/store/prefetch-store'

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
  const [isLoading, setIsLoading] = useState(true)  // Start as true to block premature routing redirects
  const hasLoadedRef = useRef(false)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize - check if user is logged in
  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    
    // Load user from cache INSTANTLY (no loading state)
    const cachedUser = localStorage.getItem('user')
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser))
      } catch (e) {
        console.error('Failed to parse cached user')
      }
    }
    
    // Verify token in background
    loadUser()
    
    // Setup token refresh
    setupTokenRefresh()
    
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [])

  // Trigger prefetch when user state is initialized/logged in
  useEffect(() => {
    if (user) {
      usePrefetchStore.getState().prefetchAll().catch(() => {})
    }
  }, [user])

  // Setup automatic token refresh
  const setupTokenRefresh = () => {
    const token = getAuthToken()
    if (!token) return
    
    try {
      // Decode JWT to get expiry
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expiresAt = payload.exp * 1000 // Convert to milliseconds
      const now = Date.now()
      const timeUntilExpiry = expiresAt - now
      
      // Refresh 5 minutes before expiry
      const refreshTime = timeUntilExpiry - (5 * 60 * 1000)
      
      if (refreshTime > 0) {
        refreshTimerRef.current = setTimeout(() => {
          refreshToken()
        }, refreshTime)
      } else {
        // Token already expired or will expire soon
        refreshToken()
      }
    } catch (e) {
      console.error('Failed to parse token for refresh:', e)
    }
  }

  // Refresh the auth token
  const refreshToken = async () => {
    try {
      const rToken = getRefreshToken()
      if (!rToken) {
        throw new Error('No refresh token available')
      }

      const response = await authAPI.refreshToken(rToken)
      if (response && response.token) {
        // Note: authAPI.refreshToken already calls setAuthToken
        // Setup next refresh
        setupTokenRefresh()
      } else {
        // Token invalid, logout
        await logout()
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      await logout()
    }
  }

  const loadUser = async () => {
    try {
      const token = getAuthToken()
      
      if (!token) {
        console.log('No auth token found')
        setUser(null)
        setIsLoading(false)
        return
      }

      // Load from localStorage first (instant UI update - NEVER make API call)
      if (typeof window !== 'undefined') {
        const cachedUser = localStorage.getItem('user')
        if (cachedUser) {
          try {
            const parsedUser = JSON.parse(cachedUser)
            setUser(parsedUser)
            setIsLoading(false)
            // NO API CALL - trust cached data completely
            return
          } catch (e) {
            console.error('Failed to parse cached user')
          }
        }
      }

      // Only fetch from API if no cache exists (first login only)
      console.log('No cached user, fetching from backend...')
      const response = await authAPI.getProfile()
      
      if (response.success && response.data) {
        console.log('User verified:', response.data.email, 'role:', response.data.role)
        setUser(response.data)
        
        // Cache user data
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(response.data))
          localStorage.setItem('userRole', response.data.role)
        }
        
        // Setup token refresh
        setupTokenRefresh()
      } else {
        // Clear if not verified
        setUser(null)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user')
          localStorage.removeItem('userRole')
        }
        if (typeof document !== 'undefined') {
          document.cookie = 'authToken=; path=/; max-age=0'
          document.cookie = 'userRole=; path=/; max-age=0'
        }
      }
    } catch (err) {
      console.error('Failed to verify user:', err)
      // Keep cached user, token will naturally expire
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
        
        // Store user data and role
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(result.user))
          localStorage.setItem('userRole', result.user.role)
        }
        
        // Store in cookies for middleware
        if (typeof document !== 'undefined' && result.token) {
          document.cookie = `authToken=${result.token}; path=/; max-age=604800; SameSite=Lax`
          document.cookie = `userRole=${result.user.role}; path=/; max-age=604800; SameSite=Lax`
        }
        
        // Setup token refresh
        setupTokenRefresh()
        
        // Prefetch all data in background (don't await — non-blocking)
        usePrefetchStore.getState().prefetchAll().catch(() => {})
        
        return result.user
      }

      throw new Error('User data not found in response')
    } catch (error: any) {
      console.error('Login error:', error)
      throw new Error(error.message || 'Login failed')
    }
  }

  const logout = async () => {
    // 1. Instantly clear local state and cache to make UI feel snappy
    setUser(null)
    clearAuthToken()
    usePrefetchStore.getState().reset()

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
      localStorage.removeItem('userRole')
    }

    if (typeof document !== 'undefined') {
      document.cookie = 'authToken=; path=/; max-age=0'
      document.cookie = 'userRole=; path=/; max-age=0'
    }

    // 2. Perform server-side cleanup in the background without blocking the client redirect
    try {
      authAPI.logout().catch(e => console.warn('Background logout request error:', e))
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const refreshUser = async () => {
    hasLoadedRef.current = false
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

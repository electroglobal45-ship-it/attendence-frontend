/**
 * Auth Context
 * Manages Supabase authentication and user session
 */

'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { signIn, signOut, getCurrentUser, onAuthStateChange } from '@/lib/supabase/auth'
import type { User } from '@/lib/supabase/client'

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

  const syncLegacySession = (profile: User, accessToken?: string | null) => {
    if (typeof window === 'undefined') return

    localStorage.setItem('user', JSON.stringify(profile))
    if (accessToken) {
      localStorage.setItem('authToken', accessToken)
    }
  }

  const clearLegacySession = () => {
    if (typeof window === 'undefined') return

    localStorage.removeItem('user')
    localStorage.removeItem('authToken')
    localStorage.removeItem('supabase_session')
  }

  // Initialize from Supabase session
  useEffect(() => {
    loadUser()

    // Listen to auth state changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      console.log('Auth state change event:', event)
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session) {
        loadUser()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        clearLegacySession()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadUser = async () => {
    setIsLoading(true)
    try {
      console.log('Loading user from Supabase session...')
      const result = await getCurrentUser()
      
      if (result.success && result.profile) {
        const profile = result.profile as User
        console.log('User loaded successfully:', profile.email, 'role:', profile.role)
        setUser(profile)
        syncLegacySession(profile, result.session?.access_token)
      } else {
        console.log('No user session found:', result.error)
        setUser(null)
        clearLegacySession()
      }
    } catch (err) {
      console.error('Failed to load user:', err)
      setUser(null)
      clearLegacySession()
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<User> => {
    const result = await signIn(email, password)

    if (!result.success) {
      throw new Error(result.error || 'Login failed')
    }

    if (result.profile) {
      const profile = result.profile as User
      setUser(profile)
      syncLegacySession(profile, result.session?.access_token)
      return profile
    }

    throw new Error('User profile not found')
  }

  const logout = async () => {
    await signOut()
    setUser(null)
    clearLegacySession()
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

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
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize from Supabase session
  useEffect(() => {
    loadUser()

    // Listen to auth state changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        loadUser()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadUser = async () => {
    setIsLoading(true)
    try {
      const result = await getCurrentUser()
      if (result.success && result.profile) {
        setUser(result.profile as User)
      } else {
        setUser(null)
      }
    } catch (err) {
      console.error('Failed to load user:', err)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const result = await signIn(email, password)

    if (!result.success) {
      throw new Error(result.error || 'Login failed')
    }

    if (result.profile) {
      setUser(result.profile as User)
    }
  }

  const logout = async () => {
    await signOut()
    setUser(null)
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

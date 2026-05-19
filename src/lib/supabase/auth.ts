/**
 * Authentication Service
 * Hybrid approach: Uses Supabase for session management but custom password verification
 */

import { supabase } from './client'

/**
 * Sign in with email and password
 * Uses custom password verification against users table
 */
export async function signIn(email: string, password: string) {
  try {
    console.log('🔐 Sign in attempt:', email)
    
    // First, get user from users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    console.log('👤 User found:', user ? 'Yes' : 'No')
    if (user) {
      console.log('📝 User details:', {
        id: user.id,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        has_password: !!user.password_hash,
        password_format: user.password_hash?.includes(':') ? 'hashed' : 'plain'
      })
    }

    if (userError || !user) {
      console.error('❌ User error:', userError)
      return { success: false, error: 'Invalid email or password' }
    }

    if (!user.is_active) {
      console.log('❌ User inactive')
      return { success: false, error: 'User account is inactive' }
    }

    if (!user.password_hash) {
      console.log('❌ No password hash')
      return { success: false, error: 'Account not properly configured. Please contact admin.' }
    }

    // Verify password (plain text only)
    const passwordValid = user.password_hash === password

    console.log('✅ Password valid:', passwordValid)

    if (!passwordValid) {
      console.log('❌ Password invalid')
      return { success: false, error: 'Invalid email or password' }
    }

    console.log('✅ Login successful')

    // Call login API to get proper JWT token
    try {
      console.log('🔑 Calling login API to get JWT token...')
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      console.log('🔑 Login API response status:', loginResponse.status)

      if (loginResponse.ok) {
        const loginData = await loginResponse.json()
        const token = loginData.token

        console.log('🔑 JWT token received:', token ? 'Yes' : 'No')

        const sessionData = {
          user: { id: user.id, email: user.email },
          profile: user,
          token,
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('supabase_session', JSON.stringify(sessionData))
          localStorage.setItem('authToken', token)
          console.log('🔑 Token stored in localStorage')
        }

        return {
          success: true,
          user: sessionData.user,
          profile: user,
          token,
        }
      } else {
        const errorData = await loginResponse.json()
        console.error('❌ Login API failed:', errorData)
      }
    } catch (err) {
      console.error('❌ Failed to call login API:', err)
    }

    // Fallback: create session without token (should not happen)
    console.warn('⚠️ Using fallback session without JWT token')
    const sessionData = {
      user: { id: user.id, email: user.email },
      profile: user,
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('supabase_session', JSON.stringify(sessionData))
    }

    return {
      success: true,
      user: sessionData.user,
      profile: user,
    }
  } catch (error: any) {
    console.error('💥 Error signing in:', error)
    return { success: false, error: error.message || 'Sign in failed' }
  }
}

/**
 * Verify password against hash
 * Browser-compatible version using Web Crypto API
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash.includes(':')) return false
  
  try {
    const [salt, storedHash] = hash.split(':')
    
    // Convert password and salt to Uint8Array
    const encoder = new TextEncoder()
    const passwordData = encoder.encode(password)
    const saltData = encoder.encode(salt)
    
    // Import key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    )
    
    // Derive key
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltData,
        iterations: 10000,
        hash: 'SHA-512'
      },
      keyMaterial,
      512 // 64 bytes * 8 bits
    )
    
    // Convert to hex
    const derivedArray = new Uint8Array(derivedBits)
    const newHash = Array.from(derivedArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    return newHash === storedHash
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}

/**
 * Sign out
 */
export async function signOut() {
  // Clear local session
  if (typeof window !== 'undefined') {
    localStorage.removeItem('supabase_session')
    localStorage.removeItem('authToken') // Also remove token
  }

  return { success: true }
}

/**
 * Get current session
 */
export async function getSession() {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Not in browser context' }
  }

  const sessionStr = localStorage.getItem('supabase_session')
  if (!sessionStr) {
    return { success: false, error: 'No session found' }
  }

  try {
    const session = JSON.parse(sessionStr)
    return { success: true, session }
  } catch (error) {
    return { success: false, error: 'Invalid session' }
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const sessionResult = await getSession()
  
  if (!sessionResult.success || !sessionResult.session) {
    return { success: false, error: 'No user found' }
  }

  const { profile } = sessionResult.session

  // Refresh profile from database
  const { data: freshProfile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', profile.id)
    .single()

  if (profileError) {
    console.error('Error getting profile:', profileError)
    return { success: false, error: profileError.message }
  }

  return {
    success: true,
    user: { id: freshProfile.id, email: freshProfile.email },
    profile: freshProfile,
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  // Simple polling for session changes
  let lastSession: any = null
  
  const checkSession = async () => {
    const result = await getSession()
    const currentSession = result.success ? result.session : null
    
    if (currentSession && !lastSession) {
      callback('SIGNED_IN', currentSession)
    } else if (!currentSession && lastSession) {
      callback('SIGNED_OUT', null)
    }
    
    lastSession = currentSession
  }
  
  // Check immediately
  checkSession()
  
  // Check every 5 seconds
  const interval = setInterval(checkSession, 5000)
  
  return {
    data: {
      subscription: {
        unsubscribe: () => clearInterval(interval)
      }
    }
  }
}

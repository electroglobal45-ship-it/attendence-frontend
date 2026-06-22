/**
 * Backend API Client
 * Connects to Express backend instead of Next.js API routes
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

// Store token in memory and localStorage
let authToken: string | null = null
let authRefreshToken: string | null = null

export const setAuthToken = (token: string, refreshToken?: string) => {
  authToken = token
  if (refreshToken) {
    authRefreshToken = refreshToken
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token)
    // Also set authToken for backward compatibility with old code
    localStorage.setItem('authToken', token)
    
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken)
    }
  }
}

export const getAuthToken = (): string | null => {
  if (authToken) return authToken
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('auth_token')
  }
  return authToken
}

export const getRefreshToken = (): string | null => {
  if (authRefreshToken) return authRefreshToken
  if (typeof window !== 'undefined') {
    authRefreshToken = localStorage.getItem('refresh_token')
  }
  return authRefreshToken
}

export const clearAuthToken = () => {
  authToken = null
  authRefreshToken = null
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token')
    // Also remove authToken for backward compatibility
    localStorage.removeItem('authToken')
    localStorage.removeItem('refresh_token')
  }
}

// Attempt to refresh the Supabase session and persist the new tokens.
// Returns the new access token on success, or null on failure.
let _refreshPromise: Promise<string | null> | null = null
const refreshAccessToken = async (): Promise<string | null> => {
  if (_refreshPromise) return _refreshPromise

  _refreshPromise = (async () => {
    try {
      const rToken = getRefreshToken()
      if (!rToken) return null

      const res = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rToken }),
      })

      if (!res.ok) return null

      const json = await res.json()
      const newToken: string | undefined = json?.data?.token
      const newRefresh: string | undefined = json?.data?.session?.refresh_token

      if (!newToken) return null

      setAuthToken(newToken, newRefresh)
      // Update cookie for Next.js middleware
      if (typeof document !== 'undefined') {
        document.cookie = `authToken=${newToken}; path=/; max-age=604800; SameSite=Lax`
      }
      return newToken
    } catch {
      return null
    } finally {
      _refreshPromise = null
    }
  })()

  return _refreshPromise
}

// Generic API request function with automatic 401 → refresh → retry
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  _isRetry = false
): Promise<T> {
  const token = getAuthToken()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // On 401: try to refresh the token once, then retry
  if (response.status === 401) {
    if (!_isRetry) {
      const newToken = await refreshAccessToken()
      if (newToken) {
        if (typeof document !== 'undefined') {
          document.cookie = `authToken=${newToken}; path=/; max-age=604800; SameSite=Lax`
        }
        return apiRequest<T>(endpoint, options, true)
      }
    }
    // Refresh also failed or already retried → clear session and redirect to login
    clearAuthToken()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
      localStorage.removeItem('userRole')
      document.cookie = 'authToken=; path=/; max-age=0'
      document.cookie = 'userRole=; path=/; max-age=0'
      window.location.href = '/login'
    }
    throw new Error('Session expired. Please log in again.')
  }

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'API request failed')
  }

  return data
}

// =====================================================
// AUTH API
// =====================================================

export const authAPI = {
  async login(email: string, password: string) {
    const response = await apiRequest<{
      success: boolean
      data: {
        token: string
        session: any
        user: {
          id: string
          email: string
          name: string
          role: string
          category?: string
        }
      }
      message?: string
    }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    if (response.data.token) {
      setAuthToken(response.data.token, response.data.session?.refresh_token)
    }

    return response.data
  },

  async getProfile() {
    return apiRequest<{
      success: boolean
      data: {
        id: string
        email: string
        name: string
        role: string
        category?: string
        is_active: boolean
      }
    }>('/api/v1/auth/me')
  },

  async refreshToken(refreshToken: string) {
    const response = await apiRequest<{
      success: boolean
      data: {
        token: string
        session: any
      }
    }>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })

    if (response.data?.token) {
      setAuthToken(response.data.token, response.data.session?.refresh_token)
    }

    return response.data
  },

  async changePassword(oldPassword: string, newPassword: string) {
    return apiRequest<{
      success: boolean
      message: string
    }>('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    })
  },

  async logout() {
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST' })
    } finally {
      clearAuthToken()
    }
  },
}

// =====================================================
// ATTENDANCE API
// =====================================================

export const attendanceAPI = {
  async getTodayAttendance() {
    return apiRequest<{
      success: boolean
      data: {
        attendance: any | null
      }
    }>('/api/v1/attendance/today')
  },

  async markAttendance(data: {
    latitude: number
    longitude: number
    accuracy: number
    selfieBase64: string
    address?: string
  }) {
    return apiRequest<{
      success: boolean
      data: {
        id: string
        status: string
        attendance_value: number
        is_late: boolean
        check_in: string
      }
      message: string
    }>('/api/v1/attendance/mark', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async markOut(data: {
    latitude?: number
    longitude?: number
    accuracy?: number
    markoutSelfieBase64?: string
    address?: string
  }) {
    return apiRequest<{
      success: boolean
      data: any
      message: string
    }>('/api/v1/attendance/markout', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getHistory(limit = 30) {
    return apiRequest<{
      success: boolean
      data: {
        records: any[]
      }
    }>(`/api/v1/attendance/history?limit=${limit}`)
  },
}

// =====================================================
// AGENTS API
// =====================================================

export const agentsAPI = {
  async getAgents() {
    return apiRequest<{
      success: boolean
      data: {
        agents: any[]
      }
    }>('/api/v1/agents')
  },

  async toggleAgent(agentId: string, enabled: boolean) {
    return apiRequest<{
      success: boolean
      data: {
        agents: any[]
      }
      message: string
    }>('/api/v1/agents/toggle', {
      method: 'POST',
      body: JSON.stringify({ agentId, enabled }),
    })
  },

  async updatePriority(agentId: string, priority: number) {
    return apiRequest<{
      success: boolean
      data: {
        agents: any[]
      }
      message: string
    }>('/api/v1/agents/priority', {
      method: 'POST',
      body: JSON.stringify({ agentId, priority }),
    })
  }
}

// =====================================================
// HEALTH CHECK
// =====================================================

export const healthCheck = async () => {
  return apiRequest<{
    status: string
    timestamp: string
    environment: string
  }>('/health')
}

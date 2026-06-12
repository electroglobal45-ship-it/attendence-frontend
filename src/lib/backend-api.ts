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

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
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
// HEALTH CHECK
// =====================================================

export const healthCheck = async () => {
  return apiRequest<{
    status: string
    timestamp: string
    environment: string
  }>('/health')
}

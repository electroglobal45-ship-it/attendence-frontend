/**
 * Tasks API Client
 * Connects to Express backend for task management
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token')
  }
  return null
}

// Get refresh token from localStorage
const getRefreshToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refresh_token')
  }
  return null
}

// Save a new access token (and optionally a new refresh token)
const saveAuthToken = (token: string, refreshToken?: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('authToken', token) // backward compat
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken)
    // Update the cookie used by Next.js middleware
    document.cookie = `authToken=${token}; path=/; max-age=604800; SameSite=Lax`
  }
}

// Attempt to refresh the Supabase session and persist the new tokens.
// Returns the new access token on success, or null on failure.
let _refreshPromise: Promise<string | null> | null = null
const refreshAccessToken = async (): Promise<string | null> => {
  // Deduplicate concurrent refresh attempts
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

      saveAuthToken(newToken, newRefresh)
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

  // On 401: try to refresh the token once, then retry the request
  if (response.status === 401) {
    if (!_isRetry) {
      const newToken = await refreshAccessToken()
      if (newToken) {
        if (typeof document !== 'undefined') {
          document.cookie = `authToken=${newToken}; path=/; max-age=604800; SameSite=Lax`
        }
        // Retry with the fresh token
        return apiRequest<T>(endpoint, options, true)
      }
    }
    // Refresh also failed or already retried → redirect to login
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('authToken')
      localStorage.removeItem('refresh_token')
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
// TASKS API
// =====================================================

export const tasksAPI = {
  // Get all tasks (admin)
  async getAllTasks() {
    return apiRequest<{
      success: boolean
      data: {
        tasks: any[]
      }
    }>('/api/v1/tasks/all')
  },

  // Get user's tasks
  async getMyTasks() {
    return apiRequest<{
      success: boolean
      data: {
        tasks: any[]
      }
    }>('/api/v1/tasks/my-tasks')
  },

  // Create task
  async createTask(data: {
    title: string
    description?: string
    assigned_to: string
    due_date?: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    status?: 'todo' | 'in_progress' | 'review' | 'done'
  }) {
    return apiRequest<{
      success: boolean
      data: {
        task: any
      }
    }>('/api/v1/tasks/create', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Update task status (for drag and drop)
  async updateTaskStatus(taskId: string, status: string) {
    return apiRequest<{
      success: boolean
      data: {
        task: any
      }
    }>(`/api/v1/tasks/${taskId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  },

  // Update task
  async updateTask(taskId: string, updates: any) {
    return apiRequest<{
      success: boolean
      data: {
        task: any
      }
    }>(`/api/v1/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  },

  // Delete task
  async deleteTask(taskId: string) {
    return apiRequest<{
      success: boolean
    }>(`/api/v1/tasks/${taskId}`, {
      method: 'DELETE',
    })
  },

  // Get task comments
  async getTaskComments(taskId: string) {
    return apiRequest<{
      success: boolean
      data: {
        comments: any[]
      }
    }>(`/api/v1/tasks/${taskId}/comments`)
  },

  // Add task comment
  async addTaskComment(taskId: string, comment: string) {
    return apiRequest<{
      success: boolean
      data: {
        comment: any
      }
    }>(`/api/v1/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    })
  },

  // Get task attachments
  async getTaskAttachments(taskId: string) {
    return apiRequest<{
      success: boolean
      data: {
        attachments: any[]
      }
    }>(`/api/v1/tasks/${taskId}/attachments`)
  },

  // Get task activities
  async getTaskActivities(taskId: string) {
    return apiRequest<{
      success: boolean
      data: {
        activities: any[]
      }
    }>(`/api/v1/tasks/${taskId}/activities`)
  },
}

// =====================================================
// EMPLOYEES API
// =====================================================

export const employeesAPI = {
  // Get all employees
  async getAllEmployees() {
    return apiRequest<{
      success: boolean
      data: {
        employees: any[]
      }
    }>('/api/v1/employees')
  },

  // Get employee by ID
  async getEmployeeById(id: string) {
    return apiRequest<{
      success: boolean
      data: {
        employee: any
      }
    }>(`/api/v1/employees/${id}`)
  },
}

// =====================================================
// USERS API (Admin only - create/manage users)
// =====================================================

export const usersAPI = {
  // Get all users
  async getAllUsers() {
    return apiRequest<{
      success: boolean
      data: {
        users: any[]
      }
    }>('/api/v1/users')
  },

  // Create user
  async createUser(data: {
    email: string
    name: string
    password: string
    role: 'admin' | 'employee' | 'hr' | 'team leader'
    category?: string
    department?: string
    designation?: string
    monthly_salary?: number
    joining_date?: string
  }) {
    return apiRequest<{
      success: boolean
      data: {
        user: any
      }
    }>('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Update user
  async updateUser(userId: string, updates: any) {
    return apiRequest<{
      success: boolean
      data: {
        user: any
      }
    }>(`/api/v1/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  },

  // Delete user
  async deleteUser(userId: string) {
    return apiRequest<{
      success: boolean
    }>(`/api/v1/users/${userId}`, {
      method: 'DELETE',
    })
  },

  // Change user password
  async changeUserPassword(userId: string, password: string) {
    return apiRequest<{
      success: boolean
    }>(`/api/v1/users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    })
  },
}

// =====================================================
// ADMIN API (Dashboard, Stats, etc.)
// =====================================================

export const adminAPI = {
  // Get dashboard stats
  async getDashboardStats() {
    return apiRequest<{
      success: boolean
      data: {
        totalEmployees: number
        presentToday: number
        absentToday: number
        pendingLeaves: number
        activeTasks: number
      }
    }>('/api/v1/admin/stats')
  },

  // Get all attendance records
  async getAllAttendance(params?: {
    date?: string
    employeeId?: string
    limit?: number
  }) {
    const query = new URLSearchParams()
    if (params?.date) query.append('date', params.date)
    if (params?.employeeId) query.append('employeeId', params.employeeId)
    if (params?.limit) query.append('limit', params.limit.toString())

    return apiRequest<{
      success: boolean
      data: {
        records: any[]
      }
    }>(`/api/v1/admin/attendance${query.toString() ? '?' + query.toString() : ''}`)
  },

  // Get all leaves
  async getAllLeaves(status?: string) {
    const query = status ? `?status=${status}` : ''
    return apiRequest<{
      success: boolean
      data: {
        leaves: any[]
      }
    }>(`/api/v1/admin/leaves${query}`)
  },

  // Update leave status
  async updateLeaveStatus(leaveId: string, status: 'approved' | 'rejected', adminNotes?: string) {
    return apiRequest<{
      success: boolean
      data: {
        leave: any
      }
    }>(`/api/v1/admin/leaves/${leaveId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNotes }),
    })
  },

  // Mark attendance (admin manually overrides attendance status/times)
  async markAttendance(data: {
    employeeId: string
    date: string
    action: 'present' | 'absent' | 'half_day' | 'late_within_buffer' | 'mark_checkout'
    reason?: string
    checkIn?: string
    checkOut?: string
  }) {
    return apiRequest<{
      success: boolean
      data: {
        attendance: any
      }
    }>('/api/v1/admin/mark-attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// =====================================================
// HOLIDAYS API
// =====================================================

export const holidaysAPI = {
  // Get all holidays
  async getAllHolidays(year?: number) {
    const query = year ? `?year=${year}` : ''
    return apiRequest<{
      success: boolean
      data: {
        holidays: any[]
      }
    }>(`/api/v1/holidays${query}`)
  },

  // Create holiday
  async createHoliday(data: {
    date: string
    name: string
    is_mandatory?: boolean
  }) {
    return apiRequest<{
      success: boolean
      data: {
        holiday: any
      }
    }>('/api/v1/holidays', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Update holiday
  async updateHoliday(holidayId: string, updates: any) {
    return apiRequest<{
      success: boolean
      data: {
        holiday: any
      }
    }>(`/api/v1/holidays/${holidayId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  },

  // Delete holiday
  async deleteHoliday(holidayId: string) {
    return apiRequest<{
      success: boolean
    }>(`/api/v1/holidays/${holidayId}`, {
      method: 'DELETE',
    })
  },
}

// =====================================================
// SETTINGS API
// =====================================================

export const settingsAPI = {
  // Get office locations
  async getOfficeLocations() {
    return apiRequest<{
      success: boolean
      data: {
        locations: any[]
      }
    }>('/api/v1/settings/office')
  },

  // Create office location
  async createOfficeLocation(data: {
    name: string
    latitude: number
    longitude: number
    radius_meters?: number
  }) {
    return apiRequest<{
      success: boolean
      data: {
        location: any
      }
    }>('/api/v1/settings/office', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Update office location
  async updateOfficeLocation(locationId: string, updates: any) {
    return apiRequest<{
      success: boolean
      data: {
        location: any
      }
    }>(`/api/v1/settings/office/${locationId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  },

  // Delete office location
  async deleteOfficeLocation(locationId: string) {
    return apiRequest<{
      success: boolean
    }>(`/api/v1/settings/office/${locationId}`, {
      method: 'DELETE',
    })
  },
}

// =====================================================
// LEAVES API (Full/Half Day and Short leaves)
// =====================================================

export const leavesAPI = {
  // Get leave requests (full/half day)
  async getLeaveRequests(all: boolean = false) {
    const query = all ? '?all=true' : ''
    return apiRequest<{
      success: boolean
      data: {
        leaves: any[]
      }
    }>(`/api/v1/leaves${query}`)
  },

  // Apply for leave (full/half day)
  async applyLeave(data: {
    type: string
    start_date: string
    end_date: string
    reason: string
  }) {
    return apiRequest<{
      success: boolean
      data: {
        leave: any
      }
    }>('/api/v1/leaves/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Get short leaves
  async getShortLeaves(all: boolean = false) {
    const query = all ? '?all=true' : ''
    return apiRequest<{
      success: boolean
      data: {
        leaves: any[]
      }
    }>(`/api/v1/leaves/short${query}`)
  },

  // Request short leave
  async requestShortLeave(data: {
    date: string
    short_leave_type: string
    reason: string
  }) {
    return apiRequest<{
      success: boolean
      data: {
        leave: any
      }
    }>('/api/v1/leaves/short', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Update short leave status
  async updateShortLeaveStatus(leaveId: string, status: 'approved' | 'rejected', adminNotes?: string) {
    return apiRequest<{
      success: boolean
      data: {
        leave: any
      }
    }>(`/api/v1/leaves/short/${leaveId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNotes }),
    })
  },
}

// =====================================================
// ATTENDANCE API (Employee)
// =====================================================

export const attendanceAPI = {
  // Get today's attendance
  async getTodayAttendance() {
    return apiRequest<{
      success: boolean
      data: {
        attendance: any | null
      }
    }>('/api/v1/attendance/today')
  },

  // Mark attendance (check-in)
  async markAttendance(data: {
    latitude: number
    longitude: number
    accuracy: number
    selfieURL: string
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
    }>('/api/v1/attendance/mark', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Mark out (check-out)
  async markOut(data: {
    latitude?: number
    longitude?: number
    accuracy?: number
    markoutSelfieURL?: string
    address?: string
  }) {
    return apiRequest<{
      success: boolean
      data: any
    }>('/api/v1/attendance/markout', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Get attendance history
  async getHistory(limit?: number) {
    const query = limit ? `?limit=${limit}` : ''
    return apiRequest<{
      success: boolean
      data: {
        records: any[]
      }
    }>(`/api/v1/attendance/history${query}`)
  },
}

// =====================================================
// VAULT API (Password Vault)
// =====================================================

export interface VaultAssignment {
  id: string
  assigned_to: string
  is_revealed: boolean
  assignee?: { id: string; name: string; email: string }
}

// Admin view — each entry has a list of assignments (one per employee)
export interface AdminVaultEntry {
  id: string
  service_name: string
  username: string
  created_by: string
  notes?: string | null
  site_url?: string | null
  created_at: string
  creator?: { id: string; name: string; email: string }
  assignments: VaultAssignment[]
  password?: string
}

// Employee view — flattened single-assignment shape
export interface EmployeeVaultEntry {
  id: string              // vault_id
  assignment_id: string
  service_name: string
  username: string
  notes?: string | null
  site_url?: string | null
  created_at: string
  created_by?: string
  creator?: { id: string; name: string; email: string }
  is_revealed: boolean
}

export const vaultAPI = {
  // List vault entries (admin = all with assignments, employee = own flat list)
  async getEntries() {
    return apiRequest<{
      success: boolean
      data: { entries: AdminVaultEntry[] | EmployeeVaultEntry[] }
    }>('/api/v1/vault')
  },

  // Admin: Create a new vault entry assigned to multiple employees
  async createEntry(data: {
    service_name: string
    username: string
    password: string
    assigned_to: string[]   // array of employee UUIDs
    notes?: string
    site_url?: string
  }) {
    return apiRequest<{
      success: boolean
      data: { entry: AdminVaultEntry }
    }>('/api/v1/vault', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Update vault entry (admin or owner employee)
  async updateEntry(id: string, data: {
    service_name?: string
    username?: string
    password?: string
    notes?: string
    site_url?: string
    assigned_to?: string[]
  }) {
    return apiRequest<{
      success: boolean
      data: { entry: AdminVaultEntry }
    }>(`/api/v1/vault/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Employee: One-time reveal (uses vault entry id, not assignment id)
  async revealPassword(vaultId: string) {
    return apiRequest<{
      success: boolean
      data: { password: string }
    }>(`/api/v1/vault/${vaultId}/reveal`, { method: 'POST' })
  },

  // Admin: Delete vault entry (cascades to all assignments)
  async deleteEntry(id: string) {
    return apiRequest<{ success: boolean }>(`/api/v1/vault/${id}`, { method: 'DELETE' })
  },

  // Admin: Reset reveal for a specific employee, or all employees if no employeeId
  async resetReveal(vaultId: string, employeeId?: string) {
    return apiRequest<{ success: boolean }>(`/api/v1/vault/${vaultId}/reset`, {
      method: 'POST',
      body: JSON.stringify({ employeeId }),
    })
  },

  // Admin: Assign employees to an existing entry
  async assignEmployees(vaultId: string, employeeIds: string[]) {
    return apiRequest<{
      success: boolean
      data: { entry: AdminVaultEntry }
    }>(`/api/v1/vault/${vaultId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assigned_to: employeeIds }),
    })
  },
}

// =====================================================
// MEETINGS API (Video Conferencing)
// =====================================================

export interface MeetingAssignment {
  id: string
  user_id: string
  assignee?: { id: string; name: string; email: string }
}

export interface Meeting {
  id: string
  title: string
  room_name: string
  is_permanent: boolean
  scheduled_at?: string | null
  started_at?: string | null
  ended_at?: string | null
  created_by?: string
  created_at: string
  creator?: { id: string; name: string; email: string }
  assignments?: MeetingAssignment[]
}

export const meetingsAPI = {
  // List all meetings
  async getMeetings() {
    return apiRequest<{
      success: boolean
      data: { meetings: Meeting[] }
    }>('/api/v1/meetings')
  },

  // Create a meeting
  async createMeeting(data: {
    title: string
    is_permanent?: boolean
    scheduled_at?: string | null
    assigned_to?: string[]
  }) {
    return apiRequest<{
      success: boolean
      data: { meeting: Meeting }
    }>('/api/v1/meetings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Delete a meeting
  async deleteMeeting(id: string) {
    return apiRequest<{ success: boolean }>(`/api/v1/meetings/${id}`, {
      method: 'DELETE',
    })
  },

  // Start a meeting (Host)
  async startMeeting(id: string) {
    return apiRequest<{
      success: boolean
      data: { meeting: Meeting }
    }>(`/api/v1/meetings/${id}/start`, {
      method: 'POST',
    })
  },

  // End a meeting (Host)
  async endMeeting(id: string) {
    return apiRequest<{
      success: boolean
      data: { meeting: Meeting }
    }>(`/api/v1/meetings/${id}/end`, {
      method: 'POST',
    })
  },

  // Ping presence
  async pingMeeting(id: string) {
    return apiRequest<{
      success: boolean
      ended: boolean
      activeParticipantsCount: number
    }>(`/api/v1/meetings/${id}/ping`, {
      method: 'POST',
    })
  },
}

// =====================================================
// BOARDS API
// =====================================================

export const boardsAPI = {
  async getProjectBoards(projectId: string) {
    return apiRequest<{
      success: boolean
      data: {
        boards: any[]
      }
    }>(`/api/v1/boards/project/${projectId}`)
  },

  async createBoard(data: { project_id: string; name: string }) {
    return apiRequest<{
      success: boolean
      data: {
        board: any
      }
    }>('/api/v1/boards', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// =====================================================
// SALARY API
// =====================================================

export const salaryAPI = {
  async getSalarySlips(month: number, year: number) {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token') || localStorage.getItem('authToken')) : null
    const response = await fetch('/api/salary/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ month, year }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to calculate salary')
    }

    return response.json()
  },
}



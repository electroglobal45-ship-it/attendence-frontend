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
    role: 'admin' | 'employee'
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

  // Mark attendance (admin manually marks absent/half-day/checkout)
  async markAttendance(data: {
    employeeId: string
    date: string
    action: 'absent' | 'half_day' | 'mark_checkout'
    reason?: string
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

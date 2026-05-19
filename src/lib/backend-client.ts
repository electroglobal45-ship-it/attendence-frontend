/**
 * Backend API Client
 *
 * All calls to the backend include the BACKEND_SECRET for authentication.
 * The backend validates this secret before processing any request.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

interface BackendRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: Record<string, unknown>
  headers?: Record<string, string>
}

/**
 * Makes an authenticated request to the backend API
 */
export async function backendFetch(
  endpoint: string,
  options: BackendRequestOptions = {}
) {
  const { method = 'GET', body, headers = {} } = options

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_BACKEND_SECRET || ''}`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Backend request failed')
  }

  return response.json()
}

/**
 * Attendance API calls
 */
export const attendanceAPI = {
  mark: (data: {
    employeeId: string
    latitude: number
    longitude: number
    accuracy: number
    selfieURL: string
    address?: string
  }) =>
    backendFetch('/api/attendance/mark', {
      method: 'POST',
      body: data,
    }),

  checkout: (data: { employeeId: string }) =>
    backendFetch('/api/attendance/checkout', {
      method: 'POST',
      body: data,
    }),

  getToday: (employeeId: string) =>
    backendFetch(`/api/attendance/today?employeeId=${employeeId}`),
}

/**
 * Leave API calls
 */
export const leaveAPI = {
  apply: (data: {
    employeeId: string
    leaveType: string
    startDate: string
    endDate: string
    reason: string
  }) =>
    backendFetch('/api/leaves/apply', {
      method: 'POST',
      body: data,
    }),

  getMyLeaves: (employeeId: string) =>
    backendFetch(`/api/leaves?employeeId=${employeeId}`),

  approve: (data: {
    leaveId: string
    action: 'approved' | 'rejected'
    rejectionReason?: string
  }) =>
    backendFetch('/api/leaves/approve', {
      method: 'POST',
      body: data,
    }),
}

/**
 * Salary API calls
 */
export const salaryAPI = {
  calculate: (data: {
    employeeId: string
    month: number
    year: number
  }) =>
    backendFetch('/api/salary/calculate', {
      method: 'POST',
      body: data,
    }),

  getReport: (employeeId: string, month: number, year: number) =>
    backendFetch(
      `/api/salary/report?employeeId=${employeeId}&month=${month}&year=${year}`
    ),
}

/**
 * Export API calls
 */
export const exportAPI = {
  attendance: async (month: number, year: number) => {
    const response = await fetch(
      `${BACKEND_URL}/api/export/attendance?month=${month}&year=${year}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_BACKEND_SECRET || ''}`,
        },
      }
    )

    if (!response.ok) throw new Error('Export failed')

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${year}-${String(month).padStart(2, '0')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  },
}

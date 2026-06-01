/**
 * API Helper Functions for Project Management
 * Centralized API calls with authentication
 */

import type {
  Project,
  ProjectWithStats,
  ProjectList,
  ProjectListWithTasks,
  Task,
  TaskWithRelations,
  TaskLabel,
  TaskComment,
  TaskCommentWithUser,
  ProjectMember,
  ProjectMemberWithUser,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateListRequest,
  UpdateListRequest,
  CreateTaskRequest,
  UpdateTaskRequest,
  MoveTaskRequest,
  CreateCommentRequest,
  AddProjectMemberRequest,
  UpdateProjectMemberRequest,
  CreateLabelRequest,
  TaskFilters,
  PaginatedResponse,
} from '@/types/project.types'

const API_BASE = '/api'

/**
 * Fetch with authentication
 */
async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('authToken')
  
  if (!token) {
    throw new Error('Not authenticated. Please login again.')
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Build query string from object
 */
function buildQueryString(params?: Record<string, any>): string {
  if (!params) return ''
  
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  
  return filtered ? `?${filtered}` : ''
}

// ============================================================================
// PROJECTS API
// ============================================================================

export const projectsApi = {
  /**
   * List all projects user has access to
   */
  list: async (): Promise<{ projects: ProjectWithStats[] }> => {
    return fetchWithAuth(`${API_BASE}/projects`)
  },

  /**
   * Get project details by ID
   */
  get: async (id: string): Promise<{ project: ProjectWithStats }> => {
    return fetchWithAuth(`${API_BASE}/projects/${id}`)
  },

  /**
   * Create a new project
   */
  create: async (data: CreateProjectRequest): Promise<{ success: boolean; project: Project }> => {
    return fetchWithAuth(`${API_BASE}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Update project
   */
  update: async (id: string, data: UpdateProjectRequest): Promise<{ success: boolean; project: Project }> => {
    return fetchWithAuth(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /**
   * Delete project
   */
  delete: async (id: string): Promise<{ success: boolean }> => {
    return fetchWithAuth(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
    })
  },

  /**
   * Get project lists
   */
  getLists: async (projectId: string): Promise<{ lists: ProjectListWithTasks[] }> => {
    return fetchWithAuth(`${API_BASE}/projects/${projectId}/lists`)
  },

  /**
   * Create project list
   */
  createList: async (projectId: string, data: CreateListRequest): Promise<{ success: boolean; list: ProjectList }> => {
    return fetchWithAuth(`${API_BASE}/projects/${projectId}/lists`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Get project members
   */
  getMembers: async (projectId: string): Promise<{ members: ProjectMemberWithUser[] }> => {
    return fetchWithAuth(`${API_BASE}/projects/${projectId}/members`)
  },

  /**
   * Add project member
   */
  addMember: async (projectId: string, data: AddProjectMemberRequest): Promise<{ success: boolean; member: ProjectMember }> => {
    return fetchWithAuth(`${API_BASE}/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Update project member
   */
  updateMember: async (projectId: string, memberId: string, data: UpdateProjectMemberRequest): Promise<{ success: boolean; member: ProjectMember }> => {
    return fetchWithAuth(`${API_BASE}/projects/${projectId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /**
   * Remove project member
   */
  removeMember: async (projectId: string, memberId: string): Promise<{ success: boolean }> => {
    return fetchWithAuth(`${API_BASE}/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    })
  },
}

// ============================================================================
// TASKS API
// ============================================================================

export const tasksApi = {
  /**
   * List tasks with filters
   */
  list: async (filters?: TaskFilters): Promise<PaginatedResponse<TaskWithRelations>> => {
    const query = buildQueryString(filters)
    return fetchWithAuth(`${API_BASE}/tasks${query}`)
  },

  /**
   * Get task details
   */
  get: async (id: string): Promise<{ task: TaskWithRelations }> => {
    return fetchWithAuth(`${API_BASE}/tasks/${id}`)
  },

  /**
   * Create task
   */
  create: async (data: CreateTaskRequest): Promise<{ success: boolean; task: Task }> => {
    return fetchWithAuth(`${API_BASE}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Update task
   */
  update: async (id: string, data: UpdateTaskRequest): Promise<{ success: boolean; task: Task }> => {
    return fetchWithAuth(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /**
   * Delete task
   */
  delete: async (id: string): Promise<{ success: boolean }> => {
    return fetchWithAuth(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
    })
  },

  /**
   * Move task (drag & drop)
   */
  move: async (data: MoveTaskRequest): Promise<{ success: boolean; task: Task; moved_between_lists: boolean }> => {
    return fetchWithAuth(`${API_BASE}/tasks/move`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Get task comments
   */
  getComments: async (taskId: string): Promise<{ comments: TaskCommentWithUser[] }> => {
    return fetchWithAuth(`${API_BASE}/tasks/${taskId}/comments`)
  },

  /**
   * Add task comment
   */
  addComment: async (taskId: string, data: CreateCommentRequest): Promise<{ success: boolean; comment: TaskComment }> => {
    return fetchWithAuth(`${API_BASE}/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// ============================================================================
// LISTS API
// ============================================================================

export const listsApi = {
  /**
   * Get list details
   */
  get: async (id: string): Promise<{ list: ProjectListWithTasks }> => {
    return fetchWithAuth(`${API_BASE}/lists/${id}`)
  },

  /**
   * Update list
   */
  update: async (id: string, data: UpdateListRequest): Promise<{ success: boolean; list: ProjectList }> => {
    return fetchWithAuth(`${API_BASE}/lists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /**
   * Delete list
   */
  delete: async (id: string): Promise<{ success: boolean }> => {
    return fetchWithAuth(`${API_BASE}/lists/${id}`, {
      method: 'DELETE',
    })
  },
}

// ============================================================================
// LABELS API
// ============================================================================

export const labelsApi = {
  /**
   * Get labels for project
   */
  list: async (projectId: string): Promise<{ labels: TaskLabel[] }> => {
    return fetchWithAuth(`${API_BASE}/labels?project_id=${projectId}`)
  },

  /**
   * Create label
   */
  create: async (data: CreateLabelRequest): Promise<{ success: boolean; label: TaskLabel }> => {
    return fetchWithAuth(`${API_BASE}/labels`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Delete label
   */
  delete: async (id: string): Promise<{ success: boolean }> => {
    return fetchWithAuth(`${API_BASE}/labels/${id}`, {
      method: 'DELETE',
    })
  },
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('authToken')
}

/**
 * Get auth token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('authToken')
}

/**
 * Format error message
 */
export function formatApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

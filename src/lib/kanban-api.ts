/**
 * Kanban API Client
 * Handles all API calls for the advanced Kanban system
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

// Helper to get auth token
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken')
  }
  return null
}

// Helper for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const token = getAuthToken()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || 'Request failed',
      }
    }

    return { success: true, data: data.data || data }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error',
    }
  }
}

// ===== BOARDS API =====

export const boardsAPI = {
  // Get all boards for a project
  getProjectBoards: async (projectId: string) => {
    return apiCall(`/boards/project/${projectId}`)
  },

  // Get board with full details
  getBoardDetails: async (boardId: string) => {
    return apiCall(`/boards/${boardId}`)
  },

  // Create new board
  createBoard: async (data: {
    project_id: string
    name: string
    description?: string
    position?: number
  }) => {
    return apiCall('/boards', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Update board
  updateBoard: async (boardId: string, data: {
    name?: string
    description?: string
    position?: number
  }) => {
    return apiCall(`/boards/${boardId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Delete board
  deleteBoard: async (boardId: string) => {
    return apiCall(`/boards/${boardId}`, {
      method: 'DELETE',
    })
  },

  // Board members
  addBoardMember: async (boardId: string, data: {
    user_id: string
    role?: string
    can_edit?: boolean
    can_comment?: boolean
  }) => {
    return apiCall(`/boards/${boardId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateBoardMember: async (memberId: string, data: {
    role?: string
    can_edit?: boolean
    can_comment?: boolean
  }) => {
    return apiCall(`/boards/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  removeBoardMember: async (memberId: string) => {
    return apiCall(`/boards/members/${memberId}`, {
      method: 'DELETE',
    })
  },

  // Favorites
  toggleFavorite: async (boardId: string) => {
    return apiCall(`/boards/${boardId}/favorite`, {
      method: 'POST',
    })
  },

  getUserFavorites: async () => {
    return apiCall('/boards/favorites/me')
  },
}

// ===== LISTS API =====

export const listsAPI = {
  // Create list
  createList: async (data: {
    project_id: string
    board_id: string
    name: string
    position?: number
  }) => {
    return apiCall('/lists', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Update list
  updateList: async (listId: string, data: {
    name?: string
    position?: number
  }) => {
    return apiCall(`/lists/${listId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Delete list
  deleteList: async (listId: string) => {
    return apiCall(`/lists/${listId}`, {
      method: 'DELETE',
    })
  },

  // Move cards between lists
  moveCards: async (listId: string, data: {
    target_list_id: string
    card_ids?: string[]
  }) => {
    return apiCall(`/lists/${listId}/move-cards`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Sort cards in a list
  sortCards: async (listId: string, data: {
    sort_by: 'position' | 'due_date' | 'priority' | 'name'
    order?: 'asc' | 'desc'
  }) => {
    return apiCall(`/lists/${listId}/sort`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// ===== LABELS API =====

export const labelsAPI = {
  // Create label
  createLabel: async (data: {
    board_id: string
    name?: string
    color: string
    position?: number
  }) => {
    return apiCall('/labels', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Update label
  updateLabel: async (labelId: string, data: {
    name?: string
    color?: string
    position?: number
  }) => {
    return apiCall(`/labels/${labelId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Delete label
  deleteLabel: async (labelId: string) => {
    return apiCall(`/labels/${labelId}`, {
      method: 'DELETE',
    })
  },

  // Add label to task
  addLabelToTask: async (taskId: string, labelId: string) => {
    return apiCall(`/labels/tasks/${taskId}/labels`, {
      method: 'POST',
      body: JSON.stringify({ labelId }),
    })
  },

  // Remove label from task
  removeLabelFromTask: async (taskId: string, labelId: string) => {
    return apiCall(`/labels/tasks/${taskId}/labels/${labelId}`, {
      method: 'DELETE',
    })
  },
}

// ===== PROJECTS API (if you need to create projects) =====

export const projectsAPI = {
  // Get all projects
  getAllProjects: async () => {
    return apiCall('/projects')
  },

  // Get project by ID
  getProject: async (projectId: string) => {
    return apiCall(`/projects/${projectId}`)
  },

  // Create project
  createProject: async (data: {
    name: string
    description?: string
    color?: string
  }) => {
    return apiCall('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Update project
  updateProject: async (projectId: string, data: {
    name?: string
    description?: string
    color?: string
  }) => {
    return apiCall(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Delete project
  deleteProject: async (projectId: string) => {
    return apiCall(`/projects/${projectId}`, {
      method: 'DELETE',
    })
  },
}

export default {
  boards: boardsAPI,
  lists: listsAPI,
  labels: labelsAPI,
  projects: projectsAPI,
}

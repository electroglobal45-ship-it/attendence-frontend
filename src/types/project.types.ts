/**
 * Unified Type Definitions for Project Management
 * These types match the database schema and API responses
 */

export interface Project {
  id: string
  public_id: string
  name: string
  description?: string | null
  color: string
  workspace_owner_id: string
  created_by: string
  created_at: string
  updated_at: string
  is_active: boolean
  is_archived: boolean
  allow_comments: boolean
  allow_attachments: boolean
  deleted_at?: string | null
}

export interface ProjectWithStats extends Project {
  member_count?: number
  task_count?: number
  completed_task_count?: number
}

export interface ProjectList {
  id: string
  public_id: string
  name: string
  project_id: string
  position: number
  color: string
  created_at: string
  updated_at: string
}

export interface ProjectListWithTasks extends ProjectList {
  tasks: Task[]
  task_count: number
}

export interface Task {
  id: string
  public_id: string
  title: string
  description?: string | null
  list_id: string
  project_id: string
  assigned_to?: string | null
  created_by: string
  position: number
  due_date?: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'todo' | 'in_progress' | 'review' | 'done'
  completion_percentage: number
  created_at: string
  updated_at: string
  completed_at?: string | null
}

export interface TaskWithRelations extends Task {
  assigned_user?: {
    id: string
    name: string
    email: string
  } | null
  creator?: {
    id: string
    name: string
    email: string
  } | null
  labels?: TaskLabel[]
  comments?: TaskComment[]
  attachments?: TaskAttachment[]
  project_lists?: {
    id: string
    name: string
    position: number
  }
  projects?: {
    id: string
    public_id: string
    name: string
    color: string
  }
}

export interface TaskLabel {
  id: string
  name: string
  color: string
  project_id: string
  created_by?: string
  created_at: string
}

export interface TaskLabelAssignment {
  task_id: string
  label_id: string
  assigned_at: string
  assigned_by?: string
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface TaskCommentWithUser extends TaskComment {
  users?: {
    id: string
    name: string
    email: string
  }
}

export interface TaskAttachment {
  id: string
  task_id: string
  file_name: string
  file_path: string
  file_size?: number | null
  mime_type?: string | null
  uploaded_by: string
  created_at: string
}

export interface TaskAttachmentWithUser extends TaskAttachment {
  users?: {
    id: string
    name: string
    email: string
  }
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: 'admin' | 'member' | 'viewer'
  status: 'active' | 'inactive' | 'pending'
  added_by?: string | null
  added_at: string
}

export interface ProjectMemberWithUser extends ProjectMember {
  users?: {
    id: string
    name: string
    email: string
    role?: string
  }
}

export interface TaskActivity {
  id: string
  task_id: string
  user_id: string
  action: string
  description?: string | null
  old_values?: Record<string, any> | null
  new_values?: Record<string, any> | null
  created_at: string
}

export interface TaskActivityWithUser extends TaskActivity {
  users?: {
    id: string
    name: string
    email: string
  }
}

export interface ProjectSettings {
  id: string
  project_id: string
  default_list_id?: string | null
  auto_assign_creator: boolean
  notify_on_task_creation: boolean
  notify_on_task_assignment: boolean
  notify_on_due_date: boolean
  integrate_with_attendance: boolean
  created_at: string
  updated_at: string
}

// API Request/Response Types

export interface CreateProjectRequest {
  name: string
  description?: string
  color?: string
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  color?: string
  is_archived?: boolean
}

export interface CreateListRequest {
  name: string
  project_id: string
  position?: number
  color?: string
}

export interface UpdateListRequest {
  name?: string
  position?: number
  color?: string
}

export interface CreateTaskRequest {
  title: string
  description?: string
  list_id: string
  project_id: string
  assigned_to?: string
  due_date?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  position?: number
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  list_id?: string
  assigned_to?: string
  due_date?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  status?: 'todo' | 'in_progress' | 'review' | 'done'
  completion_percentage?: number
  position?: number
}

export interface MoveTaskRequest {
  task_id: string
  source_list_id?: string
  destination_list_id: string
  destination_position: number
}

export interface CreateCommentRequest {
  content: string
}

export interface AddProjectMemberRequest {
  user_id: string
  role: 'admin' | 'member' | 'viewer'
}

export interface UpdateProjectMemberRequest {
  role?: 'admin' | 'member' | 'viewer'
  status?: 'active' | 'inactive' | 'pending'
}

export interface CreateLabelRequest {
  name: string
  color: string
  project_id: string
}

// Filter/Query Types

export interface TaskFilters {
  project_id?: string
  list_id?: string
  assigned_to_me?: boolean
  assigned_to?: string
  status?: string
  priority?: string
  due_soon?: boolean
  limit?: number
  offset?: number
}

export interface ProjectFilters {
  is_archived?: boolean
  workspace_owner_id?: string
  limit?: number
  offset?: number
}

// Pagination Types

export interface PaginationInfo {
  total: number
  limit: number
  offset: number
  has_more: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationInfo
}

// Checklist Types

export interface TaskChecklist {
  id: string
  task_id: string
  title: string
  position: number
  created_at: string
  updated_at: string
  checklist_items?: ChecklistItem[]
  total_items?: number
  completed_items?: number
  progress_percentage?: number
}

export interface ChecklistItem {
  id: string
  checklist_id: string
  content: string
  is_completed: boolean
  position: number
  due_date?: string | null
  assigned_to?: string | null
  completed_at?: string | null
  completed_by?: string | null
  created_at: string
  updated_at: string
}

export interface CreateChecklistRequest {
  title: string
  position?: number
}

export interface UpdateChecklistRequest {
  title?: string
  position?: number
}

export interface CreateChecklistItemRequest {
  content: string
  position?: number
  assigned_to?: string
  due_date?: string
}

export interface UpdateChecklistItemRequest {
  content?: string
  is_completed?: boolean
  position?: number
  assigned_to?: string
  due_date?: string
}

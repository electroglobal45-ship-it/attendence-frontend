// Notification Types for Real-Time Notification Feature

export interface User {
  id: string
  name: string
  email: string
  role?: string
}

export type NotificationType = 'meeting' | 'announcement' | 'reminder' | 'task' | 'general'
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  created_by: string
  created_at: string
  updated_at: string
  scheduled_for?: string
  meeting_link?: string
  priority: NotificationPriority
  creator?: User
  is_read?: boolean
  read_at?: string
}

export interface NotificationRecipient {
  id: string
  notification_id: string
  user_id: string
  is_read: boolean
  read_at?: string
  created_at: string
  user?: User
}

export interface CreateNotificationPayload {
  title: string
  message: string
  type: NotificationType
  recipient_ids: string[]
  scheduled_for?: string
  meeting_link?: string
  priority?: NotificationPriority
}

export interface NotificationStats {
  total: number
  unread: number
}

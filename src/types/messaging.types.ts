// Messaging Types for Real-Time Chat Feature

export interface User {
  id: string
  name: string
  email: string
  avatar_url?: string
  role?: string
}

export interface Channel {
  id: string
  name: string
  description?: string
  type: 'public' | 'private'
  created_by: string
  created_at: string
  updated_at: string
  is_archived: boolean
  topic?: string
  purpose?: string
  unread_count?: number
  last_message?: Message
  member_count?: number
}

export interface ChannelMember {
  id: string
  channel_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  last_read_at: string
  notifications_enabled: boolean
  user?: User
}

export interface Conversation {
  id: string
  type: 'direct' | 'group'
  created_at: string
  updated_at: string
  participants?: ConversationParticipant[]
  unread_count?: number
  last_message?: Message
  other_user?: User // For direct messages
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  joined_at: string
  last_read_at: string
  user?: User
}

export interface Message {
  id: string
  content: string
  channel_id?: string
  conversation_id?: string
  sender_id: string
  parent_message_id?: string
  created_at: string
  updated_at: string
  edited_at?: string
  is_deleted: boolean
  deleted_at?: string
  message_type: 'text' | 'file' | 'image' | 'system'
  sender?: User
  reactions?: MessageReaction[]
  attachments?: MessageAttachment[]
  mentions?: MessageMention[]
  reply_count?: number
  thread_replies?: Message[]
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  user?: User
}

export interface MessageAttachment {
  id: string
  message_id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  uploaded_by: string
  created_at: string
}

export interface MessageMention {
  id: string
  message_id: string
  mentioned_user_id: string
  created_at: string
  is_read: boolean
  message?: Message
}

export interface UserPresence {
  user_id: string
  status: 'online' | 'offline' | 'away' | 'busy'
  last_seen_at: string
  status_text?: string
  status_emoji?: string
  updated_at: string
}

export interface TypingUser {
  user_id: string
  user_name: string
  channel_id?: string
  conversation_id?: string
}

// Socket Events
export interface SendMessageData {
  content: string
  channel_id?: string
  conversation_id?: string
  parent_message_id?: string
  mentions?: string[]
  attachments?: MessageAttachment[]
  temp_id?: string
}

export interface EditMessageData {
  message_id: string
  new_content: string
}

export interface DeleteMessageData {
  message_id: string
}

export interface AddReactionData {
  message_id: string
  emoji: string
}

export interface RemoveReactionData {
  message_id: string
  reaction_id: string
}

export interface TypingData {
  channel_id?: string
  conversation_id?: string
}

export interface MarkAsReadData {
  channel_id?: string
  conversation_id?: string
  message_id?: string
}

// API Response Types
export interface ChannelsResponse {
  channels: Channel[]
}

export interface MessagesResponse {
  messages: Message[]
  has_more: boolean
}

export interface ConversationsResponse {
  conversations: Conversation[]
}

export interface SearchResponse {
  results: Message[]
  total: number
}

export interface MentionsResponse {
  mentions: MessageMention[]
}

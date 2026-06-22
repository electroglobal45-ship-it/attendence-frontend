import { create } from 'zustand'
import {
  Channel,
  Conversation,
  Message,
  UserPresence,
  TypingUser,
  MessageReaction,
  MessageMention,
} from '@/types/messaging.types'

interface MessagingState {
  // Channels
  channels: Channel[]
  activeChannelId: string | null
  channelMessages: Record<string, Message[]>
  
  // Conversations (DMs)
  conversations: Conversation[]
  activeConversationId: string | null
  conversationMessages: Record<string, Message[]>
  
  // Threads
  activeThreadId: string | null
  threadMessages: Record<string, Message[]>
  isThreadPanelOpen: boolean
  
  // Presence & Typing
  userPresence: Record<string, UserPresence>
  typingUsers: TypingUser[]
  
  // Unread & Mentions
  unreadChannels: Record<string, number>
  unreadConversations: Record<string, number>
  mentions: MessageMention[]
  
  // UI State
  isSidebarOpen: boolean
  isSearchOpen: boolean
  searchQuery: string
  
  // Socket Connection
  isConnected: boolean
  connectionError: string | null
}

interface MessagingActions {
  // Channel Actions
  setChannels: (channels: Channel[]) => void
  addChannel: (channel: Channel) => void
  updateChannel: (channelId: string, updates: Partial<Channel>) => void
  setActiveChannel: (channelId: string | null) => void
  
  // Channel Messages
  setChannelMessages: (channelId: string, messages: Message[]) => void
  addChannelMessage: (channelId: string, message: Message) => void
  updateChannelMessage: (channelId: string, messageId: string, updates: Partial<Message>) => void
  deleteChannelMessage: (channelId: string, messageId: string) => void
  prependChannelMessages: (channelId: string, messages: Message[]) => void
  
  // Conversation Actions
  setConversations: (conversations: Conversation[]) => void
  addConversation: (conversation: Conversation) => void
  setActiveConversation: (conversationId: string | null) => void
  
  // Conversation Messages
  setConversationMessages: (conversationId: string, messages: Message[]) => void
  addConversationMessage: (conversationId: string, message: Message) => void
  updateConversationMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void
  deleteConversationMessage: (conversationId: string, messageId: string) => void
  prependConversationMessages: (conversationId: string, messages: Message[]) => void
  
  // Thread Actions
  setActiveThread: (messageId: string | null) => void
  setThreadPanelOpen: (isOpen: boolean) => void
  setThreadMessages: (threadId: string, messages: Message[]) => void
  addThreadMessage: (threadId: string, message: Message) => void
  updateThreadMessage: (threadId: string, messageId: string, updates: Partial<Message>) => void
  
  // Reactions
  addReaction: (messageId: string, reaction: MessageReaction) => void
  removeReaction: (messageId: string, reactionId: string) => void
  
  // Presence & Typing
  updateUserPresence: (userId: string, presence: UserPresence) => void
  addTypingUser: (typingUser: TypingUser) => void
  removeTypingUser: (userId: string, channelId?: string, conversationId?: string) => void
  
  // Unread & Mentions
  setUnreadCount: (type: 'channel' | 'conversation', id: string, count: number) => void
  incrementUnreadCount: (type: 'channel' | 'conversation', id: string) => void
  clearUnreadCount: (type: 'channel' | 'conversation', id: string) => void
  setMentions: (mentions: MessageMention[]) => void
  addMention: (mention: MessageMention) => void
  markMentionRead: (mentionId: string) => void
  
  // UI Actions
  toggleSidebar: () => void
  setSidebarOpen: (isOpen: boolean) => void
  setSearchOpen: (isOpen: boolean) => void
  setSearchQuery: (query: string) => void
  
  // Connection
  setConnected: (isConnected: boolean) => void
  setConnectionError: (error: string | null) => void
  
  // Utility
  reset: () => void
}

type MessagingStore = MessagingState & MessagingActions

const initialState: MessagingState = {
  channels: [],
  activeChannelId: null,
  channelMessages: {},
  conversations: [],
  activeConversationId: null,
  conversationMessages: {},
  activeThreadId: null,
  threadMessages: {},
  isThreadPanelOpen: false,
  userPresence: {},
  typingUsers: [],
  unreadChannels: {},
  unreadConversations: {},
  mentions: [],
  isSidebarOpen: true,
  isSearchOpen: false,
  searchQuery: '',
  isConnected: false,
  connectionError: null,
}

export const useMessagingStore = create<MessagingStore>((set, get) => ({
  ...initialState,

  // Channel Actions
  setChannels: (channels) => set({ channels }),
  
  addChannel: (channel) =>
    set((state) => ({
      channels: [...state.channels, channel],
    })),
  
  updateChannel: (channelId, updates) =>
    set((state) => ({
      channels: state.channels.map((ch) =>
        ch.id === channelId ? { ...ch, ...updates } : ch
      ),
    })),
  
  setActiveChannel: (channelId) =>
    set((state) => ({
      activeChannelId: channelId,
      activeConversationId: null,
      activeThreadId: null,
      isThreadPanelOpen: false,
      unreadChannels: channelId
        ? { ...state.unreadChannels, [channelId]: 0 }
        : state.unreadChannels,
    })),

  // Channel Messages
  setChannelMessages: (channelId, messages) =>
    set((state) => ({
      channelMessages: {
        ...state.channelMessages,
        [channelId]: messages,
      },
    })),
  
  addChannelMessage: (channelId, message) =>
    set((state) => {
      const existingMessages = state.channelMessages[channelId] || []
      const isDuplicate = existingMessages.some((m) => m.id === message.id)
      
      if (isDuplicate) {
        return state
      }
      
      return {
        channelMessages: {
          ...state.channelMessages,
          [channelId]: [...existingMessages, message],
        },
      }
    }),
  
  updateChannelMessage: (channelId, messageId, updates) =>
    set((state) => ({
      channelMessages: {
        ...state.channelMessages,
        [channelId]: state.channelMessages[channelId]?.map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ) || [],
      },
    })),
  
  deleteChannelMessage: (channelId, messageId) =>
    set((state) => ({
      channelMessages: {
        ...state.channelMessages,
        [channelId]: state.channelMessages[channelId]?.map((msg) =>
          msg.id === messageId ? { ...msg, is_deleted: true } : msg
        ) || [],
      },
    })),
  
  prependChannelMessages: (channelId, messages) =>
    set((state) => ({
      channelMessages: {
        ...state.channelMessages,
        [channelId]: [...messages, ...(state.channelMessages[channelId] || [])],
      },
    })),

  // Conversation Actions
  setConversations: (conversations) => set({ conversations }),
  
  addConversation: (conversation) =>
    set((state) => ({
      conversations: [...state.conversations, conversation],
    })),
  
  setActiveConversation: (conversationId) =>
    set((state) => ({
      activeConversationId: conversationId,
      activeChannelId: null,
      activeThreadId: null,
      isThreadPanelOpen: false,
      unreadConversations: conversationId
        ? { ...state.unreadConversations, [conversationId]: 0 }
        : state.unreadConversations,
    })),

  // Conversation Messages
  setConversationMessages: (conversationId, messages) =>
    set((state) => ({
      conversationMessages: {
        ...state.conversationMessages,
        [conversationId]: messages,
      },
    })),
  
  addConversationMessage: (conversationId, message) =>
    set((state) => {
      const existingMessages = state.conversationMessages[conversationId] || []
      const isDuplicate = existingMessages.some((m) => m.id === message.id)
      
      if (isDuplicate) {
        return state
      }
      
      return {
        conversationMessages: {
          ...state.conversationMessages,
          [conversationId]: [...existingMessages, message],
        },
      }
    }),
  
  updateConversationMessage: (conversationId, messageId, updates) =>
    set((state) => ({
      conversationMessages: {
        ...state.conversationMessages,
        [conversationId]: state.conversationMessages[conversationId]?.map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ) || [],
      },
    })),
  
  deleteConversationMessage: (conversationId, messageId) =>
    set((state) => ({
      conversationMessages: {
        ...state.conversationMessages,
        [conversationId]: state.conversationMessages[conversationId]?.map((msg) =>
          msg.id === messageId ? { ...msg, is_deleted: true } : msg
        ) || [],
      },
    })),
  
  prependConversationMessages: (conversationId, messages) =>
    set((state) => ({
      conversationMessages: {
        ...state.conversationMessages,
        [conversationId]: [...messages, ...(state.conversationMessages[conversationId] || [])],
      },
    })),

  // Thread Actions
  setActiveThread: (messageId) => set({ activeThreadId: messageId }),
  
  setThreadPanelOpen: (isOpen) => set({ isThreadPanelOpen: isOpen }),
  
  setThreadMessages: (threadId, messages) =>
    set((state) => ({
      threadMessages: {
        ...state.threadMessages,
        [threadId]: messages,
      },
    })),
  
  addThreadMessage: (threadId, message) =>
    set((state) => ({
      threadMessages: {
        ...state.threadMessages,
        [threadId]: [...(state.threadMessages[threadId] || []), message],
      },
    })),
  
  updateThreadMessage: (threadId, messageId, updates) =>
    set((state) => ({
      threadMessages: {
        ...state.threadMessages,
        [threadId]: state.threadMessages[threadId]?.map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ) || [],
      },
    })),

  // Reactions
  addReaction: (messageId, reaction) =>
    set((state) => {
      // Update in channel messages
      const updatedChannelMessages = { ...state.channelMessages }
      Object.keys(updatedChannelMessages).forEach((channelId) => {
        updatedChannelMessages[channelId] = updatedChannelMessages[channelId].map((msg) =>
          msg.id === messageId
            ? { ...msg, reactions: [...(msg.reactions || []), reaction] }
            : msg
        )
      })
      
      // Update in conversation messages
      const updatedConversationMessages = { ...state.conversationMessages }
      Object.keys(updatedConversationMessages).forEach((convId) => {
        updatedConversationMessages[convId] = updatedConversationMessages[convId].map((msg) =>
          msg.id === messageId
            ? { ...msg, reactions: [...(msg.reactions || []), reaction] }
            : msg
        )
      })
      
      return {
        channelMessages: updatedChannelMessages,
        conversationMessages: updatedConversationMessages,
      }
    }),
  
  removeReaction: (messageId, reactionId) =>
    set((state) => {
      // Update in channel messages
      const updatedChannelMessages = { ...state.channelMessages }
      Object.keys(updatedChannelMessages).forEach((channelId) => {
        updatedChannelMessages[channelId] = updatedChannelMessages[channelId].map((msg) =>
          msg.id === messageId
            ? { ...msg, reactions: msg.reactions?.filter((r) => r.id !== reactionId) || [] }
            : msg
        )
      })
      
      // Update in conversation messages
      const updatedConversationMessages = { ...state.conversationMessages }
      Object.keys(updatedConversationMessages).forEach((convId) => {
        updatedConversationMessages[convId] = updatedConversationMessages[convId].map((msg) =>
          msg.id === messageId
            ? { ...msg, reactions: msg.reactions?.filter((r) => r.id !== reactionId) || [] }
            : msg
        )
      })
      
      return {
        channelMessages: updatedChannelMessages,
        conversationMessages: updatedConversationMessages,
      }
    }),

  // Presence & Typing
  updateUserPresence: (userId, presence) =>
    set((state) => ({
      userPresence: {
        ...state.userPresence,
        [userId]: presence,
      },
    })),
  
  addTypingUser: (typingUser) =>
    set((state) => {
      const exists = state.typingUsers.some(
        (u) =>
          u.user_id === typingUser.user_id &&
          u.channel_id === typingUser.channel_id &&
          u.conversation_id === typingUser.conversation_id
      )
      
      if (exists) return state
      
      return {
        typingUsers: [...state.typingUsers, typingUser],
      }
    }),
  
  removeTypingUser: (userId, channelId, conversationId) =>
    set((state) => ({
      typingUsers: state.typingUsers.filter(
        (u) =>
          !(
            u.user_id === userId &&
            u.channel_id === channelId &&
            u.conversation_id === conversationId
          )
      ),
    })),

  // Unread & Mentions
  setUnreadCount: (type, id, count) =>
    set((state) => ({
      ...(type === 'channel'
        ? { unreadChannels: { ...state.unreadChannels, [id]: count } }
        : { unreadConversations: { ...state.unreadConversations, [id]: count } }),
    })),
  
  incrementUnreadCount: (type, id) =>
    set((state) => {
      const current =
        type === 'channel'
          ? state.unreadChannels[id] || 0
          : state.unreadConversations[id] || 0
      
      return type === 'channel'
        ? { unreadChannels: { ...state.unreadChannels, [id]: current + 1 } }
        : { unreadConversations: { ...state.unreadConversations, [id]: current + 1 } }
    }),
  
  clearUnreadCount: (type, id) =>
    set((state) => ({
      ...(type === 'channel'
        ? { unreadChannels: { ...state.unreadChannels, [id]: 0 } }
        : { unreadConversations: { ...state.unreadConversations, [id]: 0 } }),
    })),
  
  setMentions: (mentions) => set({ mentions }),
  
  addMention: (mention) =>
    set((state) => ({
      mentions: [...state.mentions, mention],
    })),
  
  markMentionRead: (mentionId) =>
    set((state) => ({
      mentions: state.mentions.map((m) =>
        m.id === mentionId ? { ...m, is_read: true } : m
      ),
    })),

  // UI Actions
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  
  setSearchOpen: (isOpen) => set({ isSearchOpen: isOpen }),
  
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Connection
  setConnected: (isConnected) => set({ isConnected }),
  
  setConnectionError: (error) => set({ connectionError: error }),

  // Utility
  reset: () => set(initialState),
}))

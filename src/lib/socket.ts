import { io, Socket } from 'socket.io-client'
import { useMessagingStore } from '@/store/messaging.store'
import {
  Message,
  MessageReaction,
  TypingUser,
  UserPresence,
  Channel,
} from '@/types/messaging.types'

class SocketManager {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000 // Start with 1 second

  // Initialize socket connection
  connect(token: string) {
    if (this.socket?.connected) {
      console.log('Socket already connected')
      return
    }

    const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 10000,
    })

    this.setupEventListeners()
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      useMessagingStore.getState().setConnected(false)
    }
  }

  // Get socket instance
  getSocket(): Socket | null {
    return this.socket
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false
  }

  // Setup all event listeners
  private setupEventListeners() {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', this.handleConnect.bind(this))
    this.socket.on('disconnect', this.handleDisconnect.bind(this))
    this.socket.on('connect_error', this.handleConnectError.bind(this))

    // Message events
    this.socket.on('new_message', this.handleNewMessage.bind(this))
    this.socket.on('message_edited', this.handleMessageEdited.bind(this))
    this.socket.on('message_deleted', this.handleMessageDeleted.bind(this))

    // Reaction events
    this.socket.on('reaction_added', this.handleReactionAdded.bind(this))
    this.socket.on('reaction_removed', this.handleReactionRemoved.bind(this))

    // Typing events
    this.socket.on('user_typing', this.handleUserTyping.bind(this))
    this.socket.on('user_stop_typing', this.handleUserStopTyping.bind(this))

    // Presence events
    this.socket.on('presence_update', this.handlePresenceUpdate.bind(this))

    // Channel events
    this.socket.on('channel_created', this.handleChannelCreated.bind(this))
    this.socket.on('channel_updated', this.handleChannelUpdated.bind(this))
    this.socket.on('channel_archived', this.handleChannelArchived.bind(this))
    this.socket.on('member_joined', this.handleMemberJoined.bind(this))
    this.socket.on('member_left', this.handleMemberLeft.bind(this))
    this.socket.on('member_added', this.handleMemberAdded.bind(this))
    this.socket.on('member_removed', this.handleMemberRemoved.bind(this))

    // Mention events
    this.socket.on('new_mention', this.handleNewMention.bind(this))
    this.socket.on('new_thread_reply', this.handleNewThreadReply.bind(this))
  }

  // Connection handlers
  private handleConnect() {
    console.log('Socket connected:', this.socket?.id)
    useMessagingStore.getState().setConnected(true)
    useMessagingStore.getState().setConnectionError(null)
    this.reconnectAttempts = 0
    this.reconnectDelay = 1000

    // Start heartbeat
    this.startHeartbeat()
  }

  private handleDisconnect(reason: string) {
    console.log('Socket disconnected:', reason)
    useMessagingStore.getState().setConnected(false)

    if (reason === 'io server disconnect') {
      // Server disconnected, try to reconnect
      this.socket?.connect()
    }
  }

  private handleConnectError(error: Error) {
    console.error('Socket connection error:', error)
    this.reconnectAttempts++

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      useMessagingStore.getState().setConnectionError(
        'Failed to connect to messaging server. Please refresh the page.'
      )
    } else {
      // Exponential backoff
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000)
    }
  }

  // Message handlers
  private handleNewMessage(data: { message: Message; channelId?: string; conversationId?: string; tempId?: string }) {
    const store = useMessagingStore.getState()
    const { message, channelId, conversationId, tempId } = data

    if (channelId) {
      // Remove temp message if exists
      if (tempId) {
        const messages = store.channelMessages[channelId] || []
        const filteredMessages = messages.filter((m) => m.id !== tempId)
        store.setChannelMessages(channelId, [...filteredMessages, message])
      } else {
        store.addChannelMessage(channelId, message)
      }

      // Increment unread if not active channel
      if (store.activeChannelId !== channelId) {
        store.incrementUnreadCount('channel', channelId)
      }
    } else if (conversationId) {
      // Remove temp message if exists
      if (tempId) {
        const messages = store.conversationMessages[conversationId] || []
        const filteredMessages = messages.filter((m) => m.id !== tempId)
        store.setConversationMessages(conversationId, [...filteredMessages, message])
      } else {
        store.addConversationMessage(conversationId, message)
      }

      // Increment unread if not active conversation
      if (store.activeConversationId !== conversationId) {
        store.incrementUnreadCount('conversation', conversationId)
      }
    }

    // Update thread if it's a reply
    if (message.parent_message_id) {
      store.addThreadMessage(message.parent_message_id, message)
      
      // Update reply count on parent message
      if (channelId) {
        store.updateChannelMessage(channelId, message.parent_message_id, {
          reply_count: (message.reply_count || 0) + 1,
        })
      } else if (conversationId) {
        store.updateConversationMessage(conversationId, message.parent_message_id, {
          reply_count: (message.reply_count || 0) + 1,
        })
      }
    }
  }

  private handleMessageEdited(data: { messageId: string; newContent: string; editedAt: string; channelId?: string; conversationId?: string }) {
    const store = useMessagingStore.getState()
    const { messageId, newContent, editedAt, channelId, conversationId } = data

    const updates = {
      content: newContent,
      edited_at: editedAt,
    }

    if (channelId) {
      store.updateChannelMessage(channelId, messageId, updates)
    } else if (conversationId) {
      store.updateConversationMessage(conversationId, messageId, updates)
    }
  }

  private handleMessageDeleted(data: { messageId: string; deletedAt: string; channelId?: string; conversationId?: string }) {
    const store = useMessagingStore.getState()
    const { messageId, channelId, conversationId } = data

    if (channelId) {
      store.deleteChannelMessage(channelId, messageId)
    } else if (conversationId) {
      store.deleteConversationMessage(conversationId, messageId)
    }
  }

  // Reaction handlers
  private handleReactionAdded(data: { messageId: string; userId: string; emoji: string; reactionId: string; user?: any }) {
    const store = useMessagingStore.getState()
    const reaction: MessageReaction = {
      id: data.reactionId,
      message_id: data.messageId,
      user_id: data.userId,
      emoji: data.emoji,
      created_at: new Date().toISOString(),
      user: data.user,
    }
    store.addReaction(data.messageId, reaction)
  }

  private handleReactionRemoved(data: { messageId: string; reactionId: string }) {
    const store = useMessagingStore.getState()
    store.removeReaction(data.messageId, data.reactionId)
  }

  // Typing handlers
  private handleUserTyping(data: { userId: string; userName: string; channelId?: string; conversationId?: string }) {
    const store = useMessagingStore.getState()
    const typingUser: TypingUser = {
      user_id: data.userId,
      user_name: data.userName,
      channel_id: data.channelId,
      conversation_id: data.conversationId,
    }
    store.addTypingUser(typingUser)

    // Auto-remove after 5 seconds
    setTimeout(() => {
      store.removeTypingUser(data.userId, data.channelId, data.conversationId)
    }, 5000)
  }

  private handleUserStopTyping(data: { userId: string; channelId?: string; conversationId?: string }) {
    const store = useMessagingStore.getState()
    store.removeTypingUser(data.userId, data.channelId, data.conversationId)
  }

  // Presence handlers
  private handlePresenceUpdate(data: { userId: string; status: UserPresence['status']; lastSeenAt: string }) {
    const store = useMessagingStore.getState()
    const presence: UserPresence = {
      user_id: data.userId,
      status: data.status,
      last_seen_at: data.lastSeenAt,
      updated_at: new Date().toISOString(),
    }
    store.updateUserPresence(data.userId, presence)
  }

  // Channel handlers
  private handleChannelCreated(data: { channel: Channel }) {
    const store = useMessagingStore.getState()
    store.addChannel(data.channel)
  }

  private handleChannelUpdated(data: { channelId: string; updates: Partial<Channel> }) {
    const store = useMessagingStore.getState()
    store.updateChannel(data.channelId, data.updates)
  }

  private handleChannelArchived(data: { channelId: string }) {
    const store = useMessagingStore.getState()
    store.updateChannel(data.channelId, { is_archived: true })
  }

  private handleMemberJoined(data: { channelId: string; userId: string; userName: string }) {
    console.log('Member joined:', data)
    // Show notification or update member list
  }

  private handleMemberLeft(data: { channelId: string; userId: string }) {
    console.log('Member left:', data)
    // Update member list
  }

  private handleMemberAdded(data: { channelId: string; member: any }) {
    console.log('Member added:', data)
    // Update member list
  }

  private handleMemberRemoved(data: { channelId: string; userId: string }) {
    console.log('Member removed:', data)
    // Update member list
  }

  // Mention handlers
  private handleNewMention(data: { message: Message; mentionId: string }) {
    const store = useMessagingStore.getState()
    store.addMention({
      id: data.mentionId,
      message_id: data.message.id,
      mentioned_user_id: '', // Will be set from current user
      created_at: new Date().toISOString(),
      is_read: false,
      message: data.message,
    })
  }

  private handleNewThreadReply(data: { message: Message; parentMessageId: string }) {
    const store = useMessagingStore.getState()
    store.addThreadMessage(data.parentMessageId, data.message)
  }

  // Heartbeat to maintain presence
  private startHeartbeat() {
    setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat', { userId: this.getCurrentUserId() })
      }
    }, 30000) // Every 30 seconds
  }

  private getCurrentUserId(): string {
    // Get from auth store or local storage
    return '' // TODO: Implement
  }

  // Public methods to emit events
  public joinChannel(channelId: string) {
    this.socket?.emit('join_channel', { channelId })
  }

  public leaveChannel(channelId: string) {
    this.socket?.emit('leave_channel', { channelId })
  }

  public sendMessage(data: {
    content: string
    channelId?: string
    conversationId?: string
    parentMessageId?: string
    tempId?: string
  }) {
    this.socket?.emit('send_message', data)
  }

  public editMessage(messageId: string, newContent: string) {
    this.socket?.emit('edit_message', { messageId, newContent })
  }

  public deleteMessage(messageId: string) {
    this.socket?.emit('delete_message', { messageId })
  }

  public addReaction(messageId: string, emoji: string) {
    this.socket?.emit('add_reaction', { messageId, emoji })
  }

  public removeReaction(messageId: string, reactionId: string) {
    this.socket?.emit('remove_reaction', { messageId, reactionId })
  }

  public startTyping(channelId?: string, conversationId?: string) {
    this.socket?.emit('typing_start', { channelId, conversationId })
  }

  public stopTyping(channelId?: string, conversationId?: string) {
    this.socket?.emit('typing_stop', { channelId, conversationId })
  }

  public updateStatus(status: UserPresence['status'], statusText?: string, statusEmoji?: string) {
    this.socket?.emit('status_change', { status, statusText, statusEmoji })
  }

  public markAsRead(channelId?: string, conversationId?: string, messageId?: string) {
    this.socket?.emit('mark_as_read', { channelId, conversationId, messageId })
  }
}

// Singleton instance
export const socketManager = new SocketManager()

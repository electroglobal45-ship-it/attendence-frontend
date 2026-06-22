import { useEffect, useState } from 'react'
import { socketManager } from '@/lib/socket'
import { useMessagingStore } from '@/store/messaging.store'

export function useSocket(token?: string) {
  const [isInitialized, setIsInitialized] = useState(false)
  const isConnected = useMessagingStore((state) => state.isConnected)
  const connectionError = useMessagingStore((state) => state.connectionError)

  useEffect(() => {
    if (token && !isInitialized) {
      socketManager.connect(token)
      setIsInitialized(true)
    }

    return () => {
      // Don't disconnect on unmount, keep connection alive
      // socketManager.disconnect()
    }
  }, [token, isInitialized])

  return {
    socket: socketManager.getSocket(),
    isConnected,
    connectionError,
    joinChannel: socketManager.joinChannel.bind(socketManager),
    leaveChannel: socketManager.leaveChannel.bind(socketManager),
    sendMessage: socketManager.sendMessage.bind(socketManager),
    editMessage: socketManager.editMessage.bind(socketManager),
    deleteMessage: socketManager.deleteMessage.bind(socketManager),
    addReaction: socketManager.addReaction.bind(socketManager),
    removeReaction: socketManager.removeReaction.bind(socketManager),
    startTyping: socketManager.startTyping.bind(socketManager),
    stopTyping: socketManager.stopTyping.bind(socketManager),
    updateStatus: socketManager.updateStatus.bind(socketManager),
    markAsRead: socketManager.markAsRead.bind(socketManager),
  }
}

// Hook for typing indicator with auto-stop
export function useTypingIndicator(channelId?: string, conversationId?: string) {
  const { startTyping, stopTyping } = useSocket()
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)

  const handleTyping = () => {
    // Clear previous timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }

    // Start typing
    startTyping(channelId, conversationId)

    // Auto-stop after 3 seconds
    const timeout = setTimeout(() => {
      stopTyping(channelId, conversationId)
    }, 3000)

    setTypingTimeout(timeout)
  }

  const handleStopTyping = () => {
    if (typingTimeout) {
      clearTimeout(typingTimeout)
      setTypingTimeout(null)
    }
    stopTyping(channelId, conversationId)
  }

  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout)
      }
      stopTyping(channelId, conversationId)
    }
  }, [channelId, conversationId])

  return { handleTyping, handleStopTyping }
}

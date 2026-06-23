'use client'

import { useEffect, useState } from 'react'
import { useMessagingStore } from '@/store/messaging.store'
import { useSocket } from '@/hooks/useSocket'
import { Hash, Lock, Users, Star, Pin, Settings, Video, Menu } from 'lucide-react'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { useMeetings } from '@/lib/meetings-context'
import { meetingsAPI } from '@/lib/tasks-api'
import { useAuth } from '@/lib/auth-context'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import TypingIndicator from './TypingIndicator'
import PinnedMessagesModal from './PinnedMessagesModal'
import MembersListModal from './MembersListModal'
import ChannelSettingsModal from './ChannelSettingsModal'

export default function ChatArea() {
  const activeChannelId = useMessagingStore((state) => state.activeChannelId)
  const activeConversationId = useMessagingStore((state) => state.activeConversationId)
  const channels = useMessagingStore((state) => state.channels)
  const conversations = useMessagingStore((state) => state.conversations)
  const setChannelMessages = useMessagingStore((state) => state.setChannelMessages)
  const setConversationMessages = useMessagingStore((state) => state.setConversationMessages)
  const setChannels = useMessagingStore((state) => state.setChannels)
  const setConversations = useMessagingStore((state) => state.setConversations)
  
  const { joinChannel } = useSocket()
  const { user: currentUser } = useAuth()
  const { joinMeeting } = useMeetings()

  const handleVideoCall = async () => {
    if (!activeConversation || !currentUser) return
    const otherUser = activeConversation.other_user
    if (!otherUser) return

    try {
      const title = `Direct Call: ${currentUser.name} & ${otherUser.name}`
      const res = await meetingsAPI.createMeeting({
        title,
        is_permanent: false,
        assigned_to: [otherUser.id]
      })

      if (res.success && res.data?.meeting) {
        const meeting = res.data.meeting
        
        // Start the meeting in the database first
        await meetingsAPI.startMeeting(meeting.id)
        
        // 1. Join meeting locally as host
        joinMeeting(meeting.id, meeting.room_name, meeting.title, true)

        // 2. Emit call event via socket to instantly ring the recipient
        const socket = require('@/lib/socket').socketManager.getSocket()
        socket?.emit('meeting:call_user', {
          targetUserId: otherUser.id,
          meetingId: meeting.id,
          roomName: meeting.room_name,
          title: meeting.title
        })
      }
    } catch (err) {
      console.error('Failed to initiate call:', err)
      alert('Failed to start video call. Please try again.')
    }
  }

  const [isStarred, setIsStarred] = useState(false)
  const [isPinnedModalOpen, setIsPinnedModalOpen] = useState(false)
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  // Get active channel or conversation
  const activeChannel = channels.find((ch) => ch.id === activeChannelId)
  const activeConversation = conversations.find((conv) => conv.id === activeConversationId)

  // Fetch and join channel messages
  useEffect(() => {
    if (activeChannelId) {
      joinChannel(activeChannelId)
      fetchChannelMessages(activeChannelId)
    }
  }, [activeChannelId])

  // Fetch and join conversation messages
  useEffect(() => {
    if (activeConversationId) {
      const socket = require('@/lib/socket').socketManager.getSocket()
      socket?.emit('join_conversation', { conversationId: activeConversationId })
      fetchConversationMessages(activeConversationId)
    }
  }, [activeConversationId])

  const fetchChannelMessages = async (channelId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${BACKEND_URL}/api/v1/messages/channels/${channelId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success && data.data?.messages) {
        setChannelMessages(channelId, data.data.messages)
      }
    } catch (error) {
      console.error('Failed to fetch channel messages:', error)
    }
  }

  const fetchConversationMessages = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${BACKEND_URL}/api/v1/messages/conversations/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success && data.data?.messages) {
        setConversationMessages(conversationId, data.data.messages)
      }
    } catch (error) {
      console.error('Failed to fetch conversation messages:', error)
    }
  }

  if (!activeChannel && !activeConversation) {
    return null
  }

  const handleStarToggle = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const endpoint = activeChannelId
        ? `${BACKEND_URL}/api/v1/channels/${activeChannelId}/star`
        : `${BACKEND_URL}/api/v1/conversations/${activeConversationId}/star`

      if (isStarred) {
        // Unstar
        await fetch(endpoint, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        setIsStarred(false)
        console.log('Unstarred:', activeChannel?.name || activeConversation?.other_user?.name)
      } else {
        // Star
        await fetch(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        setIsStarred(true)
        console.log('Starred:', activeChannel?.name || activeConversation?.other_user?.name)
      }
    } catch (error) {
      console.error('Failed to toggle star:', error)
    }
  }

  const handlePinnedMessages = () => {
    setIsPinnedModalOpen(true)
  }

  const handleShowMembers = () => {
    setIsMembersModalOpen(true)
  }

  const handleSettings = () => {
    setIsSettingsModalOpen(true)
  }

  const handleUpdateChannel = async () => {
    // Reload channels/conversations after settings update
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

      if (activeChannelId) {
        const response = await fetch(`${BACKEND_URL}/api/v1/channels`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (data.success && data.data?.channels) {
          setChannels(data.data.channels)
        }
      } else if (activeConversationId) {
        const response = await fetch(`${BACKEND_URL}/api/v1/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (data.success && data.data) {
          setConversations(Array.isArray(data.data) ? data.data : [])
        }
      }
    } catch (error) {
      console.error('Failed to reload channels:', error)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white h-full">
      {/* Chat Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Hamburger menu for mobile */}
          <button
            onClick={() => useSidebarStore.getState().setOpen(true)}
            className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg touch-manipulation cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {activeChannel ? (
            <>
              {activeChannel.type === 'private' ? (
                <Lock className="w-5 h-5 text-gray-600 flex-shrink-0" />
              ) : (
                <Hash className="w-5 h-5 text-gray-600 flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {activeChannel.name}
                </h1>
                {activeChannel.topic && (
                  <p className="text-sm text-gray-600 truncate">{activeChannel.topic}</p>
                )}
              </div>
            </>
          ) : activeConversation ? (
            <>
              <Users className="w-5 h-5 text-gray-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {activeConversation.type === 'direct'
                    ? activeConversation.other_user?.name || 'Direct Message'
                    : 'Group Chat'}
                </h1>
                {activeConversation.type === 'group' && (
                  <p className="text-sm text-gray-600">
                    {activeConversation.participants?.length || 0} members
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {activeConversation && activeConversation.type === 'direct' && (
            <button 
              onClick={handleVideoCall}
              className="p-2 hover:bg-slate-100 text-[#4A1F6F] rounded transition-colors" 
              title="Start Video Call"
            >
              <Video className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={handleStarToggle}
            className={`p-2 hover:bg-gray-100 rounded transition-colors ${isStarred ? 'text-yellow-500' : 'text-gray-600'}`}
            title={isStarred ? 'Remove star' : 'Star this channel'}
          >
            <Star className={`w-5 h-5 ${isStarred ? 'fill-current' : ''}`} />
          </button>
          <button 
            onClick={handlePinnedMessages}
            className="p-2 hover:bg-gray-100 rounded transition-colors" 
            title="View pinned messages"
          >
            <Pin className="w-5 h-5 text-gray-600" />
          </button>
          <button 
            onClick={handleShowMembers}
            className="p-2 hover:bg-gray-100 rounded transition-colors" 
            title="View members"
          >
            <Users className="w-5 h-5 text-gray-600" />
          </button>
          <button 
            onClick={handleSettings}
            className="p-2 hover:bg-gray-100 rounded transition-colors" 
            title="Channel settings"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      {/* Messages List */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        <div className="flex-1 overflow-hidden">
          <MessageList
            channelId={activeChannelId || undefined}
            conversationId={activeConversationId || undefined}
          />
        </div>
        
        {/* Typing Indicator */}
        <TypingIndicator
          channelId={activeChannelId || undefined}
          conversationId={activeConversationId || undefined}
        />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 bg-white">
        <MessageInput
          channelId={activeChannelId || undefined}
          conversationId={activeConversationId || undefined}
        />
      </div>

      {/* Modals */}
      <PinnedMessagesModal
        isOpen={isPinnedModalOpen}
        onClose={() => setIsPinnedModalOpen(false)}
        channelId={activeChannelId || undefined}
        conversationId={activeConversationId || undefined}
      />

      <MembersListModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        channelId={activeChannelId || undefined}
        conversationId={activeConversationId || undefined}
        channelName={activeChannel?.name || activeConversation?.other_user?.name}
      />

      <ChannelSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        channelId={activeChannelId || undefined}
        conversationId={activeConversationId || undefined}
        channelData={activeChannel}
        onUpdate={handleUpdateChannel}
      />
    </div>
  )
}

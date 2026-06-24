'use client'

import { useEffect, useState, useRef } from 'react'
import { useMessagingStore } from '@/store/messaging.store'
import { useSocket } from '@/hooks/useSocket'
import { Hash, Lock, Users, Star, Pin, Settings, Video, Menu, MoreVertical, Loader2 } from 'lucide-react'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { useMeetings } from '@/lib/meetings-context'
import { meetingsAPI } from '@/lib/tasks-api'
import { useAuth } from '@/lib/auth-context'
import { getBackendUrl } from '@/lib/socket'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import TypingIndicator from './TypingIndicator'
import PinnedMessagesModal from './PinnedMessagesModal'
import MembersListModal from './MembersListModal'
import ChannelSettingsModal from './ChannelSettingsModal'

const BACKEND_URL = getBackendUrl()

export default function ChatArea() {
  const activeChannelId = useMessagingStore((state) => state.activeChannelId)
  const activeConversationId = useMessagingStore((state) => state.activeConversationId)
  const channels = useMessagingStore((state) => state.channels)
  const conversations = useMessagingStore((state) => state.conversations)
  const setChannelMessages = useMessagingStore((state) => state.setChannelMessages)
  const setConversationMessages = useMessagingStore((state) => state.setConversationMessages)
  const setChannels = useMessagingStore((state) => state.setChannels)
  const setConversations = useMessagingStore((state) => state.setConversations)

  const { joinChannel, socket } = useSocket()
  const { user: currentUser } = useAuth()
  const { joinMeeting } = useMeetings()

  const [isStarred, setIsStarred] = useState(false)
  const [isPinnedModalOpen, setIsPinnedModalOpen] = useState(false)
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const actionsDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(e.target as Node)) {
        setIsActionsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get active channel or conversation
  const activeChannel = channels.find((ch) => ch.id === activeChannelId)
  const activeConversation = conversations.find((conv) => conv.id === activeConversationId)

  const fetchChannelMessages = async (channelId: string, silent = false) => {
    try {
      if (!silent) setIsLoadingMessages(true)
      const token = localStorage.getItem('authToken')
      if (!token) return
      const response = await fetch(`${BACKEND_URL}/api/v1/messages/channels/${channelId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success && data.data?.messages) {
        setChannelMessages(channelId, data.data.messages)
      }
    } catch (error) {
      console.error('Failed to fetch channel messages:', error)
    } finally {
      if (!silent) setIsLoadingMessages(false)
    }
  }

  const fetchConversationMessages = async (conversationId: string, silent = false) => {
    try {
      if (!silent) setIsLoadingMessages(true)
      const token = localStorage.getItem('authToken')
      if (!token) return
      const response = await fetch(`${BACKEND_URL}/api/v1/messages/conversations/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success && data.data?.messages) {
        setConversationMessages(conversationId, data.data.messages)
      }
    } catch (error) {
      console.error('Failed to fetch conversation messages:', error)
    } finally {
      if (!silent) setIsLoadingMessages(false)
    }
  }

  // Fetch on channel/conversation change
  useEffect(() => {
    if (activeChannelId) {
      joinChannel(activeChannelId)
      fetchChannelMessages(activeChannelId)
    }
  }, [activeChannelId])

  useEffect(() => {
    if (activeConversationId) {
      socket?.emit('join_conversation', { conversationId: activeConversationId })
      fetchConversationMessages(activeConversationId)
    }
  }, [activeConversationId, socket])

  // 8-second silent polling fallback — keeps messages in sync on mobile/slow socket
  useEffect(() => {
    if (!activeChannelId && !activeConversationId) return
    const interval = setInterval(() => {
      if (activeChannelId) fetchChannelMessages(activeChannelId, true)
      else if (activeConversationId) fetchConversationMessages(activeConversationId, true)
    }, 8000)
    return () => clearInterval(interval)
  }, [activeChannelId, activeConversationId])

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
        await meetingsAPI.startMeeting(meeting.id)
        joinMeeting(meeting.id, meeting.room_name, meeting.title, true)
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

  const handleStarToggle = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return
      const endpoint = activeChannelId
        ? `${BACKEND_URL}/api/v1/channels/${activeChannelId}/star`
        : `${BACKEND_URL}/api/v1/conversations/${activeConversationId}/star`
      if (isStarred) {
        await fetch(endpoint, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
        setIsStarred(false)
      } else {
        await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
        setIsStarred(true)
      }
    } catch (error) {
      console.error('Failed to toggle star:', error)
    }
  }

  const handleUpdateChannel = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return
      if (activeChannelId) {
        const response = await fetch(`${BACKEND_URL}/api/v1/channels`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (data.success && data.data?.channels) setChannels(data.data.channels)
      } else if (activeConversationId) {
        const response = await fetch(`${BACKEND_URL}/api/v1/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (data.success && data.data) setConversations(Array.isArray(data.data) ? data.data : [])
      }
    } catch (error) {
      console.error('Failed to reload channels:', error)
    }
  }

  if (!activeChannel && !activeConversation) return null

  return (
    <div className="flex-1 flex flex-col bg-[#150825] h-full">
      {/* ── Chat Header ── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-[#4A1F6F]/40 bg-[#1E0A2E] flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Mobile hamburger */}
          <button
            onClick={() => useSidebarStore.getState().setOpen(true)}
            className="lg:hidden p-1.5 text-purple-300 hover:text-white hover:bg-[#2D1152] rounded-lg transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {activeChannel ? (
            <>
              {activeChannel.type === 'private'
                ? <Lock className="w-5 h-5 text-[#D9A441] flex-shrink-0" />
                : <Hash className="w-5 h-5 text-[#D9A441] flex-shrink-0" />
              }
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-bold text-white truncate">{activeChannel.name}</h1>
                {activeChannel.topic && (
                  <p className="text-xs text-purple-300 truncate">{activeChannel.topic}</p>
                )}
              </div>
            </>
          ) : activeConversation ? (
            <>
              <div className="w-8 h-8 rounded-full bg-[#4A1F6F] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">
                  {(activeConversation.other_user?.name || 'U').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-bold text-white truncate">
                  {activeConversation.type === 'direct'
                    ? activeConversation.other_user?.name || 'Direct Message'
                    : 'Group Chat'}
                </h1>
                {activeConversation.type === 'group' && (
                  <p className="text-xs text-purple-300">
                    {activeConversation.participants?.length || 0} members
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Header Actions — 3-dot dropdown for all screens */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="relative" ref={actionsDropdownRef}>
            <button
              onClick={() => setIsActionsDropdownOpen(v => !v)}
              className={`p-2 rounded-lg transition-colors ${isActionsDropdownOpen ? 'bg-[#4A1F6F] text-white' : 'text-purple-300 hover:text-white hover:bg-[#2D1152]'}`}
              title="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {isActionsDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-[#2D1152] border border-[#4A1F6F]/40 rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                {activeConversation?.type === 'direct' && (
                  <button
                    onClick={() => { handleVideoCall(); setIsActionsDropdownOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-purple-100 hover:bg-[#4A1F6F]/50 transition-colors"
                  >
                    <Video className="w-4 h-4 text-[#D9A441]" /> Start Video Call
                  </button>
                )}
                <button
                  onClick={() => { handleStarToggle(); setIsActionsDropdownOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-purple-100 hover:bg-[#4A1F6F]/50 transition-colors"
                >
                  <Star className={`w-4 h-4 ${isStarred ? 'fill-[#D9A441] text-[#D9A441]' : 'text-purple-300'}`} />
                  {isStarred ? 'Remove Star' : 'Star'}
                </button>
                <button
                  onClick={() => { setIsPinnedModalOpen(true); setIsActionsDropdownOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-purple-100 hover:bg-[#4A1F6F]/50 transition-colors"
                >
                  <Pin className="w-4 h-4 text-purple-300" /> Pinned Messages
                </button>
                <button
                  onClick={() => { setIsMembersModalOpen(true); setIsActionsDropdownOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-purple-100 hover:bg-[#4A1F6F]/50 transition-colors"
                >
                  <Users className="w-4 h-4 text-purple-300" /> Members
                </button>
                <div className="border-t border-[#4A1F6F]/40 my-1" />
                <button
                  onClick={() => { setIsSettingsModalOpen(true); setIsActionsDropdownOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-purple-100 hover:bg-[#4A1F6F]/50 transition-colors"
                >
                  <Settings className="w-4 h-4 text-purple-300" /> Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Messages List */}
      <div className="flex-1 overflow-hidden flex flex-col bg-[#150825]">
        <div className="flex-1 overflow-hidden">
          <MessageList
            channelId={activeChannelId || undefined}
            conversationId={activeConversationId || undefined}
            isLoading={isLoadingMessages}
          />
        </div>
        <TypingIndicator
          channelId={activeChannelId || undefined}
          conversationId={activeConversationId || undefined}
        />
      </div>

      {/* Message Input */}
      <div className="border-t border-[#4A1F6F]/30 bg-[#1E0A2E]">
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

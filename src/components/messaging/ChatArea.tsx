'use client'

import { useEffect, useState, useRef } from 'react'
import { useMessagingStore } from '@/store/messaging.store'
import { useSocket } from '@/hooks/useSocket'
import { Hash, Lock, Users, Star, Pin, Settings, Video, Menu, MoreVertical, Loader2, Trash2, Search, X } from 'lucide-react'
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

  const isSearchOpen = useMessagingStore((state) => state.isSearchOpen)
  const setSearchOpen = useMessagingStore((state) => state.setSearchOpen)
  const searchQuery = useMessagingStore((state) => state.searchQuery)
  const setSearchQuery = useMessagingStore((state) => state.setSearchQuery)
  const clearChatForSelf = useMessagingStore((state) => state.clearChatForSelf)

  const { joinChannel, socket } = useSocket()
  const { user: currentUser } = useAuth()
  const { joinMeeting } = useMeetings()

  const [isStarred, setIsStarred] = useState(false)
  const [isPinnedModalOpen, setIsPinnedModalOpen] = useState(false)
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
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

  const handleDeleteConversation = () => {
    setShowDeleteConfirm(true)
  }

  const confirmDeleteConversation = async () => {
    if (!activeChannelId && !activeConversationId) return
    setIsDeleting(true)
    try {
      if (activeChannelId) {
        clearChatForSelf('channel', activeChannelId)
      } else if (activeConversationId) {
        clearChatForSelf('conversation', activeConversationId)
      }
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Failed to clear chat:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!activeChannel && !activeConversation) return null

  return (
    <div className="flex-1 flex flex-col bg-[#150825] h-full">
      {/* ── Chat Header ── */}
      <header className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-[#4A1F6F]/40 bg-[#1E0A2E] flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          {/* Mobile Back Button (to clear active chat and go back to Inbox view) */}
          <button
            onClick={() => {
              useMessagingStore.getState().setActiveChannel(null)
              useMessagingStore.getState().setActiveConversation(null)
            }}
            className="lg:hidden p-1.5 text-purple-300 hover:text-white hover:bg-[#2D1152] rounded-lg transition-colors shrink-0"
            title="Back to inbox"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>

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
                <h1 className="text-sm sm:text-base font-bold text-white truncate">{activeChannel.name}</h1>
                {activeChannel.topic && (
                  <p className="text-xs text-purple-300 truncate hidden sm:block">{activeChannel.topic}</p>
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
                <h1 className="text-sm sm:text-base font-bold text-white truncate">
                  {activeConversation.type === 'direct'
                    ? activeConversation.other_user?.name || 'Direct Message'
                    : activeConversation.name || activeConversation.participants
                        ?.filter((p: any) => p.id !== (currentUser?.id || (typeof window !== 'undefined' ? localStorage.getItem('userId') : null)))
                        .map((p: any) => p.name?.split(' ')[0])
                        .join(', ') || 'Group Chat'}
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

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Video Call — ONLY for DMs (Icon only, no text label as requested) */}
          {activeConversation?.type === 'direct' && (
            <button
              onClick={handleVideoCall}
              className="p-2.5 rounded-xl transition-colors text-purple-300 hover:text-white hover:bg-[#2D1152] flex items-center justify-center cursor-pointer"
              title="Start Video Call"
            >
              <Video className="w-5 h-5 text-purple-300 hover:text-white transition-colors" />
            </button>
          )}

          {/* Vertical 3-Dots Dropdown Menu */}
          <div className="relative" ref={actionsDropdownRef}>
            <button
              onClick={() => setIsActionsDropdownOpen(!isActionsDropdownOpen)}
              className={`p-2.5 rounded-xl transition-colors flex items-center justify-center cursor-pointer ${
                isActionsDropdownOpen ? 'bg-[#4A1F6F] text-white' : 'text-purple-300 hover:text-white hover:bg-[#2D1152]'
              }`}
              title="More Options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown Menu */}
            {isActionsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-[#1E0A2E] border border-[#4A1F6F]/60 rounded-2xl shadow-2xl py-2 z-[100] animate-fade-in text-sm font-medium">
                {/* Search Chat Option */}
                <button
                  onClick={() => {
                    setSearchOpen(!isSearchOpen)
                    setIsActionsDropdownOpen(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-purple-200 hover:text-white hover:bg-[#2D1152] flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <Search className="w-4 h-4 text-purple-300" />
                  <span>Search Chat</span>
                </button>

                {/* Members / Details Option — Hide for DMs */}
                {activeChannel ? (
                  <>
                    <button
                      onClick={() => {
                        const ev = new CustomEvent('toggle-channel-info')
                        window.dispatchEvent(ev)
                        setIsActionsDropdownOpen(false)
                      }}
                      className="w-full px-4 py-2.5 text-left text-purple-200 hover:text-white hover:bg-[#2D1152] flex items-center gap-3 transition-colors cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-purple-300" />
                      <span>Channel Details</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsSettingsModalOpen(true)
                        setIsActionsDropdownOpen(false)
                      }}
                      className="w-full px-4 py-2.5 text-left text-purple-200 hover:text-white hover:bg-[#2D1152] flex items-center gap-3 transition-colors cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-purple-300" />
                      <span>Channel Settings</span>
                    </button>
                  </>
                ) : activeConversation?.type === 'group' ? (
                  <button
                    onClick={() => {
                      setIsMembersModalOpen(true)
                      setIsActionsDropdownOpen(false)
                    }}
                    className="w-full px-4 py-2.5 text-left text-purple-200 hover:text-white hover:bg-[#2D1152] flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-purple-300" />
                    <span>Group Members</span>
                  </button>
                ) : null}

                <div className="my-1 border-t border-[#4A1F6F]/40" />

                {/* Delete Chat Option */}
                <button
                  onClick={() => {
                    handleDeleteConversation()
                    setIsActionsDropdownOpen(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-red-400 hover:text-red-300 hover:bg-red-950/40 flex items-center gap-3 transition-colors cursor-pointer font-semibold"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>Delete Chat</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* In-Chat Search Bar */}
      {isSearchOpen && (
        <div className="px-4 py-2.5 border-b border-[#4A1F6F]/40 bg-[#17082A] flex items-center justify-between gap-3 animate-fade-in flex-shrink-0 min-h-[50px]">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#2D1152] flex items-center justify-center flex-shrink-0">
              <Search className="w-4 h-4 text-purple-300" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages in this chat..."
              className="flex-1 bg-transparent text-sm text-white placeholder-purple-400/60 outline-none h-9"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="w-8 h-8 rounded-lg hover:bg-[#2D1152] text-purple-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setSearchOpen(false)}
              className="h-8 px-3 rounded-lg bg-[#2D1152] hover:bg-[#4A1F6F] text-purple-200 hover:text-white text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 overflow-hidden flex flex-col bg-[#150825]">
        <MessageList
          channelId={activeChannelId || undefined}
          conversationId={activeConversationId || undefined}
          isLoading={isLoadingMessages}
        />
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

      {/* Custom Delete Conversation Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[3000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col p-6 animate-fade-in text-center font-sans">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Clear Chat History?</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Are you sure you want to clear this chat? This will remove messages from your view only.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-gray-700 text-sm font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteConversation}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

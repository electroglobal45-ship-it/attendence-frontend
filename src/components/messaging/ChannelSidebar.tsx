'use client'

import { useEffect, useState } from 'react'
import { useMessagingStore } from '@/store/messaging.store'
import { Hash, Lock, Plus, ChevronDown, ChevronRight, MessageSquare, Search, Trash2 } from 'lucide-react'
import { PresenceIndicator } from './PresenceIndicator'
import CreateChannelModal from './CreateChannelModal'
import NewMessageModal from './NewMessageModal'
import { getBackendUrl } from '@/lib/socket'

const BACKEND_URL = getBackendUrl()

export default function ChannelSidebar() {
  const channels = useMessagingStore((state) => state.channels)
  const conversations = useMessagingStore((state) => state.conversations)
  const activeChannelId = useMessagingStore((state) => state.activeChannelId)
  const activeConversationId = useMessagingStore((state) => state.activeConversationId)
  const unreadChannels = useMessagingStore((state) => state.unreadChannels)
  const unreadConversations = useMessagingStore((state) => state.unreadConversations)
  const setActiveChannel = useMessagingStore((state) => state.setActiveChannel)
  const setActiveConversation = useMessagingStore((state) => state.setActiveConversation)
  const [channelsExpanded, setChannelsExpanded] = useState(true)
  const [dmsExpanded, setDmsExpanded] = useState(true)
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false)
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false)

  const getLoggedUserId = () => {
    if (typeof window === 'undefined') return null
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        if (parsed?.id) return String(parsed.id)
      } catch (e) {
        console.error(e)
      }
    }
    return localStorage.getItem('userId')
  }
  const loggedUserId = getLoggedUserId()
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null)
  const [isDeletingConv, setIsDeletingConv] = useState(false)
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null)
  const [isDeletingChannel, setIsDeletingChannel] = useState(false)

  const handleDeleteConversation = (conversationId: string) => {
    setDeletingConvId(conversationId)
  }

  const confirmDeleteConv = async () => {
    if (!deletingConvId) return
    setIsDeletingConv(true)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch(`${BACKEND_URL}/api/v1/conversations/${deletingConvId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success || response.ok) {
        const conversationsList = useMessagingStore.getState().conversations
        useMessagingStore.getState().setConversations(conversationsList.filter(c => c.id !== deletingConvId))
        if (activeConversationId === deletingConvId) {
          useMessagingStore.getState().setActiveConversation(null)
        }
        setDeletingConvId(null)
      } else {
        alert(data.message || 'Failed to delete conversation')
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      alert('An error occurred while deleting the conversation')
    } finally {
      setIsDeletingConv(false)
    }
  }

  const handleDeleteChannel = (channelId: string) => {
    setDeletingChannelId(channelId)
  }

  const confirmDeleteChannel = async () => {
    if (!deletingChannelId) return
    setIsDeletingChannel(true)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch(`${BACKEND_URL}/api/v1/channels/${deletingChannelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success || response.ok) {
        const channelsList = useMessagingStore.getState().channels
        useMessagingStore.getState().setChannels(channelsList.filter(c => c.id !== deletingChannelId))
        if (activeChannelId === deletingChannelId) {
          useMessagingStore.getState().setActiveChannel(null)
        }
        setDeletingChannelId(null)
      } else {
        alert(data.message || 'Failed to delete channel')
      }
    } catch (error) {
      console.error('Failed to delete channel:', error)
      alert('An error occurred while deleting the channel')
    } finally {
      setIsDeletingChannel(false)
    }
  }

  const publicChannels = channels.filter((ch) => ch.type === 'public' && !ch.is_archived)
  const privateChannels = channels.filter((ch) => ch.type === 'private' && !ch.is_archived)

  const filteredPublicChannels = publicChannels.filter(ch =>
    (ch.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredPrivateChannels = privateChannels.filter(ch =>
    (ch.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredConversations = conversations.filter(conv => {
    const name = conv.type === 'direct'
      ? conv.other_user?.name
      : conv.name || conv.participants
          ?.filter((p: any) => p.id !== loggedUserId)
          .map((p: any) => p.name)
          .join(', ')
    return name?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="flex flex-col h-full bg-[#1E0A2E] border-r border-[#4A1F6F]/30">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#4A1F6F]/30">
        <h2 className="text-sm font-bold text-white tracking-wide">CHANNELS & DMS</h2>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-[#4A1F6F]/20">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#4A1F6F]/40 rounded-lg bg-[#2D1152] text-white placeholder-purple-400 focus:outline-none focus:ring-1 focus:ring-[#D9A441]/40 focus:border-[#D9A441]/40 transition-colors"
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto py-1">
        {/* Channels Section */}
        <div className="py-1">
          <button
            onClick={() => setChannelsExpanded(!channelsExpanded)}
            className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-[#2D1152]/50 transition-colors group"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300/60">Channels</span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsCreateChannelOpen(true)
                }}
                className="p-0.5 hover:bg-[#4A1F6F]/60 rounded transition-all text-purple-400 hover:text-white"
              >
                <Plus className="w-3 h-3" />
              </button>
              {channelsExpanded
                ? <ChevronDown className="w-3 h-3 text-purple-400" />
                : <ChevronRight className="w-3 h-3 text-purple-400" />
              }
            </div>
          </button>

          {channelsExpanded && (
            <div className="mt-0.5">
              {filteredPublicChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  icon={<Hash className="w-3.5 h-3.5" />}
                  name={channel.name}
                  isActive={activeChannelId === channel.id}
                  unreadCount={unreadChannels[channel.id] || 0}
                  onClick={() => setActiveChannel(channel.id)}
                  onDelete={() => handleDeleteChannel(channel.id)}
                />
              ))}
              {filteredPrivateChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  icon={<Lock className="w-3.5 h-3.5" />}
                  name={channel.name}
                  isActive={activeChannelId === channel.id}
                  unreadCount={unreadChannels[channel.id] || 0}
                  onClick={() => setActiveChannel(channel.id)}
                  onDelete={() => handleDeleteChannel(channel.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Direct Messages Section */}
        <div className="py-1">
          <button
            onClick={() => setDmsExpanded(!dmsExpanded)}
            className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-[#2D1152]/50 transition-colors"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300/60">Direct Messages</span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsNewMessageOpen(true)
                }}
                className="p-0.5 hover:bg-[#4A1F6F]/60 rounded transition-all text-purple-400 hover:text-white"
              >
                <Plus className="w-3 h-3" />
              </button>
              {dmsExpanded
                ? <ChevronDown className="w-3 h-3 text-purple-400" />
                : <ChevronRight className="w-3 h-3 text-purple-400" />
              }
            </div>
          </button>

          {dmsExpanded && (
            <div className="mt-0.5">
              {filteredConversations.map((conversation) => {
                const otherUserId = conversation.other_user?.id
                return (
                  <ChannelItem
                    key={conversation.id}
                    icon={<MessageSquare className="w-3.5 h-3.5" />}
                    name={
                      conversation.type === 'direct'
                        ? conversation.other_user?.name || 'Direct Message'
                        : conversation.name || conversation.participants
                            ?.filter((p: any) => p.id !== loggedUserId)
                            .map((p: any) => p.name?.split(' ')[0])
                            .join(', ') || 'Group Chat'
                    }
                    isActive={activeConversationId === conversation.id}
                    unreadCount={unreadConversations[conversation.id] || 0}
                    onClick={() => setActiveConversation(conversation.id)}
                    userId={conversation.type === 'direct' ? otherUserId : undefined}
                    onDelete={() => handleDeleteConversation(conversation.id)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
      />
      <NewMessageModal
        isOpen={isNewMessageOpen}
        onClose={() => setIsNewMessageOpen(false)}
      />

      {/* Custom Delete Conversation Confirmation Modal */}
      {deletingConvId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[3000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col p-6 animate-fade-in text-center font-sans">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Conversation?</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Are you sure you want to delete this chat? All messages and attachments will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingConvId(null)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-gray-700 text-sm font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteConv}
                disabled={isDeletingConv}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDeletingConv ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Channel Confirmation Modal */}
      {deletingChannelId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[3000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col p-6 animate-fade-in text-center font-sans">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Channel?</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Are you sure you want to delete this channel? All messages and attachments in this channel will be permanently deleted for all members.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingChannelId(null)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-gray-700 text-sm font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteChannel}
                disabled={isDeletingChannel}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDeletingChannel ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface ChannelItemProps {
  icon: React.ReactNode
  name: string
  isActive: boolean
  unreadCount: number
  onClick: () => void
  userId?: string
  onDelete?: () => void
}

function ChannelItem({ icon, name, isActive, unreadCount, onClick, userId, onDelete }: ChannelItemProps) {
  return (
    <div className="relative group w-full">
      <button
        onClick={onClick}
        className={`
          w-full flex items-center gap-2 px-4 py-1.5 text-sm transition-colors relative
          ${isActive
            ? 'bg-[#4A1F6F] text-white'
            : 'text-purple-300 hover:bg-[#2D1152] hover:text-white'
          }
        `}
      >
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#D9A441] rounded-r" />
        )}
        <span className={`flex-shrink-0 ${isActive ? 'text-[#D9A441]' : 'text-purple-400 group-hover:text-purple-200'}`}>
          {icon}
        </span>
        <span className="flex-1 text-left truncate text-xs font-medium pr-6">{name}</span>

        {userId && (
          <div className="flex-shrink-0 pr-1">
            <PresenceIndicator userId={userId} size="sm" />
          </div>
        )}

        {unreadCount > 0 && (
          <span className="flex-shrink-0 bg-[#D9A441] text-[#1E0A2E] text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center pr-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#4A1F6F]/60 rounded text-purple-400 hover:text-red-400 opacity-60 hover:opacity-100 transition-opacity z-10"
          title="Delete chat"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

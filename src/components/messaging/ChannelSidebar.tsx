'use client'

import { useEffect, useState } from 'react'
import { useMessagingStore } from '@/store/messaging.store'
import { Hash, Lock, Plus, ChevronDown, ChevronRight, MessageSquare, Search } from 'lucide-react'
import { PresenceIndicator } from './PresenceIndicator'
import CreateChannelModal from './CreateChannelModal'
import NewMessageModal from './NewMessageModal'

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
  const [searchQuery, setSearchQuery] = useState('')

  // Separate public and private channels
  const publicChannels = channels.filter((ch) => ch.type === 'public' && !ch.is_archived)
  const privateChannels = channels.filter((ch) => ch.type === 'private' && !ch.is_archived)

  // Filter based on search
  const filteredPublicChannels = publicChannels.filter(ch =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredPrivateChannels = privateChannels.filter(ch =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredConversations = conversations.filter(conv =>
    conv.other_user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-gray-900">Messages</h2>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-200 bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {/* Channels Section */}
        <div className="py-2">
          <button
            onClick={() => setChannelsExpanded(!channelsExpanded)}
            className="w-full flex items-center justify-between px-4 py-1 hover:bg-gray-100 transition-colors group"
          >
            <span className="text-sm font-semibold text-gray-700">Channels</span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsCreateChannelOpen(true)
                }}
                className="p-1 hover:bg-gray-200 rounded transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-gray-600" />
              </button>
              {channelsExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </div>
          </button>

          {channelsExpanded && (
            <div className="mt-1">
              {filteredPublicChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  icon={<Hash className="w-4 h-4" />}
                  name={channel.name}
                  isActive={activeChannelId === channel.id}
                  unreadCount={unreadChannels[channel.id] || 0}
                  onClick={() => setActiveChannel(channel.id)}
                />
              ))}
              {filteredPrivateChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  icon={<Lock className="w-4 h-4" />}
                  name={channel.name}
                  isActive={activeChannelId === channel.id}
                  unreadCount={unreadChannels[channel.id] || 0}
                  onClick={() => setActiveChannel(channel.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Direct Messages Section */}
        <div className="py-2">
          <button
            onClick={() => setDmsExpanded(!dmsExpanded)}
            className="w-full flex items-center justify-between px-4 py-1 hover:bg-gray-100 transition-colors group"
          >
            <span className="text-sm font-semibold text-gray-700">Direct Messages</span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsNewMessageOpen(true)
                }}
                className="p-1 hover:bg-gray-200 rounded transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-gray-600" />
              </button>
              {dmsExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </div>
          </button>

          {dmsExpanded && (
            <div className="mt-1">
              {filteredConversations.map((conversation) => {
                const otherUserId = conversation.other_user?.id
                return (
                  <ChannelItem
                    key={conversation.id}
                    icon={<MessageSquare className="w-4 h-4" />}
                    name={
                      conversation.type === 'direct'
                        ? conversation.other_user?.name || 'Direct Message'
                        : conversation.participants
                            ?.filter((p: any) => p.id !== (typeof window !== 'undefined' ? localStorage.getItem('userId') : null))
                            .map((p: any) => p.name?.split(' ')[0])
                            .join(', ') || 'Group Chat'
                    }
                    isActive={activeConversationId === conversation.id}
                    unreadCount={unreadConversations[conversation.id] || 0}
                    onClick={() => setActiveConversation(conversation.id)}
                    userId={conversation.type === 'direct' ? otherUserId : undefined}
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
}

function ChannelItem({ icon, name, isActive, unreadCount, onClick, userId }: ChannelItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2 px-4 py-1.5 text-sm group
        transition-colors relative
        ${
          isActive
            ? 'bg-blue-100 text-blue-600 font-medium'
            : 'text-gray-700 hover:bg-gray-100'
        }
      `}
    >
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r" />
      )}
      
      <span className={`flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
        {icon}
      </span>
      <span className="flex-1 text-left truncate">{name}</span>
      
      {userId && (
        <div className="flex-shrink-0">
          <PresenceIndicator userId={userId} size="sm" />
        </div>
      )}
      
      {unreadCount > 0 && (
        <span className="flex-shrink-0 bg-gray-900 text-white text-xs font-bold px-1.5 py-0.5 rounded min-w-[20px] text-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}

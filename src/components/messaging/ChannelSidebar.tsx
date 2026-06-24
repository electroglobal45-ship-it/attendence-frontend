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

  const publicChannels = channels.filter((ch) => ch.type === 'public' && !ch.is_archived)
  const privateChannels = channels.filter((ch) => ch.type === 'private' && !ch.is_archived)

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
        w-full flex items-center gap-2 px-4 py-1.5 text-sm group transition-colors relative
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
      <span className="flex-1 text-left truncate text-xs font-medium">{name}</span>

      {userId && (
        <div className="flex-shrink-0">
          <PresenceIndicator userId={userId} size="sm" />
        </div>
      )}

      {unreadCount > 0 && (
        <span className="flex-shrink-0 bg-[#D9A441] text-[#1E0A2E] text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}

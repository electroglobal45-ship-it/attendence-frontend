'use client'

import { useState, useEffect } from 'react'
import { X, Search, MessageSquare, Users, Check } from 'lucide-react'
import { useMessagingStore } from '@/store/messaging.store'
import { getBackendUrl } from '@/lib/socket'
import { useAuth } from '@/lib/auth-context'

const BACKEND_URL = getBackendUrl()

interface User {
  id: string
  name: string
  email: string
  role?: string
}

interface NewMessageModalProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'dm' | 'group'

export default function NewMessageModal({ isOpen, onClose }: NewMessageModalProps) {
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('dm')
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [groupName, setGroupName] = useState('')
  const [error, setError] = useState('')

  const conversations = useMessagingStore((state) => state.conversations)

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      setActiveTab('dm')
      setSelectedUsers([])
      setGroupName('')
      setSearchQuery('')
    }
  }, [isOpen])

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const filtered = users.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      )
      setFilteredUsers(filtered)
    } else {
      setFilteredUsers(users)
    }
  }, [searchQuery, users])

  const fetchUsers = async () => {
    setIsLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('authToken')
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(`${BACKEND_URL}/api/v1/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch users')
      }

      const usersList = Array.isArray(data.data?.users) ? data.data.users : []
      
      // Filter out current user from selection list
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
      
      const currentUserId = currentUser?.id || getLoggedUserId()
      const filtered = usersList.filter((u: any) => String(u.id) !== String(currentUserId))
      setUsers(filtered)
      setFilteredUsers(filtered)
    } catch (err: any) {
      console.error('Fetch users error:', err)
      setError(err.message || 'Failed to load users')
      setUsers([])
      setFilteredUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectUser = async (userId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) throw new Error('Not authenticated')

      // Check if conversation already exists
      const existingConversation = conversations.find(
        (conv) => conv.type === 'direct' && conv.other_user?.id === userId
      )

      if (existingConversation) {
        // Open existing conversation
        useMessagingStore.getState().setActiveConversation(existingConversation.id)
        onClose()
        return
      }

      // Create new conversation
      const response = await fetch(`${BACKEND_URL}/api/v1/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'direct',
          participant_ids: [userId],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create conversation')
      }

      if (data.data) {
        useMessagingStore.getState().addConversation(data.data)
        useMessagingStore.getState().setActiveConversation(data.data.id)
      }

      onClose()
    } catch (err: any) {
      console.error('Create conversation error:', err)
      setError(err.message || 'Failed to start conversation')
    }
  }

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleCreateGroup = async () => {
    if (selectedUsers.length === 0) return
    setIsCreatingGroup(true)
    setError('')

    try {
      const token = localStorage.getItem('authToken')
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(`${BACKEND_URL}/api/v1/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'group',
          participant_ids: selectedUsers,
          name: groupName.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create group chat')
      }

      if (data.data) {
        useMessagingStore.getState().addConversation(data.data)
        useMessagingStore.getState().setActiveConversation(data.data.id)
      }

      onClose()
    } catch (err: any) {
      console.error('Create group conversation error:', err)
      setError(err.message || 'Failed to start group chat')
    } finally {
      setIsCreatingGroup(false)
    }
  }

  const selectedUserObjects = users.filter(u => selectedUsers.includes(u.id))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[600px] flex flex-col overflow-hidden animate-fade-in font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">New Message</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-100 bg-gray-50/50 p-1 flex-shrink-0">
          <button
            onClick={() => {
              setActiveTab('dm')
              setSelectedUsers([])
            }}
            className={`flex-1 py-2 text-center text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'dm'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Direct Message
          </button>
          <button
            onClick={() => setActiveTab('group')}
            className={`flex-1 py-2 text-center text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'group'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Group Chat
          </button>
        </div>

        {/* Selected Member Chips (Only in Group tab) */}
        {activeTab === 'group' && selectedUserObjects.length > 0 && (
          <div className="px-5 py-2.5 bg-indigo-50/40 border-b border-indigo-100 flex-shrink-0">
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1.5">
              Selected members ({selectedUserObjects.length})
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-[72px] overflow-y-auto">
              {selectedUserObjects.map(user => (
                <div key={user.id} className="inline-flex items-center gap-1 bg-indigo-600 text-white rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  <span>{user.name}</span>
                  <button onClick={() => handleToggleUser(user.id)} className="hover:text-indigo-200">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Group Name Field (Only in Group tab) */}
        {activeTab === 'group' && (
          <div className="px-6 pt-3 pb-2 border-b border-gray-100">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Group Chat Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Sales Team, Developers (Optional)"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900 bg-white"
            />
          </div>
        )}

        {/* Search */}
        <div className="p-4 border-b border-gray-100 flex-shrink-0">
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name or email..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50/50"
              autoFocus
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="px-6 py-4">
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            </div>
          ) : (
            <div>
              {filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <MessageSquare className="w-10 h-10 mb-2.5 text-gray-300" />
                  <p className="text-sm">
                    {searchQuery ? 'No users found' : 'No users available'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => {
                    const isChecked = selectedUsers.includes(user.id)
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          if (activeTab === 'group') {
                            handleToggleUser(user.id)
                          } else {
                            handleSelectUser(user.id)
                          }
                        }}
                        className={`w-full flex items-center justify-between px-6 py-3 transition text-left cursor-pointer ${
                          isChecked ? 'bg-indigo-50/30' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Avatar */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 transition-colors ${
                            isChecked ? 'bg-indigo-600' : 'bg-gray-400'
                          }`}>
                            {user.name[0]?.toUpperCase() || 'U'}
                          </div>

                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 truncate text-sm">
                              {user.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {user.email}
                            </div>
                          </div>

                          {/* Role Badge */}
                          {user.role && (
                            <div className="flex-shrink-0">
                              <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 rounded">
                                {user.role}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Selection status */}
                        {activeTab === 'group' ? (
                          <div className={`w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isChecked 
                              ? 'border-indigo-600 bg-indigo-600 text-white' 
                              : 'border-gray-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                          </div>
                        ) : (
                          <div className="text-indigo-600 font-semibold text-xs opacity-0 hover:opacity-100 transition group-hover:opacity-100">
                            Chat →
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer for Group Creation */}
        {activeTab === 'group' && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={handleCreateGroup}
              disabled={isCreatingGroup || selectedUsers.length === 0}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl font-bold transition-all disabled:cursor-not-allowed flex items-center justify-center shadow-md cursor-pointer"
            >
              {isCreatingGroup ? 'Creating Group...' : `Create Group Chat (${selectedUsers.length} selected)`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

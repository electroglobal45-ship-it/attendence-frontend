'use client'

import { useState, useEffect } from 'react'
import { X, Search, MessageSquare, Users, ArrowLeft, Check } from 'lucide-react'
import { useMessagingStore } from '@/store/messaging.store'

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

export default function NewMessageModal({ isOpen, onClose }: NewMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [isGroupMode, setIsGroupMode] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [error, setError] = useState('')

  const conversations = useMessagingStore((state) => state.conversations)

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      setIsGroupMode(false)
      setSelectedUsers([])
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

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      
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
      const currentUserId = localStorage.getItem('userId')
      setUsers(usersList.filter((u: any) => u.id !== currentUserId))
      setFilteredUsers(usersList.filter((u: any) => u.id !== currentUserId))
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
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      
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

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      
      const response = await fetch(`${BACKEND_URL}/api/v1/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'group',
          participant_ids: selectedUsers,
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {isGroupMode && (
              <button
                onClick={() => {
                  setIsGroupMode(false)
                  setSelectedUsers([])
                }}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 mr-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-xl font-semibold text-gray-900">
              {isGroupMode ? 'New Group Chat' : 'New Message'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            </div>
          ) : (
            <div>
              {/* Group Toggle Option (Only in Single mode) */}
              {!isGroupMode && !searchQuery && (
                <button
                  onClick={() => setIsGroupMode(true)}
                  className="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 border-b border-gray-100 transition-colors text-left text-indigo-600 font-semibold"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Create a Group Chat</div>
                    <div className="text-xs text-gray-500 font-normal">Message with multiple teammates at once</div>
                  </div>
                </button>
              )}

              {filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <MessageSquare className="w-12 h-12 mb-3 text-gray-300" />
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
                          if (isGroupMode) {
                            handleToggleUser(user.id)
                          } else {
                            handleSelectUser(user.id)
                          }
                        }}
                        className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {user.name[0]?.toUpperCase() || 'U'}
                          </div>

                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {user.email}
                            </div>
                          </div>

                          {/* Role Badge */}
                          {user.role && (
                            <div className="flex-shrink-0">
                              <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                                {user.role}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Checkbox (Only in Group mode) */}
                        {isGroupMode && (
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isChecked 
                              ? 'border-indigo-600 bg-indigo-600 text-white' 
                              : 'border-gray-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
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
        {isGroupMode && selectedUsers.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={handleCreateGroup}
              disabled={isCreatingGroup}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isCreatingGroup ? 'Creating Group...' : `Create Group Chat (${selectedUsers.length} selected)`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { X, Hash, Lock, Globe, Search, Check } from 'lucide-react'
import { useMessagingStore } from '@/store/messaging.store'

interface User {
  id: string
  name: string
  email: string
  role?: string
}

interface CreateChannelModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateChannelModal({ isOpen, onClose }: CreateChannelModalProps) {
  const [channelName, setChannelName] = useState('')
  const [description, setDescription] = useState('')
  const [channelType, setChannelType] = useState<'public' | 'private'>('public')
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [error, setError] = useState('')

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      // Reset form states
      setChannelName('')
      setDescription('')
      setChannelType('public')
      setSelectedUsers([])
      setUserSearch('')
    }
  }, [isOpen])

  // Filter users based on search query
  useEffect(() => {
    if (userSearch.trim()) {
      const query = userSearch.toLowerCase()
      setFilteredUsers(
        users.filter(
          (u) =>
            u.name.toLowerCase().includes(query) ||
            u.email.toLowerCase().includes(query)
        )
      )
    } else {
      setFilteredUsers(users)
    }
  }, [userSearch, users])

  const fetchUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const token = localStorage.getItem('authToken')
      const currentUserId = localStorage.getItem('userId')
      if (!token) return

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${BACKEND_URL}/api/v1/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (response.ok && data.success && data.data?.users) {
        const usersList = data.data.users.filter((u: any) => u.id !== currentUserId)
        setUsers(usersList)
        setFilteredUsers(usersList)
      }
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!channelName.trim()) {
      setError('Channel name is required')
      return
    }

    // Validate channel name (alphanumeric, hyphens, underscores)
    const validName = /^[a-z0-9-_]+$/.test(channelName)
    if (!validName) {
      setError('Channel name can only contain lowercase letters, numbers, hyphens, and underscores')
      return
    }

    setIsSubmitting(true)

    try {
      const token = localStorage.getItem('authToken')
      if (!token) throw new Error('Not authenticated')

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      
      const response = await fetch(`${BACKEND_URL}/api/v1/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: channelName.trim(),
          description: description.trim() || null,
          type: channelType,
          members: selectedUsers
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create channel')
      }

      // Add channel to store
      if (data.data) {
        useMessagingStore.getState().addChannel(data.data)
        useMessagingStore.getState().setActiveChannel(data.data.id)
      }

      onClose()
    } catch (err: any) {
      console.error('Create channel error:', err)
      setError(err.message || 'Failed to create channel')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChannelNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/\s+/g, '-')
    setChannelName(value)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Create a Channel</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Channel Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setChannelType('public')}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  channelType === 'public'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Globe className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium text-sm">Public</div>
                  <div className="text-xs text-gray-500">Anyone can join</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setChannelType('private')}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  channelType === 'private'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Lock className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium text-sm">Private</div>
                  <div className="text-xs text-gray-500">Invite only</div>
                </div>
              </button>
            </div>
          </div>

          {/* Channel Name */}
          <div>
            <label htmlFor="channelName" className="block text-sm font-medium text-gray-700 mb-2">
              Channel Name
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Hash className="w-5 h-5" />
              </div>
              <input
                id="channelName"
                type="text"
                value={channelName}
                onChange={handleChannelNameChange}
                placeholder="e.g. marketing-team"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={isSubmitting}
                maxLength={50}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Use lowercase letters, numbers, hyphens, and underscores
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              disabled={isSubmitting}
              maxLength={200}
            />
          </div>

          {/* Add Members Section */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between">
              <span>Add Members</span>
              <span className="text-xs text-gray-500">{selectedUsers.length} selected</span>
            </label>
            <div className="relative mb-2">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search teammates..."
                className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Users List */}
            <div className="max-h-[160px] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 bg-gray-50">
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500">
                  No teammates found
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isChecked = selectedUsers.includes(user.id)
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleToggleUser(user.id)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-white transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                          {user.name[0]?.toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                          <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isChecked 
                          ? 'border-indigo-600 bg-indigo-600 text-white' 
                          : 'border-gray-300 bg-white'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !channelName.trim()}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

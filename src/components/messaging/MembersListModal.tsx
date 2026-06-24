'use client'

import { useState, useEffect } from 'react'
import { X, Users, Crown, Shield, User as UserIcon, Trash2, UserPlus } from 'lucide-react'
import { PresenceIndicator } from './PresenceIndicator'
import { getBackendUrl } from '@/lib/socket'

const BACKEND_URL = getBackendUrl()

interface Member {
  id: string
  name: string
  email: string
  avatar_url?: string
  role: string
  joined_at: string
}

interface MembersListModalProps {
  isOpen: boolean
  onClose: () => void
  channelId?: string
  conversationId?: string
  channelName?: string
}

export default function MembersListModal({
  isOpen,
  onClose,
  channelId,
  conversationId,
  channelName,
}: MembersListModalProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [availableUsers, setAvailableUsers] = useState<any[]>([])

  useEffect(() => {
    if (isOpen) {
      const userId = localStorage.getItem('userId')
      const userRole = localStorage.getItem('userRole')
      setCurrentUserId(userId)
      setCurrentUserRole(userRole)
      fetchMembers()
    }
  }, [isOpen, channelId, conversationId])

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const endpoint = channelId
        ? `${BACKEND_URL}/api/v1/channels/${channelId}/members`
        : `${BACKEND_URL}/api/v1/conversations/${conversationId}/members`

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      console.log('Members response:', data) // Debug log
      
      if (data.success && data.data?.members) {
        setMembers(data.data.members)
      } else if (data.success && Array.isArray(data.data)) {
        // Handle if data is directly an array
        setMembers(data.data)
      } else {
        console.error('Unexpected members data format:', data)
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const endpoint = channelId
        ? `${BACKEND_URL}/api/v1/channels/${channelId}/members/${memberId}`
        : `${BACKEND_URL}/api/v1/conversations/${conversationId}/members/${memberId}`

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setMembers(members.filter((m) => m.id !== memberId))
      }
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch(`${BACKEND_URL}/api/v1/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      console.log('Available users response:', data) // Debug log
      
      if (data.success && data.data?.users) {
        // Filter out users who are already members
        const memberIds = members.map((m) => m.id)
        const available = data.data.users.filter((u: any) => !memberIds.includes(u.id))
        setAvailableUsers(available)
      } else if (data.success && Array.isArray(data.data)) {
        // Handle if data is directly an array
        const memberIds = members.map((m) => m.id)
        const available = data.data.filter((u: any) => !memberIds.includes(u.id))
        setAvailableUsers(available)
      } else {
        console.error('Unexpected users data format:', data)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const handleAddMember = async (userId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const endpoint = channelId
        ? `${BACKEND_URL}/api/v1/channels/${channelId}/members`
        : `${BACKEND_URL}/api/v1/conversations/${conversationId}/members`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        setShowAddMember(false)
        setSearchQuery('')
        fetchMembers() // Reload members list
      }
    } catch (error) {
      console.error('Failed to add member:', error)
    }
  }

  const handleOpenAddMember = () => {
    setShowAddMember(true)
    fetchAvailableUsers()
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4 text-yellow-500" />
      case 'moderator':
        return <Shield className="w-4 h-4 text-blue-500" />
      default:
        return <UserIcon className="w-4 h-4 text-gray-400" />
    }
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-yellow-100 text-yellow-800',
      moderator: 'bg-blue-100 text-blue-800',
      member: 'bg-gray-100 text-gray-800',
    }
    return colors[role as keyof typeof colors] || colors.member
  }

  if (!isOpen) return null

  const currentMember = members.find((m) => m.id === currentUserId)
  const isChannelAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin'
  const canManageMembers = isChannelAdmin || currentUserRole === 'admin' || currentUserRole === 'hr'
  
  const filteredUsers = availableUsers.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-900">
              {channelName ? `${channelName} Members` : 'Members'}
            </h2>
            <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
              {members.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading members...</div>
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Members</h3>
              <p className="text-gray-500">No members found in this channel.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Avatar with Presence */}
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute bottom-0 right-0">
                          <PresenceIndicator userId={member.id} size="sm" />
                        </div>
                      </div>

                      {/* Member Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {member.name}
                          </h3>
                          {member.id === currentUserId && (
                            <span className="text-xs text-gray-500">(You)</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">{member.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getRoleIcon(member.role)}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadge(
                              member.role
                            )}`}
                          >
                            {member.role}
                          </span>
                          <span className="text-xs text-gray-400">
                            Joined {new Date(member.joined_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      {canManageMembers && member.id !== currentUserId && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {canManageMembers && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            {!showAddMember ? (
              <button
                onClick={handleOpenAddMember}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add Members
              </button>
            ) : (
              <div className="space-y-3">
                {/* Search Users */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users to add..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />

                {/* Available Users List */}
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {filteredUsers.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      {searchQuery ? 'No users found' : 'All users are already members'}
                    </p>
                  ) : (
                    filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleAddMember(user.id)}
                        className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate">{user.email}</div>
                        </div>
                        <UserPlus className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      </button>
                    ))
                  )}
                </div>

                {/* Cancel Button */}
                <button
                  onClick={() => {
                    setShowAddMember(false)
                    setSearchQuery('')
                  }}
                  className="w-full px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

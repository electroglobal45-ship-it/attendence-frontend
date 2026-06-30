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
      const getLoggedUser = () => {
        if (typeof window === 'undefined') return { id: null, role: null }
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser)
            return {
              id: parsed?.id ? String(parsed.id) : null,
              role: parsed?.role || localStorage.getItem('userRole')
            }
          } catch (e) {
            console.error(e)
          }
        }
        return {
          id: localStorage.getItem('userId'),
          role: localStorage.getItem('userRole')
        }
      }
      const { id, role } = getLoggedUser()
      setCurrentUserId(id)
      setCurrentUserRole(role)
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

  const handlePromote = async (memberId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch(`${BACKEND_URL}/api/v1/conversations/${conversationId}/members/${memberId}/promote`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        fetchMembers()
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to promote member')
      }
    } catch (error) {
      console.error('Failed to promote member:', error)
    }
  }

  const handleDemote = async (memberId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch(`${BACKEND_URL}/api/v1/conversations/${conversationId}/members/${memberId}/demote`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        fetchMembers()
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to demote member')
      }
    } catch (error) {
      console.error('Failed to demote member:', error)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
      case 'admin':
        return <Crown className="w-4 h-4 text-yellow-500" />
      case 'sub_admin':
      case 'moderator':
        return <Shield className="w-4 h-4 text-blue-500" />
      default:
        return <UserIcon className="w-4 h-4 text-gray-400" />
    }
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      owner: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      sub_admin: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      moderator: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      member: 'bg-purple-500/10 text-purple-300 border border-purple-500/20',
    }
    return colors[role as keyof typeof colors] || colors.member
  }

  if (!isOpen) return null

  const currentUserMember = members.find((m) => m.id === currentUserId)
  
  // WhatsApp admin logic
  const isGroup = !!conversationId && !channelId
  
  // Can manage: channel admins/HR/system admins, OR for groups if user has admin/sub_admin role
  const canManageMembers = conversationId
    ? (!isGroup || currentUserMember?.role === 'admin' || currentUserMember?.role === 'sub_admin')
    : (currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin' || currentUserRole === 'admin' || currentUserRole === 'hr')

  // Can promote/demote (only group creator/admin)
  const canPromoteDemote = isGroup && currentUserMember?.role === 'admin'
  
  const filteredUsers = availableUsers.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-0 sm:p-4 animate-fade-in font-sans">
      <div className="bg-[#1E0A2E] border border-[#4A1F6F]/60 text-white w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[85vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#4A1F6F]/40 bg-[#150825] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[#D9A441]" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              {channelName ? `${channelName} Members` : 'Members'}
            </h2>
            <span className="ml-2 px-2 py-0.5 bg-[#2D1152] text-[#D9A441] text-xs font-bold rounded-full border border-[#4A1F6F]/40">
              {members.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#2D1152] text-purple-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-purple-300 text-sm font-medium">Loading members...</div>
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-purple-400/50 mb-3" />
              <h3 className="text-base font-semibold text-white mb-1">No Members</h3>
              <p className="text-xs text-purple-300">No members found in this list.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {members.map((member) => {
                const canRemoveTarget = canManageMembers && 
                  member.id !== currentUserId && 
                  (!isGroup || currentUserMember?.role === 'admin' || (currentUserMember?.role === 'sub_admin' && member.role === 'member'))

                return (
                  <div
                    key={member.id}
                    className="p-3 sm:p-4 rounded-xl bg-[#2D1152]/30 border border-[#4A1F6F]/20 hover:bg-[#2D1152]/60 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Avatar with Presence */}
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#4A1F6F] flex items-center justify-center text-white font-bold text-sm">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="absolute bottom-0 right-0">
                            <PresenceIndicator userId={member.id} size="sm" />
                          </div>
                        </div>

                        {/* Member Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-xs sm:text-sm text-white truncate">
                              {member.name}
                            </h3>
                            {member.id === currentUserId && (
                              <span className="text-[10px] text-purple-400 font-medium">(You)</span>
                            )}
                          </div>
                          <p className="text-[11px] sm:text-xs text-purple-300 truncate">{member.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getRoleIcon(member.role)}
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${getRoleBadge(
                                member.role
                              )}`}
                            >
                              {member.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {canPromoteDemote && member.id !== currentUserId && (
                          <>
                            {member.role === 'member' && (
                              <button
                                onClick={() => handlePromote(member.id)}
                                className="px-2.5 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/40 transition font-medium cursor-pointer"
                              >
                                Make Sub-Admin
                              </button>
                            )}
                            {member.role === 'sub_admin' && (
                              <button
                                onClick={() => handleDemote(member.id)}
                                className="px-2.5 py-1 text-xs bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/40 transition font-medium cursor-pointer"
                              >
                                Dismiss Sub-Admin
                              </button>
                            )}
                          </>
                        )}
                        {canRemoveTarget && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-2 text-purple-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {canManageMembers && (
          <div className="p-4 border-t border-[#4A1F6F]/40 bg-[#150825] flex-shrink-0">
            {!showAddMember ? (
              <button
                onClick={handleOpenAddMember}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D9A441] hover:bg-[#C48B2F] text-[#1E0A2E] font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
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
                  className="w-full px-4 py-2.5 bg-[#2D1152] border border-[#4A1F6F]/60 rounded-xl text-sm text-white placeholder-purple-400/60 focus:outline-none focus:border-[#D9A441]"
                  autoFocus
                />

                {/* Available Users List */}
                <div className="max-h-44 overflow-y-auto space-y-2">
                  {filteredUsers.length === 0 ? (
                    <p className="text-xs text-purple-300 text-center py-4">
                      {searchQuery ? 'No users found' : 'All users are already members'}
                    </p>
                  ) : (
                    filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleAddMember(user.id)}
                        className="w-full flex items-center gap-3 p-2.5 bg-[#2D1152]/40 border border-[#4A1F6F]/30 rounded-xl hover:bg-[#2D1152] transition-colors text-left cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#4A1F6F] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs text-white truncate">
                            {user.name}
                          </div>
                          <div className="text-[11px] text-purple-300 truncate">{user.email}</div>
                        </div>
                        <UserPlus className="w-4 h-4 text-emerald-400 flex-shrink-0" />
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
                  className="w-full px-4 py-2 text-xs font-semibold text-purple-300 hover:text-white bg-[#2D1152] rounded-xl hover:bg-[#4A1F6F] transition-colors cursor-pointer"
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

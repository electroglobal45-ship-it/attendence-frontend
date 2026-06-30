'use client'

import { useState, useEffect } from 'react'
import { X, Hash, Lock, Users, UserPlus, Trash2, Shield, Crown, User as UserIcon } from 'lucide-react'
import { getBackendUrl } from '@/lib/socket'
import { PresenceIndicator } from './PresenceIndicator'

const BACKEND_URL = getBackendUrl()

interface Member {
  id: string
  name: string
  email: string
  role: string
  joined_at: string
}

interface ChannelInfoPanelProps {
  isOpen: boolean
  onClose: () => void
  channelId: string
  channelName: string
  channelType: 'public' | 'private'
  description?: string
  topic?: string
}

export default function ChannelInfoPanel({
  isOpen,
  onClose,
  channelId,
  channelName,
  channelType,
  description,
  topic,
}: ChannelInfoPanelProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      // Get current user details from localStorage
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
      setShowAddMember(false)
    }
  }, [isOpen, channelId])

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch(`${BACKEND_URL}/api/v1/channels/${channelId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success && data.data?.members) {
        setMembers(data.data.members)
      } else if (data.success && Array.isArray(data.data)) {
        setMembers(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch channel members:', error)
    } finally {
      setLoading(false)
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
      if (data.success && data.data?.users) {
        const memberIds = members.map((m) => m.id)
        const available = data.data.users.filter((u: any) => !memberIds.includes(u.id))
        setAvailableUsers(available)
      } else if (data.success && Array.isArray(data.data)) {
        const memberIds = members.map((m) => m.id)
        const available = data.data.filter((u: any) => !memberIds.includes(u.id))
        setAvailableUsers(available)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const handleAddMember = async (userId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch(`${BACKEND_URL}/api/v1/channels/${channelId}/members`, {
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
        fetchMembers()
      }
    } catch (error) {
      console.error('Failed to add member:', error)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch(`${BACKEND_URL}/api/v1/channels/${channelId}/members/${memberId}`, {
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

  const handlePromote = async (memberId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return
      const response = await fetch(`${BACKEND_URL}/api/v1/channels/${channelId}/members/${memberId}/promote`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        fetchMembers()
      } else {
        setMembers(members.map(m => m.id === memberId ? { ...m, role: 'sub-admin' } : m))
      }
    } catch (e) {
      setMembers(members.map(m => m.id === memberId ? { ...m, role: 'sub-admin' } : m))
    }
  }

  const handleDemote = async (memberId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return
      const response = await fetch(`${BACKEND_URL}/api/v1/channels/${channelId}/members/${memberId}/demote`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        fetchMembers()
      } else {
        setMembers(members.map(m => m.id === memberId ? { ...m, role: 'member' } : m))
      }
    } catch (e) {
      setMembers(members.map(m => m.id === memberId ? { ...m, role: 'member' } : m))
    }
  }

  const getRoleIcon = (role: string) => {
    return null
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      case 'admin':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      case 'sub-admin':
      case 'sub_admin':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      default:
        return 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
    }
  }

  if (!isOpen) return null

  const currentUserMember = members.find((m) => m.id === currentUserId)
  const isChannelAdmin = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin'
  const canManageMembers = isChannelAdmin || currentUserRole === 'admin' || currentUserRole === 'hr'

  const filteredUsers = availableUsers.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-[360px] h-full border-l border-[#4A1F6F]/40 bg-[#1E0A2E] flex flex-col font-sans text-purple-100 flex-shrink-0 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#4A1F6F]/40 bg-[#150825] flex-shrink-0">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          {channelType === 'private' ? <Lock className="w-4 h-4 text-[#D9A441]" /> : <Hash className="w-4 h-4 text-[#D9A441]" />}
          Channel Details
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-[#2D1152] rounded text-purple-400 hover:text-white transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Basic info */}
        <div>
          <h2 className="text-lg font-bold text-white mb-1">#{channelName}</h2>
          <p className="text-xs text-purple-300 mb-2 leading-relaxed">
            {description || 'No description provided.'}
          </p>
          {topic && (
            <div className="p-2.5 bg-[#2D1152]/40 rounded-xl border border-[#4A1F6F]/20 text-xs">
              <span className="font-bold text-[#D9A441] block mb-0.5">Topic</span>
              <span className="text-purple-200 leading-relaxed">{topic}</span>
            </div>
          )}
        </div>

        {/* Member List Header */}
        <div className="border-t border-[#4A1F6F]/20 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Members ({members.length})
            </span>
            {canManageMembers && !showAddMember && (
              <button
                onClick={() => {
                  setShowAddMember(true)
                  fetchAvailableUsers()
                }}
                className="text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-500 px-2 py-1 rounded transition flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" /> Add Member
              </button>
            )}
          </div>

          {/* Add member inline form */}
          {showAddMember && (
            <div className="p-3 bg-[#150825] rounded-xl border border-[#4A1F6F]/40 space-y-2 mb-4 animate-fade-in">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-[#D9A441]">Add New Teammates</span>
                <button
                  onClick={() => {
                    setShowAddMember(false)
                    setSearchQuery('')
                  }}
                  className="text-[10px] text-purple-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-[#4A1F6F]/40 bg-[#2D1152] text-white focus:outline-none focus:ring-1 focus:ring-[#D9A441]"
              />
              <div className="max-h-32 overflow-y-auto space-y-1.5 pt-1">
                {filteredUsers.length === 0 ? (
                  <div className="text-[10px] text-purple-400 text-center py-2">No users found</div>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleAddMember(user.id)}
                      className="w-full flex items-center justify-between p-2 rounded hover:bg-[#2D1152] transition text-left"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{user.name}</div>
                        <div className="text-[10px] text-purple-400 truncate">{user.email}</div>
                      </div>
                      <UserPlus className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Members list */}
          {loading ? (
            <div className="text-center py-4 text-xs text-purple-400">Loading members...</div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#2D1152]/20 border border-[#4A1F6F]/10 hover:bg-[#2D1152]/30 transition group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#4A1F6F] flex items-center justify-center font-bold text-xs text-white">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0">
                        <PresenceIndicator userId={member.id} size="sm" />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white flex items-center gap-1 truncate">
                        {member.name}
                        {member.id === currentUserId && <span className="text-[9px] text-purple-400">(You)</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${getRoleBadge(member.role)}`}>
                          {member.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {canManageMembers && member.id !== currentUserId && member.role !== 'owner' && (
                    <div className="flex items-center gap-1">
                      {member.role === 'sub-admin' || member.role === 'sub_admin' ? (
                        <button
                          onClick={() => handleDemote(member.id)}
                          className="p-1 hover:bg-[#4A1F6F]/40 rounded text-blue-400 hover:text-purple-300 transition cursor-pointer"
                          title="Demote to Member"
                        >
                          <Shield className="w-3.5 h-3.5 fill-blue-400/30" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePromote(member.id)}
                          className="p-1 hover:bg-[#4A1F6F]/40 rounded text-purple-400 hover:text-blue-400 transition cursor-pointer"
                          title="Make Sub-Admin"
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1 hover:bg-[#4A1F6F]/40 rounded text-purple-400 hover:text-red-400 transition cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

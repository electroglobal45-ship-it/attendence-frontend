'use client'

import { useState, useMemo, memo, useCallback, startTransition, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { usePrefetchStore, PrefetchChunk } from '@/lib/store/prefetch-store'
import { useMessagingStore } from '@/store/messaging.store'
import { useSocket } from '@/hooks/useSocket'
import { getBackendUrl } from '@/lib/socket'
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  DollarSign,
  Users,
  UserPlus,
  Settings,
  LogOut,
  FileText,
  Gift,
  FileCheck,
  X,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  CheckSquare,
  HardDrive,
  KeyRound,
  Video,
  MessageSquare,
  Hash,
  Lock,
  MoreVertical,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react'

import CreateChannelModal from '@/components/messaging/CreateChannelModal'
import NewMessageModal from '@/components/messaging/NewMessageModal'

const DriveBadge = memo(() => {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (!token) return
        const BACKEND_URL = getBackendUrl()
        const res = await fetch(`${BACKEND_URL}/api/v1/drive/shared/with-me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.data?.shares) {
          const count = data.data.shares.filter((s: any) => !s.viewed).length
          setUnread(count)
        }
      } catch (err) {
        // ignore
      }
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [])

  if (unread === 0) return null
  return (
    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
      {unread > 99 ? '99+' : unread}
    </span>
  )
})
DriveBadge.displayName = 'DriveBadge'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: React.ReactNode
  prefetchChunks?: PrefetchChunk[]
}

const employeeNav: NavItem[] = [
  { label: 'Dashboard',       href: '/home',         icon: <LayoutDashboard size={18} /> },
  { label: 'Mark Attendance', href: '/attendance',   icon: <Clock size={18} />,             prefetchChunks: ['attendance', 'history'] },
  { label: 'Inbox',        href: '/messages',     icon: <MessageSquare size={18} /> },
  { label: 'Meetings',        href: '/meetings',     icon: <Video size={18} />,             prefetchChunks: ['meetings'] },
  { label: 'Drive',           href: '/drive',        icon: <HardDrive size={18} />,         badge: <DriveBadge />, prefetchChunks: ['drive'] },
  { label: 'My Passwords',    href: '/my-passwords', icon: <KeyRound size={18} />,          prefetchChunks: ['vault'] },
  { label: 'My Tasks',        href: '/my-tasks',     icon: <CheckSquare size={18} />,       prefetchChunks: ['tasks'] },
]

const adminNav: NavItem[] = [
  { label: 'Dashboard',   href: '/dashboard',    icon: <LayoutDashboard size={18} /> },
  { label: 'Inbox',    href: '/messages',     icon: <MessageSquare size={18} /> },
  { label: 'Meetings',    href: '/meetings',     icon: <Video size={18} />,             prefetchChunks: ['meetings'] },
  { label: 'Drive',       href: '/drive',        icon: <HardDrive size={18} />,         badge: <DriveBadge />, prefetchChunks: ['drive'] },
  { label: 'Vault',       href: '/vault',        icon: <KeyRound size={18} />,          prefetchChunks: ['vault'] },
  { label: 'Boards',      href: '/projects',     icon: <FolderKanban size={18} />,      prefetchChunks: ['projects'] },
  { label: 'Tasks',       href: '/tasks',        icon: <CheckSquare size={18} />,       prefetchChunks: ['tasks'] },
  { label: 'Employees',   href: '/employees',    icon: <Users size={18} />,             prefetchChunks: ['employees'] },
]

const hrNav: NavItem[] = [
  { label: 'Dashboard',   href: '/dashboard',    icon: <LayoutDashboard size={18} /> },
  { label: 'Inbox',    href: '/messages',     icon: <MessageSquare size={18} /> },
  { label: 'Meetings',    href: '/meetings',     icon: <Video size={18} />,             prefetchChunks: ['meetings'] },
  { label: 'Drive',       href: '/drive',        icon: <HardDrive size={18} />,         badge: <DriveBadge />, prefetchChunks: ['drive'] },
  { label: 'Employees',   href: '/employees',    icon: <Users size={18} />,             prefetchChunks: ['employees'] },
]

const teamLeaderNav: NavItem[] = [
  { label: 'Dashboard',       href: '/home',         icon: <LayoutDashboard size={18} /> },
  { label: 'Mark Attendance', href: '/attendance',   icon: <Clock size={18} />,             prefetchChunks: ['attendance', 'history'] },
  { label: 'Inbox',        href: '/messages',     icon: <MessageSquare size={18} /> },
  { label: 'Meetings',        href: '/meetings',     icon: <Video size={18} />,             prefetchChunks: ['meetings'] },
  { label: 'Drive',           href: '/drive',        icon: <HardDrive size={18} />,         badge: <DriveBadge />, prefetchChunks: ['drive'] },
  { label: 'My Passwords',    href: '/my-passwords', icon: <KeyRound size={18} />,          prefetchChunks: ['vault'] },
  { label: 'Boards',          href: '/projects',     icon: <FolderKanban size={18} />,      prefetchChunks: ['projects'] },
  { label: 'My Tasks',        href: '/my-tasks',     icon: <CheckSquare size={18} />,       prefetchChunks: ['tasks'] },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

// Memoize individual nav item to prevent re-renders
const NavItemComponent = memo(({ 
  item, 
  isActive, 
  isCollapsed, 
  onClick 
}: { 
  item: NavItem
  isActive: boolean
  isCollapsed: boolean
  onClick: (href: string) => void
}) => {
  const router = useRouter()
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    onClick(item.href)
    // Use startTransition for non-blocking navigation
    startTransition(() => {
      router.push(item.href)
    })
  }, [item.href, onClick, router])
  const handleMouseEnter = useCallback(() => {
    // Instantly warm Next.js route cache (downloads JS chunks and layout)
    router.prefetch(item.href)

    if (!item.prefetchChunks || item.prefetchChunks.length === 0) return
    // Small delay to avoid firing on quick mouse-overs
    hoverTimerRef.current = setTimeout(() => {
      const store = usePrefetchStore.getState()
      for (const chunk of item.prefetchChunks!) {
        const chunkStatus = store.status[chunk]
        // Only refresh if idle or errored — skip if already loading/done
        if (chunkStatus === 'idle' || chunkStatus === 'error') {
          store.refreshChunk(chunk)
        }
      }
    }, 100)
  }, [item.href, item.prefetchChunks, router])
  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])
  
  return (
    <Link
      href={item.href}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      prefetch={true}
      title={isCollapsed ? item.label : undefined}
      className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
        isActive
          ? 'bg-white/20 text-white shadow-sm'
          : 'text-white hover:bg-white/10'
      }`}
    >
      <div className={`flex-shrink-0 ${isActive ? 'text-[#D9A441]' : 'text-white'}`}>{item.icon}</div>
      {!isCollapsed && <span className="truncate">{item.label}</span>}
      {!isCollapsed && item.badge}
    </Link>
  )
})
NavItemComponent.displayName = 'NavItemComponent'

export const Sidebar = memo(function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { isCollapsed: isDesktopCollapsed, setCollapsed, isOpen, setOpen } = useSidebarStore()
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
  useSocket(token || undefined)
  
  const unreadConversations = useMessagingStore((state) => state.unreadConversations)
  const unreadChannels = useMessagingStore((state) => state.unreadChannels)
  const channels = useMessagingStore((state) => state.channels)
  const conversations = useMessagingStore((state) => state.conversations)
  const activeChannelId = useMessagingStore((state) => state.activeChannelId)
  const activeConversationId = useMessagingStore((state) => state.activeConversationId)
  const setActiveChannel = useMessagingStore((state) => state.setActiveChannel)
  const setActiveConversation = useMessagingStore((state) => state.setActiveConversation)
  
  const [optimisticPathname, setOptimisticPathname] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [messagesHeight, setMessagesHeight] = useState<number | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false)
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false)
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null)
  const [isDeletingConv, setIsDeletingConv] = useState(false)
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null)
  const [isDeletingChannel, setIsDeletingChannel] = useState(false)
  
    const dropdownRef = useRef<HTMLDivElement>(null)
  const heightRef = useRef(300)
  const messagesPanelRef = useRef<HTMLDivElement>(null)

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Load persisted height on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-messages-height')
    if (saved) {
      const parsed = parseInt(saved, 10)
      if (!isNaN(parsed) && parsed >= 100 && parsed <= 800) {
        setMessagesHeight(parsed)
        heightRef.current = parsed
      }
    } else {
      setMessagesHeight(null)
    }
  }, [])

  // Load channels and conversations for the embedded list
  useEffect(() => {
    const loadChannelsAndConversations = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (!token) return

        const BACKEND_URL = getBackendUrl()

        // Load channels
        const channelsRes = await fetch(`${BACKEND_URL}/api/v1/channels`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const channelsData = await channelsRes.json()
        if (channelsData.success && channelsData.data?.channels) {
          useMessagingStore.getState().setChannels(channelsData.data.channels)
        }

        // Load conversations
        const conversationsRes = await fetch(`${BACKEND_URL}/api/v1/conversations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const conversationsData = await conversationsRes.json()
        if (conversationsData.success && conversationsData.data) {
          useMessagingStore.getState().setConversations(
            Array.isArray(conversationsData.data) ? conversationsData.data : []
          )
        }
      } catch (error) {
        console.error('Failed to load channels/conversations in sidebar:', error)
      }
    }

    if (user) {
      loadChannelsAndConversations()
    }
  }, [user])

  const handleChannelClick = useCallback((channelId: string) => {
    setActiveChannel(channelId)
    setOpen(false)
    if (pathname !== '/messages') {
      router.push('/messages')
    }
  }, [router, pathname, setOpen, setActiveChannel])

  const handleConversationClick = useCallback((conversationId: string) => {
    setActiveConversation(conversationId)
    setOpen(false)
    if (pathname !== '/messages') {
      router.push('/messages')
    }
  }, [router, pathname, setOpen, setActiveConversation])

  const handleDeleteConversation = useCallback((conversationId: string) => {
    setDeletingConvId(conversationId)
  }, [])

  const confirmDeleteConv = async () => {
    if (!deletingConvId) return
    setIsDeletingConv(true)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const BACKEND_URL = getBackendUrl()
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

  const confirmDeleteChannel = async () => {
    if (!deletingChannelId) return
    setIsDeletingChannel(true)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const BACKEND_URL = getBackendUrl()
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

  const startResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsResizing(true)
    
    const resizer = e.currentTarget
    resizer.setPointerCapture(e.pointerId)
    
    let startHeight = heightRef.current
    if (messagesPanelRef.current) {
      startHeight = messagesPanelRef.current.getBoundingClientRect().height
    }
    
    const startY = e.clientY
    
    const doResize = (moveEvent: PointerEvent) => {
      const currentY = moveEvent.clientY
      const diff = startY - currentY
      const newHeight = Math.max(100, Math.min(800, startHeight + diff))
      setMessagesHeight(newHeight)
      heightRef.current = newHeight
    }
    
    const stopResize = (upEvent: PointerEvent) => {
      setIsResizing(false)
      try {
        resizer.releasePointerCapture(upEvent.pointerId)
      } catch (err) {}
      localStorage.setItem('sidebar-messages-height', heightRef.current.toString())
      resizer.removeEventListener('pointermove', doResize)
      resizer.removeEventListener('pointerup', stopResize)
      resizer.removeEventListener('pointercancel', stopResize)
    }
    
    resizer.addEventListener('pointermove', doResize)
    resizer.addEventListener('pointerup', stopResize)
    resizer.addEventListener('pointercancel', stopResize)
  }, [])

  // Clear optimistic pathname when actual pathname changes
  useEffect(() => {
    setOptimisticPathname(null)
  }, [pathname])

  // Get role from user object
  const role = user?.role || 'employee'

  // Memoize nav items based on role
  const navItems = useMemo(() => {
    if (user?.role === 'admin') return adminNav
    if (user?.role === 'hr') return hrNav
    if (user?.role === 'team leader') return teamLeaderNav
    return employeeNav
  }, [user?.role])

  const handleLogout = useCallback(async () => {
    await logout()
    router.push('/login')
  }, [logout, router])

  const handleLinkClick = useCallback((href: string) => {
    setOptimisticPathname(href)
    setOpen(false)
    if (href === '/messages') {
      setActiveChannel(null)
      setActiveConversation(null)
    }
  }, [setOpen, setActiveChannel, setActiveConversation])

  const currentPath = optimisticPathname || pathname

  const dropdownItems = useMemo(() => {
    const items = []
    
    if (role === 'admin') {
      items.push(
        { label: 'Calendar', href: '/calendar', icon: <CalendarDays size={15} /> },
        { label: 'Holidays', href: '/holidays', icon: <Gift size={15} /> },
        { label: 'Reports', href: '/reports', icon: <FileText size={15} /> },
        { label: 'Settings', href: '/settings', icon: <Settings size={15} /> }
      )
    } else if (role === 'team leader' || role === 'employee') {
      items.push(
        { label: 'My Calendar', href: '/my-calendar', icon: <CalendarDays size={15} /> },
        { label: 'My Leaves', href: '/leaves', icon: <FileCheck size={15} /> },
        { label: 'Salary', href: '/salary', icon: <DollarSign size={15} /> }
      )
    }
    
    return items
  }, [role])

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky lg:top-0 lg:left-0 z-50
        ${isDesktopCollapsed ? 'w-20' : 'w-64 lg:w-60'} 
        h-screen flex flex-col font-sans flex-shrink-0
        transform transition-all duration-100 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      style={{ background: 'linear-gradient(180deg, #1E0A2E 0%, #2D1152 100%)' }}>
        {/* Brand Header */}
        <div className={`px-4 py-5 border-b border-white/10 relative flex-shrink-0 flex ${isDesktopCollapsed ? 'justify-center' : 'items-center justify-between'}`}>
          {isDesktopCollapsed ? (
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-8 h-8 bg-[#4A1F6F] rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer shadow-sm hover:ring-2 hover:ring-[#D9A441]/50 transition-all active:scale-95"
              title={user?.name}
            >
              <ShieldCheck size={18} className="text-[#D9A441]" />
            </button>
          ) : (
            <>
              <Link 
                href="/profile"
                className="hover:opacity-80 transition-opacity block min-w-0 mr-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#4A1F6F] rounded-lg flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={18} className="text-[#D9A441]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-white truncate font-jakarta">CRM Attendance</p>
                    <p className="text-xs text-purple-300/70 capitalize truncate">{role}</p>
                  </div>
                </div>
              </Link>
              <div className="flex items-center gap-1.5 flex-shrink-0 mr-1">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="p-1.5 text-purple-300/60 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                  title="More actions"
                >
                  <MoreVertical size={16} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="lg:hidden p-1.5 text-purple-300/70 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                  title="Close sidebar"
                >
                  <X size={18} />
                </button>
              </div>
            </>
          )}
          
          {/* Desktop collapse toggle */}
          <button 
            onClick={() => setCollapsed(!isDesktopCollapsed)}
            className="hidden lg:flex absolute -right-3.5 top-6 bg-[#2D1152] border border-purple-400/30 rounded-full p-1.5 text-purple-300 hover:text-white hover:bg-[#4A1F6F] shadow-md hover:shadow-lg hover:scale-110 z-50 transition-all duration-200 cursor-pointer active:scale-95"
            title={isDesktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isDesktopCollapsed ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
          </button>

          {/* Floating Dropdown Menu */}
          {isDropdownOpen && (
            <div 
              ref={dropdownRef}
              className={`absolute z-50 bg-white border border-slate-200/90 rounded-xl shadow-xl py-1.5 w-44 transition-all duration-150 ${
                isDesktopCollapsed 
                  ? 'left-full ml-2 top-2' 
                  : 'right-4 top-full mt-1'
              }`}
            >
              {dropdownItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setIsDropdownOpen(false)
                    setOpen(false) // Close mobile sidebar drawer
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-[#4A1F6F]/5 hover:text-[#4A1F6F] transition-colors"
                >
                  <span className="text-slate-400">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
              
              {dropdownItems.length > 0 && <div className="border-t border-slate-100 my-1" />}
              
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 w-full text-left transition-colors cursor-pointer"
              >
                <LogOut size={15} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation list and Messages section container (Fully scrollable sidebar) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar select-none px-3 py-4 space-y-4">
          {/* Navigation List */}
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = currentPath === item.href
              return (
                <NavItemComponent
                  key={item.href}
                  item={item}
                  isActive={isActive}
                  isCollapsed={isDesktopCollapsed}
                  onClick={handleLinkClick}
                />
              )
            })}
          </nav>

          {/* Embedded Messages section (renders directly as list items) */}
          <div className="space-y-4">
            {/* Heading Section */}
            <div className="px-2 border-t border-white/10 pt-4 flex items-center justify-between">
              {isDesktopCollapsed ? (
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300/60 font-jakarta mx-auto">
                  Inbox
                </span>
              ) : (
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300/60 font-jakarta">
                  Inbox
                </span>
              )}
            </div>
            
            {/* Messages Content */}
            <div className="space-y-4">
              {!isDesktopCollapsed ? (
                <div className="space-y-4">
                  {/* Channels list */}
                  <div className="px-2">
                    <div className="flex items-center justify-between mb-1 px-2">
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-purple-300/50 font-jakarta">Channels</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsCreateChannelOpen(true)
                        }}
                        className="p-1 hover:bg-white/10 rounded text-purple-300/50 hover:text-white transition-all cursor-pointer"
                        title="Create Channel"
                      >
                        <Plus size={11} strokeWidth={2.5} />
                      </button>
                    </div>
                    {channels.length > 0 ? (
                      <div className="space-y-0.5">
                        {channels.map((channel) => {
                          const isChanActive = activeChannelId === channel.id
                          const unreadCount = unreadChannels[channel.id] || 0
                          const hasUnread = unreadCount > 0
                          
                          return (
                            <div key={channel.id} className="relative group w-full">
                              <button
                                onClick={() => handleChannelClick(channel.id)}
                                className={`flex items-center w-full rounded-lg text-xs font-medium transition-all pl-2 pr-7 py-1.5 cursor-pointer gap-2 ${
                                  isChanActive
                                    ? 'bg-white/15 text-white font-semibold'
                                    : 'text-purple-200/60 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                <span className="opacity-60">
                                  {channel.type === 'private' ? <Lock size={13} /> : <Hash size={13} />}
                                </span>
                                <span className={`truncate flex-1 text-left ${hasUnread ? 'font-semibold text-white' : ''}`}>{channel.name || 'Channel'}</span>
                                {hasUnread && (
                                  <span className="bg-red-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[1rem] text-center ml-auto">
                                    {unreadCount}
                                  </span>
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeletingChannelId(channel.id)
                                }}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded text-purple-300/50 hover:text-red-400 opacity-60 hover:opacity-100 transition-opacity z-10 cursor-pointer"
                                title="Delete Channel"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-purple-300/40 px-2 italic">No channels</p>
                    )}
                  </div>

                  {/* Direct Messages list */}
                  <div className="px-2">
                    <div className="flex items-center justify-between mb-1 px-2">
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-purple-300/50 font-jakarta">Direct Messages</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsNewMessageOpen(true)
                        }}
                        className="p-1 hover:bg-white/10 rounded text-purple-300/50 hover:text-white transition-all cursor-pointer"
                        title="New Message"
                      >
                        <Plus size={11} strokeWidth={2.5} />
                      </button>
                    </div>
                    {conversations.length > 0 ? (
                      <div className="space-y-0.5">
                        {conversations.map((conv) => {
                          const isConvActive = activeConversationId === conv.id
                          const name = conv.type === 'direct'
                            ? conv.other_user?.name || 'Direct Message'
                            : conv.name || conv.participants
                                ?.filter((p: any) => p.id !== user?.id)
                                .map((p: any) => p.name?.split(' ')[0])
                                .join(', ') || 'Group Chat'
                          const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                          const unreadCount = unreadConversations[conv.id] || conv.unread_count || 0
                          const hasUnread = unreadCount > 0
                          
                          return (
                            <div key={conv.id} className="relative group w-full">
                              <button
                                onClick={() => handleConversationClick(conv.id)}
                                className={`flex items-center w-full rounded-lg text-xs font-medium transition-all pl-2 pr-8 py-1.5 cursor-pointer gap-2 ${
                                  isConvActive
                                    ? 'bg-white/15 text-white font-semibold'
                                    : 'text-purple-200/60 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                <div className="relative flex-shrink-0">
                                  <div className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[9px] font-bold text-purple-200">
                                    {initials}
                                  </div>
                                  {hasUnread && (
                                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-400 rounded-full border border-[#1E0A2E]" />
                                  )}
                                </div>
                                <span className={`truncate flex-1 text-left ${hasUnread ? 'font-semibold text-white' : ''}`}>{name}</span>
                                {hasUnread && (
                                  <span className="bg-red-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[1rem] text-center ml-auto">
                                    {unreadCount}
                                  </span>
                                )}
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteConversation(conv.id)
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded text-purple-300/50 hover:text-red-400 opacity-60 hover:opacity-100 transition-opacity z-10 cursor-pointer"
                                title="Delete Conversation"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-purple-300/40 px-2 italic">No messages</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-2 space-y-2 flex flex-col items-center">
                  {/* Collapsed Channels */}
                  {channels.map((channel) => {
                    const isChanActive = activeChannelId === channel.id
                    const unreadCount = unreadChannels[channel.id] || 0
                    const hasUnread = unreadCount > 0
                    const initials = (channel.name || 'Channel').slice(0, 2).toUpperCase()
                    
                    return (
                      <button
                        key={channel.id}
                        onClick={() => handleChannelClick(channel.id)}
                        title={channel.name || 'Channel'}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all relative border cursor-pointer ${
                          isChanActive
                            ? 'bg-[#4A1F6F]/10 border-[#4A1F6F]/30 text-[#4A1F6F] font-extrabold shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {initials}
                        {hasUnread && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-white">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    )
                  })}
                  
                  {channels.length > 0 && conversations.length > 0 && (
                    <div className="w-6 border-t border-slate-200 my-1 flex-shrink-0" />
                  )}

                  {/* Collapsed DMs */}
                  {conversations.map((conv) => {
                    const isConvActive = activeConversationId === conv.id
                    const name = conv.type === 'direct'
                      ? conv.other_user?.name || 'Direct Message'
                      : conv.participants
                          ?.filter((p: any) => p.id !== user?.id)
                          .map((p: any) => p.name?.split(' ')[0])
                          .join(', ') || 'Group Chat'
                    const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                    const unreadCount = unreadConversations[conv.id] || conv.unread_count || 0
                    const hasUnread = unreadCount > 0
                    
                    return (
                      <button
                        key={conv.id}
                        onClick={() => handleConversationClick(conv.id)}
                        title={name}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all relative border cursor-pointer ${
                          isConvActive
                            ? 'bg-[#4A1F6F]/10 border-[#4A1F6F]/30 text-[#4A1F6F] font-extrabold shadow-sm'
                            : 'bg-[#4A1F6F]/5 border-[#4A1F6F]/10 text-[#4A1F6F]/90 hover:bg-[#4A1F6F]/10 hover:text-[#4A1F6F]'
                        }`}
                      >
                        {initials}
                        {hasUnread && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-white">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Messaging Modals */}
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
              <Trash2 size={24} />
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
              <Trash2 size={24} />
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
    </>
  )
})

'use client'

import { useState, useMemo, memo, useCallback, startTransition, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { usePrefetchStore, PrefetchChunk } from '@/lib/store/prefetch-store'
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
} from 'lucide-react'

const DriveBadge = memo(() => {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (!token) return
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
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
  { label: 'Dashboard',       href: '/home',         icon: <LayoutDashboard size={18} />,  prefetchChunks: ['attendance'] },
  { label: 'Mark Attendance', href: '/attendance',   icon: <Clock size={18} />,             prefetchChunks: ['attendance', 'history'] },
  { label: 'My Tasks',        href: '/my-tasks',     icon: <CheckSquare size={18} />,       prefetchChunks: ['tasks'] },
  { label: 'My Calendar',     href: '/my-calendar',  icon: <CalendarDays size={18} />,      prefetchChunks: ['holidays'] },
  { label: 'My Leaves',       href: '/leaves',       icon: <FileCheck size={18} />,         prefetchChunks: ['leaves'] },
  { label: 'Salary',          href: '/salary',       icon: <DollarSign size={18} />,        prefetchChunks: ['salary'] },
  { label: 'Drive',           href: '/drive',        icon: <HardDrive size={18} />,         badge: <DriveBadge />, prefetchChunks: ['drive'] },
  { label: 'My Passwords',    href: '/my-passwords', icon: <KeyRound size={18} />,          prefetchChunks: ['vault'] },
  { label: 'Meetings',        href: '/meetings',     icon: <Video size={18} />,             prefetchChunks: ['meetings'] },
]

const adminNav: NavItem[] = [
  { label: 'Dashboard',   href: '/dashboard',    icon: <LayoutDashboard size={18} />,  prefetchChunks: ['attendance', 'tasks'] },
  { label: 'Boards',      href: '/projects',     icon: <FolderKanban size={18} />,      prefetchChunks: ['projects'] },
  { label: 'Tasks',       href: '/tasks',        icon: <CheckSquare size={18} />,       prefetchChunks: ['tasks'] },
  { label: 'Employees',   href: '/employees',    icon: <Users size={18} />,             prefetchChunks: ['employees'] },
  { label: 'Create User', href: '/users/create', icon: <UserPlus size={18} /> },
  { label: 'Calendar',    href: '/calendar',     icon: <CalendarDays size={18} />,      prefetchChunks: ['holidays'] },
  { label: 'Holidays',    href: '/holidays',     icon: <Gift size={18} />,              prefetchChunks: ['holidays'] },
  { label: 'Reports',     href: '/reports',      icon: <FileText size={18} />,          prefetchChunks: ['employees', 'tasks'] },
  { label: 'Drive',       href: '/drive',        icon: <HardDrive size={18} />,         badge: <DriveBadge />, prefetchChunks: ['drive'] },
  { label: 'Vault',       href: '/vault',        icon: <KeyRound size={18} />,          prefetchChunks: ['vault'] },
  { label: 'Meetings',    href: '/meetings',     icon: <Video size={18} />,             prefetchChunks: ['meetings'] },
  { label: 'Settings',    href: '/settings',     icon: <Settings size={18} />,          prefetchChunks: ['settings'] },
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
          ? 'bg-gray-900 text-white'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <div className="flex-shrink-0">{item.icon}</div>
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
  
  const [optimisticPathname, setOptimisticPathname] = useState<string | null>(null)

  // Clear optimistic pathname when actual pathname changes
  useEffect(() => {
    setOptimisticPathname(null)
  }, [pathname])

  // Get role from user object
  const role = user?.role || 'employee'

  // Memoize nav items based on role
  const navItems = useMemo(() => {
    return user?.role === 'admin' ? adminNav : employeeNav
  }, [user?.role])

  const handleLogout = useCallback(async () => {
    await logout()
    router.push('/login')
  }, [logout, router])

  const handleLinkClick = useCallback((href: string) => {
    setOptimisticPathname(href)
    setOpen(false)
  }, [setOpen])

  const currentPath = optimisticPathname || pathname

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
        fixed lg:static inset-y-0 left-0 z-50
        ${isDesktopCollapsed ? 'w-20' : 'w-64 lg:w-60'} 
        h-screen bg-white border-r border-gray-200 flex flex-col font-sans
        transform transition-all duration-100 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile close button */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-900"
        >
          <X size={24} />
        </button>

        {/* Brand */}
        <div className={`px-4 py-5 border-b border-gray-200 relative ${isDesktopCollapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center ${isDesktopCollapsed ? 'justify-center' : 'gap-2'}`}>
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            {!isDesktopCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate font-jakarta">CRM Attendance</p>
                <p className="text-xs text-gray-400 capitalize truncate">{role}</p>
              </div>
            )}
          </div>
          
          {/* Desktop collapse toggle */}
          <button 
            onClick={() => setCollapsed(!isDesktopCollapsed)}
            className="hidden lg:flex absolute -right-3 top-6 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-gray-900 shadow-sm z-10"
          >
            {isDesktopCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
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

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-gray-200 mt-auto">
          <div className={`flex items-center ${isDesktopCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 mb-2`}>
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0" title={user?.name}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            {!isDesktopCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            title={isDesktopCollapsed ? "Sign out" : undefined}
            className={`flex items-center ${isDesktopCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} w-full py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors`}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!isDesktopCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  )
})
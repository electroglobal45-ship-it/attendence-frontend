'use client'

import React from 'react'
import { memo } from 'react'
import { Menu, ArrowLeft } from 'lucide-react'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import NotificationBell from '@/components/notifications/NotificationBell'

interface PageWrapperProps {
  children: React.ReactNode
  title?: string | React.ReactNode
  subtitle?: string
  actions?: React.ReactNode
  onBack?: () => void
}

// Memoize PageWrapper to prevent re-renders
export function PageWrapper({ children, title, subtitle, actions, onBack }: PageWrapperProps) {
  const setOpen = useSidebarStore((state) => state.setOpen)

  return (
    <>
      {/* Page header */}
      <div className={`bg-white/80 backdrop-blur-sm border-b border-purple-100/60 px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0 z-10 relative ${!title ? 'lg:hidden' : ''}`}>
        <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
          {/* Back button or Hamburger menu for mobile */}
          {onBack ? (
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg touch-manipulation flex-shrink-0 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={20} className="sm:w-6 sm:h-6 text-gray-700" />
            </button>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="lg:hidden p-1.5 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg touch-manipulation flex-shrink-0 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={20} className="sm:w-6 sm:h-6" />
            </button>
          )}

          {(title || subtitle) && (
            <div className={`min-w-0 flex-1 ${actions && !onBack ? 'hidden sm:block' : ''}`}>
              {title && (
                <h1 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate leading-tight flex items-center gap-2">
                  {typeof title === 'string' ? title : title}
                </h1>
              )}
              {subtitle && <p className="hidden sm:block text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
            </div>
          )}
          
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <NotificationBell />
            {actions}
          </div>
        </div>
      </div>
      
      {/* Page content */}
      <div className="flex-1 p-4 sm:p-6 relative z-0">{children}</div>
    </>
  )
}

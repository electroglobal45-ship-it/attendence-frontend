'use client'

import { memo } from 'react'
import { Menu } from 'lucide-react'
import { useSidebarStore } from '@/lib/store/sidebar-store'

interface PageWrapperProps {
  children: React.ReactNode
  title?: string | React.ReactNode
  subtitle?: string
  actions?: React.ReactNode
}

// Memoize PageWrapper to prevent re-renders
export const PageWrapper = memo(function PageWrapper({ children, title, subtitle, actions }: PageWrapperProps) {
  const setOpen = useSidebarStore((state) => state.setOpen)

  return (
    <>
      {/* Page header */}
      <div className={`bg-white/80 backdrop-blur-sm border-b border-purple-100/60 px-4 sm:px-6 py-4 flex-shrink-0 ${!title ? 'lg:hidden' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Hamburger menu for mobile */}
            <button
              onClick={() => setOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg touch-manipulation"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
            
            {(title || subtitle) && (
              <div className="min-w-0 flex-1">
                {title && (
                  <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                    {typeof title === 'string' ? title : <div className="flex items-center">{title}</div>}
                  </h1>
                )}
                {subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">{subtitle}</p>}
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
        </div>
      </div>
      
      {/* Page content */}
      <div className="flex-1 p-4 sm:p-6">{children}</div>
    </>
  )
})

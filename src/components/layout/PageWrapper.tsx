'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Menu } from 'lucide-react'

interface PageWrapperProps {
  children: React.ReactNode
  title?: string | React.ReactNode
  subtitle?: string
  actions?: React.ReactNode
}

export function PageWrapper({ children, title, subtitle, actions }: PageWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-1 flex flex-col min-w-0">
        {/* Page header */}
        {title && (
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Hamburger menu for mobile */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg touch-manipulation"
                  aria-label="Open menu"
                >
                  <Menu size={24} />
                </button>
                
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                    {typeof title === 'string' ? title : <div className="flex items-center">{title}</div>}
                  </h1>
                  {subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">{subtitle}</p>}
                </div>
              </div>
              {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
            </div>
          </div>
        )}
        
        {/* Page content */}
        <div className="flex-1 p-4 sm:p-6">{children}</div>
      </main>
    </div>
  )
}

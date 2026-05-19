import { Sidebar } from './Sidebar'

interface PageWrapperProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}

export function PageWrapper({ children, title, subtitle, actions }: PageWrapperProps) {
  return (
    <div className="flex min-h-screen bg-grey-50">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        {/* Page header */}
        {title && (
          <div className="bg-white border-b border-grey-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-grey-900">{title}</h1>
                {subtitle && <p className="text-sm text-grey-500 mt-0.5">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-3">{actions}</div>}
            </div>
          </div>
        )}
        {/* Page content */}
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  )
}

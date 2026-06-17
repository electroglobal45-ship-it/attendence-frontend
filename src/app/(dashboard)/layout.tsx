import { Sidebar } from '@/components/layout/Sidebar'
import { RealtimeProvider } from '@/lib/realtime-provider'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0">
          {children}
        </main>
      </div>
    </RealtimeProvider>
  )
}

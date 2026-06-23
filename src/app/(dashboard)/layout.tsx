import { Sidebar } from '@/components/layout/Sidebar'
import { RealtimeProvider } from '@/lib/realtime-provider'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: '#F4F1F8' }}>
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </RealtimeProvider>
  )
}

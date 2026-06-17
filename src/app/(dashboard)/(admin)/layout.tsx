// Auth check moved to middleware for better performance
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// Auth check moved to middleware for better performance
export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

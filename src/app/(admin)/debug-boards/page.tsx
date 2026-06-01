'use client'

import { useEffect, useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { RefreshCw } from 'lucide-react'

export default function DebugBoardsPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const token = () => localStorage.getItem('authToken')

  const runDebug = async () => {
    setLoading(true)
    const info: any = {
      timestamp: new Date().toISOString(),
      token: token() ? 'Present' : 'Missing',
      tests: {}
    }

    try {
      // Test 1: Fetch projects
      console.log('Test 1: Fetching projects...')
      const projectsRes = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${token()}` }
      })
      info.tests.projects = {
        status: projectsRes.status,
        ok: projectsRes.ok,
        data: projectsRes.ok ? await projectsRes.json() : await projectsRes.text()
      }
      console.log('Projects result:', info.tests.projects)

      // Test 2: Fetch employees
      console.log('Test 2: Fetching employees...')
      const employeesRes = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${token()}` }
      })
      info.tests.employees = {
        status: employeesRes.status,
        ok: employeesRes.ok,
        data: employeesRes.ok ? await employeesRes.json() : await employeesRes.text()
      }
      console.log('Employees result:', info.tests.employees)

      // Test 3: Try to fetch a specific project (if any exist)
      if (info.tests.projects.ok && info.tests.projects.data.projects?.length > 0) {
        const firstProject = info.tests.projects.data.projects[0]
        console.log('Test 3: Fetching first project details...')
        
        // Try with public_id
        const projectRes = await fetch(`/api/projects/${firstProject.public_id}`, {
          headers: { Authorization: `Bearer ${token()}` }
        })
        info.tests.projectDetail = {
          public_id: firstProject.public_id,
          status: projectRes.status,
          ok: projectRes.ok,
          data: projectRes.ok ? await projectRes.json() : await projectRes.text()
        }
        console.log('Project detail result:', info.tests.projectDetail)

        // Test 4: Try to fetch lists
        if (projectRes.ok) {
          console.log('Test 4: Fetching lists...')
          const listsRes = await fetch(`/api/projects/${firstProject.public_id}/lists`, {
            headers: { Authorization: `Bearer ${token()}` }
          })
          info.tests.lists = {
            status: listsRes.status,
            ok: listsRes.ok,
            data: listsRes.ok ? await listsRes.json() : await listsRes.text()
          }
          console.log('Lists result:', info.tests.lists)
        }
      }

    } catch (err: any) {
      info.error = err.message
      console.error('Debug error:', err)
    }

    setDebugInfo(info)
    setLoading(false)
  }

  useEffect(() => {
    runDebug()
  }, [])

  return (
    <PageWrapper
      title="Debug Boards"
      subtitle="Diagnostic information for board functionality"
      actions={
        <button
          onClick={runDebug}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Run Tests
        </button>
      }
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={32} className="animate-spin text-gray-400" />
          </div>
        ) : debugInfo ? (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Auth Token:</span>
                  <span className={debugInfo.token === 'Present' ? 'text-green-600' : 'text-red-600'}>
                    {debugInfo.token}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Projects API:</span>
                  <span className={debugInfo.tests.projects?.ok ? 'text-green-600' : 'text-red-600'}>
                    {debugInfo.tests.projects?.status || 'Not tested'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Employees API:</span>
                  <span className={debugInfo.tests.employees?.ok ? 'text-green-600' : 'text-red-600'}>
                    {debugInfo.tests.employees?.status || 'Not tested'}
                  </span>
                </div>
                {debugInfo.tests.projectDetail && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Project Detail API:</span>
                    <span className={debugInfo.tests.projectDetail?.ok ? 'text-green-600' : 'text-red-600'}>
                      {debugInfo.tests.projectDetail?.status}
                    </span>
                  </div>
                )}
                {debugInfo.tests.lists && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lists API:</span>
                    <span className={debugInfo.tests.lists?.ok ? 'text-green-600' : 'text-red-600'}>
                      {debugInfo.tests.lists?.status}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Results */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Detailed Results</h3>
              <pre className="bg-gray-50 rounded p-4 text-xs overflow-auto max-h-96">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-2">What to check:</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>If "Auth Token" is Missing, you need to login first</li>
                <li>If Projects API returns 401/403, check authentication</li>
                <li>If Projects API returns 200 but no projects, create a board first</li>
                <li>If Project Detail API fails, there's an issue with public_id resolution</li>
                <li>If Lists API fails, there's an issue with the lists endpoint</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Click "Run Tests" to start diagnostics
          </div>
        )}
      </div>
    </PageWrapper>
  )
}

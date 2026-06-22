import { create } from 'zustand'
import { 
  attendanceAPI, holidaysAPI, leavesAPI, tasksAPI, 
  vaultAPI, meetingsAPI, employeesAPI, settingsAPI, boardsAPI,
  salaryAPI, adminAPI
} from '@/lib/tasks-api'
import { driveAPI } from '@/lib/drive-api'
import { agentsAPI } from '@/lib/backend-api'

export type LoadStatus = 'idle' | 'loading' | 'done' | 'error'

export type PrefetchChunk = 
  | 'attendance' 
  | 'history' 
  | 'leaves' 
  | 'tasks' 
  | 'holidays'
  | 'drive'
  | 'vault'
  | 'meetings'
  | 'projects'
  | 'employees'
  | 'settings'
  | 'salary'
  | 'agents'

interface PrefetchState {
  // ── Data ──────────────────────────────────────────────────────────────────
  todayAttendance: any | null
  attendanceHistory: any[]
  leaves: any[]
  shortLeaves: any[]
  myTasks: any[]
  holidays: any[]
  driveFiles: any[]
  vaultEntries: any[]
  meetings: any[]
  projects: any[]
  employees: any[]
  officeLocations: any[]
  salaryData: any | null
  driveConnected: boolean | null
  driveEmail: string | null
  agents: any[]

  // ── Admin Specific Data ───────────────────────────────────────────────────
  adminStats: any | null
  adminAttendance: any[]
  adminLeaves: any[]
  adminShortLeaves: any[]
  adminTasks: any[]

  // ── Status per chunk ──────────────────────────────────────────────────────
  status: Record<PrefetchChunk, LoadStatus>

  // ── Global flag ───────────────────────────────────────────────────────────
  isPrefetched: boolean

  // ── Actions ───────────────────────────────────────────────────────────────
  prefetchAll: () => Promise<void>
  refreshChunk: (chunk: PrefetchChunk, date?: string) => Promise<void>

  // Mutation helpers (update store after mutating API calls)
  updateTodayAttendance: (data: any) => void
  addLeave: (leave: any) => void
  addShortLeave: (leave: any) => void
  removeTask: (taskId: string) => void
  updateTaskStatus: (taskId: string, status: string) => void
  
  // New mutation helpers
  addDriveFile: (file: any) => void
  removeDriveFile: (fileId: string) => void
  addVaultEntry: (entry: any) => void
  removeVaultEntry: (entryId: string) => void
  addMeeting: (meeting: any) => void
  addProject: (project: any) => void

  reset: () => void
}

const defaultStatus: Record<PrefetchChunk, LoadStatus> = {
  attendance: 'idle',
  history:    'idle',
  leaves:     'idle',
  tasks:      'idle',
  holidays:   'idle',
  drive:      'idle',
  vault:      'idle',
  meetings:   'idle',
  projects:   'idle',
  employees:  'idle',
  settings:   'idle',
  salary:     'idle',
  agents:     'idle',
}

export const usePrefetchStore = create<PrefetchState>((set, get) => ({
  // ── Initial state ─────────────────────────────────────────────────────────
  todayAttendance:   null,
  attendanceHistory: [],
  leaves:            [],
  shortLeaves:       [],
  myTasks:           [],
  holidays:          [],
  driveFiles:        [],
  vaultEntries:      [],
  meetings:          [],
  projects:          [],
  employees:         [],
  officeLocations:   [],
  salaryData:        null,
  driveConnected:    null,
  driveEmail:        null,
  agents:            [],

  adminStats:        null,
  adminAttendance:   [],
  adminLeaves:       [],
  adminShortLeaves:  [],
  adminTasks:        [],

  status:            { ...defaultStatus },
  isPrefetched:      false,

  // ── Prefetch all chunks in parallel ──────────────────────────────────────
  prefetchAll: async () => {
    // Guard: don't prefetch twice
    if (get().isPrefetched) return

    // Mark all chunks as loading
    set({
      status: {
        attendance: 'loading',
        history:    'loading',
        leaves:     'loading',
        tasks:      'loading',
        holidays:   'loading',
        drive:      'loading',
        vault:      'loading',
        meetings:   'loading',
        projects:   'loading',
        employees:  'loading',
        settings:   'loading',
        salary:     'loading',
        agents:     'loading',
      }
    })

    const isAdmin = typeof window !== 'undefined' && localStorage.getItem('userRole') === 'admin'

    // Fire all chunks in parallel, each independently
    const promises = {
      attendance: attendanceAPI.getTodayAttendance(),
      history: attendanceAPI.getHistory(60),
      leaves: leavesAPI.getLeaveRequests(),
      shortLeaves: leavesAPI.getShortLeaves(),
      tasks: tasksAPI.getMyTasks(),
      holidays: holidaysAPI.getAllHolidays(),
      driveFiles: typeof window !== 'undefined' ? driveAPI.listFiles().catch(() => []) : Promise.resolve([]),
      vault: vaultAPI.getEntries().catch(() => ({ data: { entries: [] } })),
      meetings: meetingsAPI.getMeetings().catch(() => ({ data: { meetings: [] } })),
      projects: boardsAPI.getProjectBoards('c691dc11-b522-4e80-8ae6-337244d2a28d').catch(() => ({ data: { boards: [] } })),
      employees: employeesAPI.getAllEmployees().catch(() => ({ data: { employees: [] } })),
      settings: settingsAPI.getOfficeLocations().catch(() => ({ data: { locations: [] } })),
      salary: typeof window !== 'undefined'
        ? salaryAPI.getSalarySlips(new Date().getMonth() + 1, new Date().getFullYear()).catch(() => null)
        : Promise.resolve(null),
      driveStatus: typeof window !== 'undefined'
        ? driveAPI.getConnectionStatus().catch(() => ({ connected: false, email: null }))
        : Promise.resolve({ connected: false, email: null }),
      // Admin dashboard data
      adminStats: isAdmin ? adminAPI.getDashboardStats().catch(() => null) : Promise.resolve(null),
      adminAttendance: isAdmin ? adminAPI.getAllAttendance({ date: new Date().toISOString().split('T')[0] }).catch(() => null) : Promise.resolve(null),
      adminLeaves: isAdmin ? adminAPI.getAllLeaves('pending').catch(() => null) : Promise.resolve(null),
      adminShortLeaves: isAdmin ? leavesAPI.getShortLeaves(true).catch(() => null) : Promise.resolve(null),
      adminTasks: isAdmin ? tasksAPI.getAllTasks().catch(() => null) : Promise.resolve(null),
      agents: isAdmin ? agentsAPI.getAgents().catch(() => null) : Promise.resolve(null),
    }

    const keys = Object.keys(promises) as (keyof typeof promises)[]
    const results = await Promise.allSettled(Object.values(promises))
    const resultsMap = {} as Record<keyof typeof promises, PromiseSettledResult<any>>
    keys.forEach((key, index) => {
      resultsMap[key] = results[index]
    })

    set((state) => {
      const newStatus = { ...state.status }
      const updates: Partial<PrefetchState> = {}

      // Attendance today
      const attendanceResult = resultsMap.attendance
      if (attendanceResult.status === 'fulfilled') {
        updates.todayAttendance = attendanceResult.value?.data?.attendance ?? null
        newStatus.attendance = 'done'
      } else {
        newStatus.attendance = 'error'
      }

      // History
      const historyResult = resultsMap.history
      if (historyResult.status === 'fulfilled') {
        updates.attendanceHistory = historyResult.value?.data?.records ?? []
        newStatus.history = 'done'
      } else {
        newStatus.history = 'error'
      }

      // Leaves
      const leavesResult = resultsMap.leaves
      const shortLeavesResult = resultsMap.shortLeaves
      const leavesOk   = leavesResult.status === 'fulfilled'
      const shortOk     = shortLeavesResult.status === 'fulfilled'
      updates.leaves      = leavesOk  ? (leavesResult.value?.data?.leaves      ?? []) : state.leaves
      updates.shortLeaves = shortOk   ? (shortLeavesResult.value?.data?.leaves ?? []) : state.shortLeaves
      newStatus.leaves = leavesOk || shortOk ? 'done' : 'error'

      // Tasks
      const tasksResult = resultsMap.tasks
      if (tasksResult.status === 'fulfilled') {
        const all = tasksResult.value?.data?.tasks ?? []
        updates.myTasks = all
        newStatus.tasks = 'done'
      } else {
        newStatus.tasks = 'error'
      }

      // Holidays
      const holidaysResult = resultsMap.holidays
      if (holidaysResult.status === 'fulfilled') {
        updates.holidays = holidaysResult.value?.data?.holidays?.map((h: any) => ({ id: h.id, name: h.name, date: h.date })) ?? []
        newStatus.holidays = 'done'
      } else {
        newStatus.holidays = 'error'
      }

      // Drive
      const driveResult = resultsMap.driveFiles
      if (driveResult.status === 'fulfilled') {
        const val = driveResult.value
        updates.driveFiles = Array.isArray(val) ? val : (val as any)?.data?.files ?? []
        newStatus.drive = 'done'
      } else {
        newStatus.drive = 'error'
      }

      // Vault
      const vaultResult = resultsMap.vault
      if (vaultResult.status === 'fulfilled') {
        updates.vaultEntries = (vaultResult.value as any)?.data?.entries ?? []
        newStatus.vault = 'done'
      } else {
        newStatus.vault = 'error'
      }

      // Meetings
      const meetingsResult = resultsMap.meetings
      if (meetingsResult.status === 'fulfilled') {
        updates.meetings = (meetingsResult.value as any)?.data?.meetings ?? []
        newStatus.meetings = 'done'
      } else {
        newStatus.meetings = 'error'
      }

      // Projects
      const projectsResult = resultsMap.projects
      if (projectsResult.status === 'fulfilled') {
        updates.projects = (projectsResult.value as any)?.data?.boards ?? []
        newStatus.projects = 'done'
      } else {
        newStatus.projects = 'error'
      }

      // Employees
      const employeesResult = resultsMap.employees
      if (employeesResult.status === 'fulfilled') {
        updates.employees = (employeesResult.value as any)?.data?.employees ?? []
        newStatus.employees = 'done'
      } else {
        newStatus.employees = 'error'
      }

      // Settings
      const settingsResult = resultsMap.settings
      if (settingsResult.status === 'fulfilled') {
        updates.officeLocations = (settingsResult.value as any)?.data?.locations ?? []
        newStatus.settings = 'done'
      } else {
        newStatus.settings = 'error'
      }

      // Salary
      const salaryResult = resultsMap.salary
      if (salaryResult.status === 'fulfilled') {
        updates.salaryData = salaryResult.value ?? null
        newStatus.salary = 'done'
      } else {
        newStatus.salary = 'error'
      }

      // Drive connection status
      const driveStatusResult = resultsMap.driveStatus
      if (driveStatusResult.status === 'fulfilled') {
        updates.driveConnected = driveStatusResult.value.connected
        updates.driveEmail = driveStatusResult.value.email
      } else {
        updates.driveConnected = false
        updates.driveEmail = null
      }

      // Admin updates
      if (isAdmin) {
        const adminStatsResult = resultsMap.adminStats
        const adminAttendanceResult = resultsMap.adminAttendance
        const adminLeavesResult = resultsMap.adminLeaves
        const adminShortLeavesResult = resultsMap.adminShortLeaves
        const adminTasksResult = resultsMap.adminTasks

        if (adminStatsResult.status === 'fulfilled' && adminStatsResult.value) {
          updates.adminStats = adminStatsResult.value.data ?? null
        }
        if (adminAttendanceResult.status === 'fulfilled' && adminAttendanceResult.value) {
          updates.adminAttendance = adminAttendanceResult.value.data?.records ?? []
        }
        if (adminLeavesResult.status === 'fulfilled' && adminLeavesResult.value) {
          updates.adminLeaves = adminLeavesResult.value.data?.leaves ?? []
        }
        if (adminShortLeavesResult.status === 'fulfilled' && adminShortLeavesResult.value) {
          updates.adminShortLeaves = adminShortLeavesResult.value.data?.leaves ?? []
        }
        if (adminTasksResult.status === 'fulfilled' && adminTasksResult.value) {
          updates.adminTasks = adminTasksResult.value.data?.tasks ?? []
        }
        
        const agentsResult = resultsMap.agents
        if (agentsResult && agentsResult.status === 'fulfilled' && agentsResult.value) {
          updates.agents = agentsResult.value.data?.agents ?? []
          newStatus.agents = 'done'
        } else if (isAdmin) {
          newStatus.agents = 'error'
        }
      }

      return { ...updates, status: newStatus, isPrefetched: true }
    })
  },

  refreshChunk: async (chunk: PrefetchChunk, date?: string) => {
    set((state) => ({ status: { ...state.status, [chunk]: 'loading' } }))

    const isAdmin = typeof window !== 'undefined' && localStorage.getItem('userRole') === 'admin'

    try {
      switch (chunk) {
        case 'attendance': {
          if (isAdmin) {
            const queryDate = date || new Date().toISOString().split('T')[0]
            const [attRes, statsRes, userAttRes] = await Promise.allSettled([
              adminAPI.getAllAttendance({ date: queryDate }),
              adminAPI.getDashboardStats(),
              attendanceAPI.getTodayAttendance()
            ])
            set((state) => ({
              adminAttendance: attRes.status === 'fulfilled' && attRes.value?.success ? attRes.value.data.records : state.adminAttendance,
              adminStats: statsRes.status === 'fulfilled' && statsRes.value?.success ? statsRes.value.data : state.adminStats,
              todayAttendance: userAttRes.status === 'fulfilled' && userAttRes.value?.success ? userAttRes.value.data.attendance : state.todayAttendance,
              status: { ...state.status, attendance: 'done' },
            }))
          } else {
            const res = await attendanceAPI.getTodayAttendance()
            set((state) => ({
              todayAttendance: res?.data?.attendance ?? null,
              status: { ...state.status, attendance: 'done' },
            }))
          }
          break
        }
        case 'history': {
          const res = await attendanceAPI.getHistory(60)
          set((state) => ({
            attendanceHistory: res?.data?.records ?? [],
            status: { ...state.status, history: 'done' },
          }))
          break
        }
        case 'leaves': {
          if (isAdmin) {
            const [lRes, sRes, statsRes, userLRes, userSRes] = await Promise.allSettled([
              adminAPI.getAllLeaves('pending'),
              leavesAPI.getShortLeaves(true),
              adminAPI.getDashboardStats(),
              leavesAPI.getLeaveRequests(),
              leavesAPI.getShortLeaves(),
            ])
            set((state) => ({
              adminLeaves:      lRes.status === 'fulfilled' && lRes.value?.success ? lRes.value.data.leaves : state.adminLeaves,
              adminShortLeaves: sRes.status === 'fulfilled' && sRes.value?.success ? sRes.value.data.leaves : state.adminShortLeaves,
              adminStats:       statsRes.status === 'fulfilled' && statsRes.value?.success ? statsRes.value.data : state.adminStats,
              leaves:           userLRes.status === 'fulfilled' ? (userLRes.value?.data?.leaves ?? []) : state.leaves,
              shortLeaves:      userSRes.status === 'fulfilled' ? (userSRes.value?.data?.leaves ?? []) : state.shortLeaves,
              status: { ...state.status, leaves: 'done' },
            }))
          } else {
            const [lRes, sRes] = await Promise.allSettled([
              leavesAPI.getLeaveRequests(),
              leavesAPI.getShortLeaves(),
            ])
            set((state) => ({
              leaves:      lRes.status === 'fulfilled' ? (lRes.value?.data?.leaves ?? [])     : state.leaves,
              shortLeaves: sRes.status === 'fulfilled' ? (sRes.value?.data?.leaves ?? [])     : state.shortLeaves,
              status: { ...state.status, leaves: 'done' },
            }))
          }
          break
        }
        case 'tasks': {
          if (isAdmin) {
            const [tasksRes, statsRes, userTasksRes] = await Promise.allSettled([
              tasksAPI.getAllTasks(),
              adminAPI.getDashboardStats(),
              tasksAPI.getMyTasks(),
            ])
            set((state) => ({
              adminTasks: tasksRes.status === 'fulfilled' && tasksRes.value?.success ? tasksRes.value.data.tasks : state.adminTasks,
              adminStats: statsRes.status === 'fulfilled' && statsRes.value?.success ? statsRes.value.data : state.adminStats,
              myTasks:    userTasksRes.status === 'fulfilled' && userTasksRes.value?.success ? userTasksRes.value.data.tasks : state.myTasks,
              status: { ...state.status, tasks: 'done' },
            }))
          } else {
            const res = await tasksAPI.getMyTasks()
            const all = res?.data?.tasks ?? []
            set((state) => ({
              myTasks: all,
              status: { ...state.status, tasks: 'done' },
            }))
          }
          break
        }
        case 'holidays': {
          const res = await holidaysAPI.getAllHolidays()
          set((state) => ({
            holidays: res?.data?.holidays?.map((h: any) => ({ id: h.id, name: h.name, date: h.date })) ?? [],
            status: { ...state.status, holidays: 'done' },
          }))
          break
        }
        case 'drive': {
          const res = await driveAPI.listFiles()
          set((state) => ({
            driveFiles: res,
            status: { ...state.status, drive: 'done' },
          }))
          break
        }
        case 'vault': {
          const res = await vaultAPI.getEntries()
          set((state) => ({
            vaultEntries: res?.data?.entries ?? [],
            status: { ...state.status, vault: 'done' },
          }))
          break
        }
        case 'meetings': {
          const res = await meetingsAPI.getMeetings()
          set((state) => ({
            meetings: res?.data?.meetings ?? [],
            status: { ...state.status, meetings: 'done' },
          }))
          break
        }
        case 'projects': {
          const res = await boardsAPI.getProjectBoards('c691dc11-b522-4e80-8ae6-337244d2a28d')
          set((state) => ({
            projects: res?.data?.boards ?? [],
            status: { ...state.status, projects: 'done' },
          }))
          break
        }
        case 'employees': {
          if (isAdmin) {
            const [empRes, statsRes] = await Promise.allSettled([
              employeesAPI.getAllEmployees(),
              adminAPI.getDashboardStats()
            ])
            set((state) => ({
              employees: empRes.status === 'fulfilled' && empRes.value?.success ? empRes.value.data.employees : state.employees,
              adminStats: statsRes.status === 'fulfilled' && statsRes.value?.success ? statsRes.value.data : state.adminStats,
              status: { ...state.status, employees: 'done' },
            }))
          } else {
            const res = await employeesAPI.getAllEmployees()
            set((state) => ({
              employees: res?.data?.employees ?? [],
              status: { ...state.status, employees: 'done' },
            }))
          }
          break
        }
        case 'settings': {
          const res = await settingsAPI.getOfficeLocations()
          set((state) => ({
            officeLocations: res?.data?.locations ?? [],
            status: { ...state.status, settings: 'done' },
          }))
          break
        }
        case 'salary': {
          const res = await salaryAPI.getSalarySlips(new Date().getMonth() + 1, new Date().getFullYear())
          set((state) => ({
            salaryData: res ?? null,
            status: { ...state.status, salary: 'done' },
          }))
          break
        }
        case 'agents': {
          if (isAdmin) {
            const res = await agentsAPI.getAgents()
            set((state) => ({
              agents: res?.data?.agents ?? [],
              status: { ...state.status, agents: 'done' },
            }))
          } else {
            set((state) => ({
              status: { ...state.status, agents: 'done' },
            }))
          }
          break
        }
      }
    } catch {
      set((state) => ({ status: { ...state.status, [chunk]: 'error' } }))
    }
  },

  // ── Mutation helpers ──────────────────────────────────────────────────────
  updateTodayAttendance: (data) => set({ todayAttendance: data }),

  addLeave: (leave) => set((state) => ({ leaves: [leave, ...state.leaves] })),

  addShortLeave: (leave) => set((state) => ({ shortLeaves: [leave, ...state.shortLeaves] })),

  removeTask: (taskId) =>
    set((state) => ({ myTasks: state.myTasks.filter((t) => t.id !== taskId) })),

  updateTaskStatus: (taskId, status) =>
    set((state) => ({
      myTasks: state.myTasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
    })),

  addDriveFile: (file) => set((state) => ({ driveFiles: [file, ...state.driveFiles] })),
  removeDriveFile: (fileId) => set((state) => ({ driveFiles: state.driveFiles.filter((f) => f.id !== fileId) })),
  addVaultEntry: (entry) => set((state) => ({ vaultEntries: [entry, ...state.vaultEntries] })),
  removeVaultEntry: (entryId) => set((state) => ({ vaultEntries: state.vaultEntries.filter((v) => v.id !== entryId) })),
  addMeeting: (meeting) => set((state) => ({ meetings: [meeting, ...state.meetings] })),
  addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),

  // ── Reset on logout ───────────────────────────────────────────────────────
  reset: () =>
    set({
      todayAttendance:   null,
      attendanceHistory: [],
      leaves:            [],
      shortLeaves:       [],
      myTasks:           [],
      holidays:          [],
      driveFiles:        [],
      vaultEntries:      [],
      meetings:          [],
      projects:          [],
      employees:         [],
      officeLocations:   [],
      salaryData:        null,
      driveConnected:    null,
      driveEmail:        null,

      adminStats:        null,
      adminAttendance:   [],
      adminLeaves:       [],
      adminShortLeaves:  [],
      adminTasks:        [],
      agents:            [],

      status:            { ...defaultStatus },
      isPrefetched:      false,
    }),
}))

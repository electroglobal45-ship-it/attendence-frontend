'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { vaultAPI, AdminVaultEntry, VaultAssignment } from '@/lib/tasks-api'
import { usePrefetchStore } from '@/lib/store/prefetch-store'
import {
  Shield, Plus, Trash2, RefreshCw, Eye, EyeOff,
  Copy, Check, X, RotateCcw, KeyRound, ChevronDown,
  Users, AlertTriangle, Search, ArrowLeft, ExternalLink,
  Edit, MoreVertical, History, CheckSquare, Square, ListFilter,
} from 'lucide-react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

interface Employee { id: string; name: string; email: string }

// ── Helper to format domains and URLs ─────────────────────────────────────────
const getDomain = (urlOrName: string) => {
  const clean = urlOrName.trim().toLowerCase()
  try {
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      const parsed = new URL(clean)
      return parsed.hostname
    }
  } catch (e) {}
  if (clean.includes('.')) return clean
  return `${clean}.com`
}

const getSiteLink = (serviceName: string, siteUrl?: string | null) => {
  if (siteUrl) {
    try {
      const clean = siteUrl.trim().toLowerCase()
      if (clean.startsWith('http://') || clean.startsWith('https://')) {
        const parsed = new URL(clean)
        return parsed.hostname
      }
      return clean
    } catch {
      return siteUrl
    }
  }
  const domain = getDomain(serviceName)
  if (serviceName.toLowerCase().includes('apollo')) {
    return 'app.apollo.io'
  }
  return domain
}

const getSiteUrl = (serviceName: string, siteUrl?: string | null) => {
  if (siteUrl) {
    return siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`
  }
  const link = getSiteLink(serviceName, siteUrl)
  return link.startsWith('http') ? link : `https://${link}`
}

// ── Multi-employee selector ──────────────────────────────────────────────────
function EmployeeMultiSelect({
  employees, selected, onChange, placeholder = 'Select employees…'
}: {
  employees: Employee[]
  selected: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  const selectedNames = employees.filter(e => selected.includes(e.id)).map(e => e.name)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none text-left"
        style={{ boxShadow: 'none' }}
      >
        <span className={selected.length === 0 ? 'text-gray-400' : 'text-gray-800'}>
          {selected.length === 0
            ? placeholder
            : selectedNames.length <= 2
              ? selectedNames.join(', ')
              : `${selectedNames[0]}, ${selectedNames[1]} +${selected.length - 2} more`}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {employees.length === 0 ? (
            <p className="p-3 text-xs text-gray-400 text-center">No employees found</p>
          ) : employees.map(emp => (
            <label key={emp.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(emp.id)}
                onChange={() => toggle(emp.id)}
                className="w-4 h-4 rounded border-gray-300"
                style={{ accentColor: '#4A1F6F' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{emp.name}</p>
                <p className="text-xs text-gray-400 truncate">{emp.email}</p>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminVaultPage() {
  const storeVaultEntries = usePrefetchStore((state) => state.vaultEntries)
  const storeEmployees = usePrefetchStore((state) => state.employees)
  const [entries, setEntries]   = useState<AdminVaultEntry[]>(() => storeVaultEntries ?? [])
  const [employees, setEmployees] = useState<Employee[]>(() => storeEmployees ?? [])
  const [loading, setLoading]   = useState(() => !storeVaultEntries || storeVaultEntries.length === 0)
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [resettingKey, setResettingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Two-pane states
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(() => 
    storeVaultEntries && storeVaultEntries.length > 0 ? storeVaultEntries[0].id : null
  )
  const [showCredentials, setShowCredentials] = useState(false)
  const [showActionsDropdown, setShowActionsDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInfoToast, setShowInfoToast] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null)
  const [filterEmployees, setFilterEmployees] = useState<string[]>([])

  // Bulk selection states
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false)
  const [bulkAssignEmployees, setBulkAssignEmployees] = useState<string[]>([])

  // History version states
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showGlobalHistoryModal, setShowGlobalHistoryModal] = useState(false)
  const [historyList, setHistoryList] = useState<any[]>([])
  const [globalHistoryList, setGlobalHistoryList] = useState<any[]>([])
  const [fetchingHistory, setFetchingHistory] = useState(false)

  useEffect(() => {
    setShowCredentials(false)
    setShowActionsDropdown(false)
  }, [selectedEntryId])

  // Form state
  const [form, setForm] = useState({
    service_name: '',
    username: '',
    password: '',
    site_url: '',
    notes: '',
  })
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [showFormPw, setShowFormPw] = useState(false)

  // Assignment Modal state
  const [assigningEntry, setAssigningEntry] = useState<AdminVaultEntry | null>(null)
  const [assignSelectedEmployees, setAssignSelectedEmployees] = useState<string[]>([])

  const fetchData = useCallback(async (selectFirst = false, silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [vaultRes, usersRes] = await Promise.all([
        vaultAPI.getEntries(),
        fetch(`${BACKEND_URL}/api/v1/users`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        }).then(r => r.json()),
      ])
      const fetchedEntries = vaultRes.data.entries as AdminVaultEntry[]
      const fetchedEmployees = (usersRes.data?.users || []).filter((u: any) => u.role === 'employee')
      setEntries(fetchedEntries)
      setEmployees(fetchedEmployees)
      
      // Update prefetch store
      usePrefetchStore.setState({
        vaultEntries: fetchedEntries,
        employees: fetchedEmployees,
        status: {
          ...usePrefetchStore.getState().status,
          vault: 'done',
          employees: 'done',
        }
      })
      
      if (selectFirst && fetchedEntries.length > 0 && !selectedEntryId) {
        setSelectedEntryId(fetchedEntries[0].id)
      }
    } catch (e: any) {
      if (!silent) setError(e.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [selectedEntryId])

  // Sync state if prefetch store updates externally
  useEffect(() => {
    if (storeVaultEntries && storeVaultEntries.length > 0) {
      setEntries(storeVaultEntries)
      if (!selectedEntryId) {
        setSelectedEntryId(storeVaultEntries[0].id)
      }
    }
  }, [storeVaultEntries, selectedEntryId])

  useEffect(() => {
    if (storeEmployees && storeEmployees.length > 0) {
      setEmployees(storeEmployees)
    }
  }, [storeEmployees])

  useEffect(() => { 
    const hasData = storeVaultEntries && storeVaultEntries.length > 0
    fetchData(true, hasData) 
  }, [fetchData])

  const resetForm = () => {
    setForm({ service_name: '', username: '', password: '', site_url: '', notes: '' })
    setSelectedEmployees([])
    setShowFormPw(false)
    setIsEditing(false)
    setError(null)
  }

  const handleEditClick = () => {
    if (!selectedEntry) return
    setForm({
      service_name: selectedEntry.service_name,
      username: selectedEntry.username,
      site_url: selectedEntry.site_url || '',
      notes: selectedEntry.notes || '',
      password: selectedEntry.password || '',
    })
    setSelectedEmployees(selectedEntry.assignments?.map(a => a.assigned_to) || [])
    setIsEditing(true)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedEmployees.length === 0) {
      setError('Please select at least one employee')
      return
    }
    setError(null)
    setSubmitting(true)

    try {
      if (isEditing && selectedEntryId) {
        const payload: any = {
          service_name: form.service_name,
          username: form.username,
          site_url: form.site_url,
          notes: form.notes,
          assigned_to: selectedEmployees,
        }
        if (form.password) {
          payload.password = form.password
        }

        const res = await vaultAPI.updateEntry(selectedEntryId, payload)
        const updatedEntry = res.data.entry

        setEntries(prev => prev.map(item => item.id === selectedEntryId ? updatedEntry : item))
        usePrefetchStore.setState({
          vaultEntries: usePrefetchStore.getState().vaultEntries.map(item => item.id === selectedEntryId ? updatedEntry : item)
        })
        setShowForm(false)
        resetForm()
      } else {
        // ── OPTIMISTIC: show the entry immediately ────────────────────────────────
        const tempId = `temp-${Date.now()}`
        const optimisticEntry: AdminVaultEntry = {
          id:           tempId,
          service_name: form.service_name,
          username:     form.username,
          notes:        form.notes || null,
          site_url:     form.site_url || null,
          created_by:   '',
          created_at:   new Date().toISOString(),
          assignments:  selectedEmployees.map(id => ({
            id:          `temp-a-${id}`,
            assigned_to: id,
            is_revealed: false,
            assignee:    employees.find(emp => emp.id === id)
                           ? { id, name: employees.find(emp => emp.id === id)!.name, email: employees.find(emp => emp.id === id)!.email }
                           : undefined,
          })),
          password: form.password,
        }
        const snapshotForm = { ...form }
        const snapshotEmployees = [...selectedEmployees]

        setEntries(prev => [optimisticEntry, ...prev])
        usePrefetchStore.setState({
          vaultEntries: [optimisticEntry, ...usePrefetchStore.getState().vaultEntries]
        })
        setSelectedEntryId(tempId)
        setShowForm(false)
        resetForm()

        try {
          const res = await vaultAPI.createEntry({
            ...snapshotForm,
            assigned_to: snapshotEmployees,
          })
          const newEntry = res.data.entry
          // Swap the temp entry with the real one
          setEntries(prev => prev.map(item => item.id === tempId ? newEntry : item))
          usePrefetchStore.setState({
            vaultEntries: usePrefetchStore.getState().vaultEntries.map(item => item.id === tempId ? newEntry : item)
          })
          setSelectedEntryId(newEntry.id)
        } catch (err: any) {
          // Roll back on failure
          setEntries(prev => prev.filter(item => item.id !== tempId))
          usePrefetchStore.setState({
            vaultEntries: usePrefetchStore.getState().vaultEntries.filter(item => item.id !== tempId)
          })
          setSelectedEntryId(null)
          setError(err.message || 'Failed to save credential')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save credential')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assigningEntry || assignSelectedEmployees.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await vaultAPI.assignEmployees(assigningEntry.id, assignSelectedEmployees)
      const updatedEntry = res.data.entry
      setEntries(prev => prev.map(item => item.id === assigningEntry.id ? updatedEntry : item))
      usePrefetchStore.setState({
        vaultEntries: usePrefetchStore.getState().vaultEntries.map(item => item.id === assigningEntry.id ? updatedEntry : item)
      })
      setAssigningEntry(null)
      setAssignSelectedEmployees([])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently delete "${name}" and all its assignments?`)) return
    setDeletingId(id)
    try {
      setEntries(prev => prev.filter(e => e.id !== id))
      usePrefetchStore.setState({
        vaultEntries: usePrefetchStore.getState().vaultEntries.filter(e => e.id !== id)
      })
      if (selectedEntryId === id) {
        setSelectedEntryId(null)
      }
      await vaultAPI.deleteEntry(id)
    } catch (e: any) {
      setError(e.message)
      fetchData(false, true)
    } finally {
      setDeletingId(null)
    }
  }

  const handleReset = async (vaultId: string, employeeId?: string) => {
    const key = `${vaultId}:${employeeId || 'all'}`
    setResettingKey(key)
    try {
      await vaultAPI.resetReveal(vaultId, employeeId)
      const updated = (prev: AdminVaultEntry[]) => prev.map(e => {
        if (e.id !== vaultId) return e
        return {
          ...e,
          assignments: e.assignments.map(a =>
            !employeeId || a.assigned_to === employeeId
               ? { ...a, is_revealed: false }
               : a
          ),
        }
      })
      setEntries(updated)
      usePrefetchStore.setState({
        vaultEntries: updated(usePrefetchStore.getState().vaultEntries)
      })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setResettingKey(null)
    }
  }

  // Bulk Actions
  const toggleBulkSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Are you sure you want to delete the ${selectedIds.length} selected credentials?`)) return
    setLoading(true)
    try {
      await vaultAPI.bulkDelete(selectedIds)
      const remaining = entries.filter(e => !selectedIds.includes(e.id))
      setEntries(remaining)
      usePrefetchStore.setState({ vaultEntries: remaining })
      setSelectedIds([])
      setSelectedEntryId(remaining.length > 0 ? remaining[0].id : null)
      triggerToast('Credentials deleted successfully')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedIds.length === 0 || bulkAssignEmployees.length === 0) return
    setSubmitting(true)
    try {
      await vaultAPI.bulkAssign(selectedIds, bulkAssignEmployees)
      setShowBulkAssignModal(false)
      setBulkAssignEmployees([])
      setSelectedIds([])
      setBulkMode(false)
      triggerToast('Employees assigned successfully')
      fetchData(false, true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  // History version recovery (Single Item)
  const handleOpenHistory = async () => {
    if (!selectedEntryId) return
    setFetchingHistory(true)
    setShowHistoryModal(true)
    try {
      const res = await vaultAPI.getHistory(selectedEntryId)
      setHistoryList(res.data.history)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setFetchingHistory(false)
    }
  }

  // Global History Versions (All Items)
  const handleOpenGlobalHistory = async () => {
    setFetchingHistory(true)
    setShowGlobalHistoryModal(true)
    try {
      const res = await (vaultAPI as any).getAllHistory()
      setGlobalHistoryList(res.data.history)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setFetchingHistory(false)
    }
  }

  const handleReviveVersion = async (vaultId: string, historyId: string) => {
    if (!confirm('Are you sure you want to restore this password version? Current active password will be archived to history.')) return
    setSubmitting(true)
    try {
      const res = await vaultAPI.reviveVersion(vaultId, historyId)
      const updatedEntry = res.data.entry
      setEntries(prev => prev.map(item => item.id === vaultId ? updatedEntry : item))
      usePrefetchStore.setState({
        vaultEntries: usePrefetchStore.getState().vaultEntries.map(item => item.id === vaultId ? updatedEntry : item)
      })
      setShowHistoryModal(false)
      setShowGlobalHistoryModal(false)
      triggerToast('Password version restored successfully')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const copyToClipboard = (text: string, field: 'username' | 'password') => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const triggerToast = (message: string) => {
    setShowInfoToast(message)
    setTimeout(() => setShowInfoToast(null), 3500)
  }

  // Filtered list based on search and employee filter
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.username.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false

    if (filterEmployees.length > 0) {
      const assignedIds = entry.assignments?.map(a => a.assigned_to) || []
      return filterEmployees.some(id => assignedIds.includes(id))
    }
    return true
  })

  const selectedEntry = entries.find(e => e.id === selectedEntryId) || null

  return (
    <PageWrapper
      title={
        <div className="flex items-center gap-2">
          <KeyRound style={{ color: '#4A1F6F' }} size={22} />
          <span>Password Manager</span>
        </div>
      }
      actions={
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mobile search indicator button or toggle */}
          <div className="lg:hidden flex items-center bg-gray-50 border rounded-lg px-2 py-1.5 border-gray-300">
            <Search size={14} className="text-gray-400 mr-1" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-xs w-20"
            />
          </div>

          <button onClick={handleOpenGlobalHistory}
            className="flex items-center gap-1 px-3 py-2 border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg text-xs font-semibold transition"
          >
            <History size={13} />
            <span>All Password Versions</span>
          </button>

          <button onClick={() => fetchData(false, false)} disabled={loading}
            className="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm border rounded-lg disabled:opacity-50 transition"
            style={{ borderColor: 'rgba(74,31,111,0.3)', color: '#4A1F6F', background: 'rgba(74,31,111,0.04)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(74,31,111,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(74,31,111,0.04)')}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-white rounded-lg transition font-medium"
            style={{ background: 'linear-gradient(135deg, #4A1F6F 0%, #2D0F47 100%)', boxShadow: '0 4px 12px rgba(74,31,111,0.35)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #2D0F47 0%, #1a0930 100%)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #4A1F6F 0%, #2D0F47 100%)')}>
            <Plus size={16} />
            Add
          </button>
        </div>
      }
    >
      {/* Toast Alert */}
      {showInfoToast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in border border-gray-800 text-sm">
          <AlertTriangle size={16} className="text-amber-400" />
          <span>{showInfoToast}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
          <AlertTriangle size={14} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Bulk actions bar */}
      {bulkMode && selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 mb-4 bg-purple-50 border border-purple-200 rounded-xl animate-fade-in">
          <span className="text-sm font-semibold text-purple-900">{selectedIds.length} items selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkAssignModal(true)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition"
            >
              Bulk Assign
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
            >
              Bulk Delete
            </button>
          </div>
        </div>
      )}

      {/* Two-Pane Password Manager Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
        
        {/* LEFT PANEL: SEARCH & PASSWORD LIST */}
        <div className={`col-span-1 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col ${selectedEntryId && !bulkMode ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100 space-y-3">
            {/* Search Bar */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search passwords"
                className="bg-transparent border-none outline-none text-sm w-full text-gray-800 placeholder-gray-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Employee Filter */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Filter by Employee</span>
              <EmployeeMultiSelect
                employees={employees}
                selected={filterEmployees}
                onChange={setFilterEmployees}
                placeholder="Filter by employee…"
              />
              {filterEmployees.length > 0 && (
                <div className="flex justify-end px-1">
                  <button 
                    type="button" 
                    onClick={() => setFilterEmployees([])} 
                    className="text-xs font-semibold cursor-pointer"
                    style={{ color: '#4A1F6F' }}
                  >
                    Clear Filter
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 max-h-[550px]">
            {loading && entries.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading passwords…</div>
            ) : filteredEntries.length === 0 ? (
              <div className="p-12 text-center">
                <KeyRound size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 font-medium">No credentials found</p>
                <p className="text-xs text-gray-400 mt-0.5">Try a different search term</p>
              </div>
            ) : (
              filteredEntries.map(entry => {
                const isSelected = selectedEntryId === entry.id
                const domain = entry.site_url ? getDomain(entry.site_url) : getDomain(entry.service_name)
                const isBulkChecked = selectedIds.includes(entry.id)
                
                return (
                  <div
                    key={entry.id}
                    onClick={() => {
                      if (bulkMode) {
                        toggleBulkSelect(entry.id)
                      } else {
                        setSelectedEntryId(entry.id)
                      }
                    }}
                    className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${
                      isSelected && !bulkMode ? 'border-l-4' : 'hover:bg-gray-50'
                    }`}
                    style={isSelected && !bulkMode ? { background: 'rgba(74,31,111,0.06)', borderLeftColor: '#4A1F6F' } : {}}
                  >
                    {/* Bulk select checkbox */}
                    {bulkMode && (
                      <div className="text-purple-700 flex-shrink-0 mr-1">
                        {isBulkChecked ? <CheckSquare size={18} /> : <Square size={18} className="text-gray-300" />}
                      </div>
                    )}

                    {/* Site favicon with third-party service */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border overflow-hidden" style={{ background: 'rgba(74,31,111,0.08)', borderColor: 'rgba(74,31,111,0.15)' }}>
                      <img
                        src={`https://www.google.com/icons/thirdparty/images/png?size=32&domain=${domain}`}
                        alt={entry.service_name}
                        className="w-5 h-5 object-contain"
                        onError={(e) => {
                          ;(e.target as HTMLElement).style.display = 'none'
                        }}
                      />
                      <span className="text-sm font-bold uppercase select-none fallback-initial" style={{ color: '#4A1F6F' }}>
                        {entry.service_name[0]}
                      </span>
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: isSelected && !bulkMode ? '#2D0F47' : '#1F2937' }}>
                        {entry.service_name}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {entry.username}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Bulk select option at the bottom side panel */}
          <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <button onClick={() => { setBulkMode(!bulkMode); setSelectedIds([]) }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg border text-center transition ${
                bulkMode ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {bulkMode ? 'Cancel Bulk Selection' : 'Toggle Bulk Selection'}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: SELECTED ENTRY DETAILS */}
        <div className={`col-span-1 lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col ${(!selectedEntryId || bulkMode) ? 'hidden lg:flex items-center justify-center p-8' : 'p-6'}`}>
          {!selectedEntry ? (
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-gray-150 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-450 border border-gray-200">
                <Shield size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-700">No Credential Selected</h3>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                Choose a credential from the sidebar list to view its details, assignments, and manage access.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Back Button (mobile) + Favicon + Site Name */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedEntryId(null)}
                    className="lg:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition flex items-center justify-center"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-600 border border-yellow-500/20">
                    <img
                      src={`https://www.google.com/icons/thirdparty/images/png?size=64&domain=${selectedEntry.site_url ? getDomain(selectedEntry.site_url) : getDomain(selectedEntry.service_name)}`}
                      alt=""
                      className="w-6 h-6 object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                    <span className="text-sm font-bold uppercase select-none">
                      {selectedEntry.service_name[0]}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-1.5">
                    {selectedEntry.service_name}
                    {selectedEntry.id.startsWith('temp-') && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full animate-pulse" style={{ color: '#4A1F6F', background: 'rgba(74,31,111,0.08)', border: '1px solid rgba(74,31,111,0.2)' }}>
                        Saving…
                      </span>
                    )}
                  </h2>
                </div>

                {/* History (Versions) Trigger */}
                <button
                  onClick={handleOpenHistory}
                  className="flex items-center gap-1 px-3 py-1.5 border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg text-xs font-semibold transition"
                >
                  <History size={13} />
                  <span>Versions</span>
                </button>
              </div>

              {/* CARD DETAILS */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column: Username, Password */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">Username / Email</span>
                      <div className="px-4 py-3 rounded-xl flex items-center justify-between font-mono text-sm border transition duration-150" style={{ background: 'rgba(74,31,111,0.06)', color: '#2D0F47', borderColor: 'transparent' }} onMouseEnter={e=>(e.currentTarget.style.background='rgba(74,31,111,0.10)')} onMouseLeave={e=>(e.currentTarget.style.background='rgba(74,31,111,0.06)')  }>
                        {showCredentials ? (
                          <span className="select-all font-medium truncate pr-2">{selectedEntry.username}</span>
                        ) : (
                          <span className="tracking-widest font-semibold text-gray-500">••••••••••••••</span>
                        )}
                        <button
                          onClick={() => copyToClipboard(selectedEntry.username, 'username')}
                          className="transition-colors p-1" style={{ color: '#4A1F6F' }}
                          title="Copy username"
                        >
                          {copiedField === 'username' ? (
                            <Check size={16} className="text-emerald-600" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">Password</span>
                      <div className="px-4 py-3 rounded-xl flex items-center justify-between font-mono text-sm border transition duration-150" style={{ background: 'rgba(74,31,111,0.06)', color: '#2D0F47', borderColor: 'transparent' }} onMouseEnter={e=>(e.currentTarget.style.background='rgba(74,31,111,0.10)')} onMouseLeave={e=>(e.currentTarget.style.background='rgba(74,31,111,0.06)')}>
                        {showCredentials ? (
                          <span className="select-all font-medium truncate pr-2">{selectedEntry.password || '••••••••••••••'}</span>
                        ) : (
                          <span className="tracking-widest font-semibold text-gray-500">••••••••••••••</span>
                        )}
                        <button
                          onClick={() => copyToClipboard(selectedEntry.password || '', 'password')}
                          className="transition p-1" style={{ color: '#4A1F6F' }}
                          title="Copy password"
                        >
                          {copiedField === 'password' ? (
                            <Check size={16} className="text-emerald-600" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Sites, Note */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">Sites</span>
                      <a
                        href={getSiteUrl(selectedEntry.service_name, selectedEntry.site_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-sm inline-flex items-center gap-1 underline mt-1.5 transition"
                        style={{ color: '#4A1F6F' }}
                      >
                        {getSiteLink(selectedEntry.service_name, selectedEntry.site_url)}
                        <ExternalLink size={12} />
                      </a>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">Note</span>
                      <div className="px-4 py-3 rounded-xl min-h-[92px] text-sm leading-relaxed border" style={{ background: 'rgba(74,31,111,0.05)', color: '#374151', borderColor: 'rgba(74,31,111,0.08)' }}>
                        {selectedEntry.notes || <span className="text-gray-400 italic">No note added</span>}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Editor info track footer */}
                {(selectedEntry as any).editor && (
                  <div className="text-xs text-gray-400 mt-2 font-medium">
                    Last updated by <span className="font-semibold text-gray-600">{(selectedEntry as any).editor?.name}</span> ({(selectedEntry as any).editor?.email})
                  </div>
                )}

                {/* Unified Reveal Toggle & Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-150 relative">
                  <button
                    onClick={() => setShowCredentials(!showCredentials)}
                    className="flex-1 rounded-full text-white px-6 py-2.5 font-semibold text-sm transition flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #4A1F6F 0%, #2D0F47 100%)', boxShadow: '0 4px 12px rgba(74,31,111,0.35)' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='linear-gradient(135deg, #2D0F47 0%, #1a0930 100%)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='linear-gradient(135deg, #4A1F6F 0%, #2D0F47 100%)')}
                  >
                    {showCredentials ? (
                      <><EyeOff size={14} /> Hide Credentials</>
                    ) : (
                      <><Eye size={14} /> Reveal Credentials</>
                    )}
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                      className="w-[42px] h-[42px] rounded-full border flex items-center justify-center hover:bg-gray-50 transition text-gray-600 focus:outline-none"
                      style={{ border: '1.5px solid rgba(74,31,111,0.2)', color: '#4A1F6F' }}
                    >
                      <MoreVertical size={18} />
                    </button>

                    {showActionsDropdown && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setShowActionsDropdown(false)} />
                        <div className="absolute bottom-full right-0 mb-2 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-30">
                          <button
                            onClick={() => {
                              setShowActionsDropdown(false)
                              handleEditClick()
                            }}
                            className="w-full px-4 py-2 text-left text-sm font-semibold hover:bg-gray-50 flex items-center gap-2 text-gray-700 transition"
                          >
                            <Edit size={14} className="text-gray-500" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setShowActionsDropdown(false)
                              handleDelete(selectedEntry.id, selectedEntry.service_name)
                            }}
                            disabled={deletingId === selectedEntry.id}
                            className="w-full px-4 py-2 text-left text-sm font-semibold hover:bg-red-50 flex items-center gap-2 text-red-600 transition disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ASSIGNMENTS MANAGEMENT */}
              <div className="border-t border-gray-100 pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={15} style={{ color: '#4A1F6F' }} />
                    <h3 className="font-bold text-sm" style={{ color: '#2D0F47' }}>Assigned Employees</h3>
                    {selectedEntry.assignments && selectedEntry.assignments.length > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(74,31,111,0.10)', color: '#4A1F6F' }}>
                        {selectedEntry.assignments.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setAssigningEntry(selectedEntry)
                      setAssignSelectedEmployees([])
                    }}
                    title="Assign Employee"
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base transition-all"
                    style={{ background: 'rgba(74,31,111,0.10)', color: '#4A1F6F', border: '1px solid rgba(74,31,111,0.2)' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='rgba(74,31,111,0.20)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='rgba(74,31,111,0.10)')}
                  >
                    <Plus size={15} />
                  </button>
                </div>

                {(!selectedEntry.assignments || selectedEntry.assignments.length === 0) ? (
                  <div className="rounded-xl py-6 text-center" style={{ background: 'rgba(74,31,111,0.03)', border: '1px dashed rgba(74,31,111,0.15)' }}>
                    <Users size={22} className="mx-auto mb-2" style={{ color: 'rgba(74,31,111,0.3)' }} />
                    <p className="text-sm text-gray-400 font-medium">No employees assigned yet</p>
                    <p className="text-xs text-gray-400 mt-1">Click <span className="font-bold text-gray-500">+</span> to assign access</p>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
                    {selectedEntry.assignments.map(assignment => {
                      const isResetting = resettingKey === `${selectedEntry.id}:${assignment.assigned_to}`
                      return (
                        <div key={assignment.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl transition" style={{ background: 'rgba(74,31,111,0.04)' }}
                          onMouseEnter={e=>(e.currentTarget.style.background='rgba(74,31,111,0.08)')}
                          onMouseLeave={e=>(e.currentTarget.style.background='rgba(74,31,111,0.04)')}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'rgba(74,31,111,0.12)', border: '1.5px solid rgba(74,31,111,0.2)', color: '#4A1F6F' }}>
                              {assignment.assignee?.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{assignment.assignee?.name}</p>
                              <p className="text-xs text-gray-400 truncate">{assignment.assignee?.email}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              assignment.is_revealed
                                ? 'bg-red-50 text-red-600 border border-red-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {assignment.is_revealed ? (
                                <><EyeOff size={9} /> Revealed</>
                              ) : (
                                <><Eye size={9} /> Pending</>
                              )}
                            </span>

                            {assignment.is_revealed && (
                              <button
                                onClick={() => handleReset(selectedEntry.id, assignment.assigned_to)}
                                disabled={isResetting}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-medium transition disabled:opacity-50"
                                title="Reset access"
                              >
                                {isResetting ? (
                                  <RefreshCw size={10} className="animate-spin" />
                                ) : (
                                  <RotateCcw size={10} />
                                )}
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Reset All helper */}
                    {selectedEntry.assignments.some(a => a.is_revealed) && selectedEntry.assignments.length > 1 && (
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => handleReset(selectedEntry.id)}
                          disabled={!!resettingKey}
                          className="flex items-center gap-1 px-3 py-1 text-xs text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg font-semibold transition disabled:opacity-50"
                        >
                          <RotateCcw size={10} /> Reset All
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Single Credential History Modal ── */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-100 text-purple-700">
                  <History size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Credential History</h3>
                  <p className="text-xs text-gray-400">Restore older versions for "{selectedEntry?.service_name}"</p>
                </div>
              </div>
              <button onClick={() => { setShowHistoryModal(false); setHistoryList([]) }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {fetchingHistory ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-purple-600" />
                  Fetching history versions...
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-10 text-center">
                  <History size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-semibold text-gray-600">No versions found</p>
                  <p className="text-xs text-gray-400 mt-1">First edit will create a version log.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {historyList.map(h => (
                    <div key={h.id} className="p-4 border rounded-xl border-gray-200 bg-gray-50 flex items-start justify-between gap-3 hover:bg-purple-50/30 transition">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-500">Username:</span>
                          <span className="text-xs font-medium text-gray-700 font-mono truncate max-w-[200px]">{h.username}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-500">Password:</span>
                          <span className="text-xs font-medium text-gray-700 font-mono">••••••••</span>
                        </div>
                        {h.notes && (
                          <p className="text-xs text-gray-400 italic truncate max-w-[300px]">Note: {h.notes}</p>
                        )}
                        <div className="text-[10px] text-gray-400 font-medium pt-1">
                          Edited by {h.editor?.name || 'Unknown'} on {new Date(h.created_at).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleReviveVersion(selectedEntryId!, h.id)}
                        disabled={submitting}
                        className="px-3 py-1.5 text-xs text-white bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition disabled:opacity-50 flex-shrink-0"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Global Password Version History Modal ── */}
      {showGlobalHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-600 text-white shadow-md">
                  <History size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">All Password Versions History</h3>
                  <p className="text-xs text-gray-400">Total {globalHistoryList.length} archived password versions tracked</p>
                </div>
              </div>
              <button onClick={() => { setShowGlobalHistoryModal(false); setGlobalHistoryList([]) }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {fetchingHistory ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-purple-600" />
                  Fetching global version history...
                </div>
              ) : globalHistoryList.length === 0 ? (
                <div className="py-10 text-center">
                  <History size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-semibold text-gray-600">No versions tracked yet</p>
                  <p className="text-xs text-gray-400 mt-1">Changes made to any password will create version items here.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {globalHistoryList.map(h => (
                    <div key={h.id} className="p-4 border rounded-xl border-gray-250 bg-gray-50 flex items-start justify-between gap-4 hover:bg-purple-50/20 transition">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 uppercase tracking-wide">
                            {h.service_name}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-500">Username:</span>
                            <span className="text-xs font-medium text-gray-700 font-mono truncate max-w-[200px]">{h.username}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-500">Password:</span>
                            <span className="text-xs font-medium text-gray-700 font-mono">••••••••</span>
                          </div>
                        </div>
                        {h.notes && (
                          <p className="text-xs text-gray-400 italic truncate max-w-[400px]">Notes: {h.notes}</p>
                        )}
                        <div className="text-[10px] text-gray-400 font-medium pt-1">
                          Edited by {h.editor?.name || 'Unknown'} ({(h.editor?.email || 'N/A')}) on {new Date(h.created_at).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleReviveVersion(h.vault_id, h.id)}
                        disabled={submitting}
                        className="px-3.5 py-2 text-xs text-white bg-purple-600 hover:bg-purple-700 rounded-lg font-bold transition disabled:opacity-50 flex-shrink-0"
                      >
                        Restore Version
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Assign Modal ── */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-100 text-purple-700">
                  <Users size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Bulk Assign Access</h3>
                  <p className="text-xs text-gray-400">Assign {selectedIds.length} passwords to employees</p>
                </div>
              </div>
              <button onClick={() => { setShowBulkAssignModal(false); setBulkAssignEmployees([]) }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBulkAssignSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 font-semibold">
                  Select Employees *
                </label>
                <EmployeeMultiSelect
                  employees={employees}
                  selected={bulkAssignEmployees}
                  onChange={setBulkAssignEmployees}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowBulkAssignModal(false); setBulkAssignEmployees([]) }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium transition">
                  Cancel
                </button>
                <button type="submit" disabled={submitting || bulkAssignEmployees.length === 0}
                  className="flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: (submitting || bulkAssignEmployees.length === 0) ? '#9CA3AF' : 'linear-gradient(135deg, #4A1F6F 0%, #2D0F47 100%)' }}>
                  Assign Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add/Edit Credential Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4A1F6F 0%, #2D0F47 100%)' }}>
                  <Shield size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{isEditing ? 'Edit Credential' : 'Add Credential'}</h3>
                  <p className="text-xs text-gray-400">Password encrypted with AES-256-GCM</p>
                </div>
              </div>
              <button onClick={() => { setShowForm(false); resetForm() }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Name *</label>
                  <input value={form.service_name}
                    onChange={e => setForm(p => ({ ...p, service_name: e.target.value }))}
                    placeholder="e.g. apollo.io, Cloudflare, AWS"
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition"
                    onFocus={e=>{e.target.style.borderColor='#4A1F6F'; e.target.style.boxShadow='0 0 0 3px rgba(74,31,111,0.12)'}}
                    onBlur={e=>{e.target.style.borderColor='#D1D5DB'; e.target.style.boxShadow='none'}} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Username / Email *</label>
                  <input value={form.username}
                    onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                    placeholder="admin@company.com"
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition"
                    onFocus={e=>{e.target.style.borderColor='#4A1F6F'; e.target.style.boxShadow='0 0 0 3px rgba(74,31,111,0.12)'}}
                    onBlur={e=>{e.target.style.borderColor='#D1D5DB'; e.target.style.boxShadow='none'}} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Site URL <span className="text-gray-400 font-normal">(optional)</span></label>
                <input value={form.site_url}
                  onChange={e => setForm(p => ({ ...p, site_url: e.target.value }))}
                  placeholder="e.g. https://app.apollo.io"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition"
                  onFocus={e=>{e.target.style.borderColor='#4A1F6F'; e.target.style.boxShadow='0 0 0 3px rgba(74,31,111,0.12)'}}
                  onBlur={e=>{e.target.style.borderColor='#D1D5DB'; e.target.style.boxShadow='none'}} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password {isEditing ? <span className="text-gray-400 font-normal">(leave blank to keep current)</span> : '*'}
                </label>
                <div className="relative">
                  <input
                    type={showFormPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder={isEditing ? "Enter new password (optional)" : "Enter the credential password"}
                    required={!isEditing}
                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm outline-none font-mono transition"
                    onFocus={e=>{e.target.style.borderColor='#4A1F6F'; e.target.style.boxShadow='0 0 0 3px rgba(74,31,111,0.12)'}}
                    onBlur={e=>{e.target.style.borderColor='#D1D5DB'; e.target.style.boxShadow='none'}} />
                  <button type="button" onClick={() => setShowFormPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showFormPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Assign To * <span className="text-gray-400 font-normal">(select one or more employees)</span>
                </label>
                <EmployeeMultiSelect
                  employees={employees}
                  selected={selectedEmployees}
                  onChange={setSelectedEmployees}
                />
                {selectedEmployees.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    {selectedEmployees.length} employee{selectedEmployees.length > 1 ? 's' : ''} selected — each gets their own one-time reveal
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. Main Cloudflare account, expires Dec 2025"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition"
                  onFocus={e=>{e.target.style.borderColor='#4A1F6F'; e.target.style.boxShadow='0 0 0 3px rgba(74,31,111,0.12)'}}
                  onBlur={e=>{e.target.style.borderColor='#D1D5DB'; e.target.style.boxShadow='none'}} />
              </div>

              {/* Security notice */}
              <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(74,31,111,0.06)', border: '1px solid rgba(74,31,111,0.15)' }}>
                <Shield size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#4A1F6F' }} />
                <p className="text-xs" style={{ color: '#4A1F6F' }}>
                  Password encrypted with <strong>AES-256-GCM</strong>. Each assigned employee gets their own
                  independent <strong>one-time reveal</strong> — one employee revealing does not affect others.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowForm(false); resetForm() }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium transition">
                  Cancel
                </button>
                <button type="submit" disabled={submitting || selectedEmployees.length === 0}
                  className="flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: (submitting || selectedEmployees.length === 0) ? '#9CA3AF' : 'linear-gradient(135deg, #4A1F6F 0%, #2D0F47 100%)', boxShadow: (submitting || selectedEmployees.length === 0) ? 'none' : '0 4px 12px rgba(74,31,111,0.3)' }}>
                  {submitting
                    ? <><RefreshCw size={14} className="animate-spin" />Saving…</>
                    : <><Shield size={14} />{isEditing ? 'Save Changes' : 'Save Encrypted'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Employees Modal ── */}
      {assigningEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4A1F6F 0%, #2D0F47 100%)' }}>
                  <Users size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Assign Employees</h3>
                  <p className="text-xs text-gray-400">Assign "{assigningEntry.service_name}" to employees</p>
                </div>
              </div>
              <button onClick={() => { setAssigningEntry(null); setAssignSelectedEmployees([]) }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssign} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 font-semibold">
                  Select Employees *
                </label>
                <EmployeeMultiSelect
                  employees={employees.filter(emp => !assigningEntry.assignments?.some(a => a.assigned_to === emp.id))}
                  selected={assignSelectedEmployees}
                  onChange={setAssignSelectedEmployees}
                />
              </div>

              {/* Security notice */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Shield size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  Each newly assigned employee will receive access to this password with their own independent <strong>one-time reveal</strong>.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setAssigningEntry(null); setAssignSelectedEmployees([]) }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium transition">
                  Cancel
                </button>
                <button type="submit" disabled={submitting || assignSelectedEmployees.length === 0}
                  className="flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: (submitting || assignSelectedEmployees.length === 0) ? '#9CA3AF' : 'linear-gradient(135deg, #4A1F6F 0%, #2D0F47 100%)', boxShadow: (submitting || assignSelectedEmployees.length === 0) ? 'none' : '0 4px 12px rgba(74,31,111,0.3)' }}>
                  {submitting
                    ? <><RefreshCw size={14} className="animate-spin" />Saving…</>
                    : <><Users size={14} />Assign Now</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}

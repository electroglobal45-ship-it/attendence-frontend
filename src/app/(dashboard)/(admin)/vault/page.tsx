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

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [showCredentials, setShowCredentials] = useState(false)
  const [showActionsDropdown, setShowActionsDropdown] = useState<string | null>(null)
  const [showSearchBar, setShowSearchBar] = useState(false)
  const [showHeaderDropdown, setShowHeaderDropdown] = useState(false)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({})
  const [togglingKeys, setTogglingKeys] = useState<Record<string, boolean>>({})
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
    setShowActionsDropdown(null)
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
    }
  }, [storeVaultEntries])

  useEffect(() => {
    if (storeEmployees && storeEmployees.length > 0) {
      setEmployees(storeEmployees)
    }
  }, [storeEmployees])

  useEffect(() => { 
    const hasData = storeVaultEntries && storeVaultEntries.length > 0
    fetchData(false, hasData) 
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
          {/* Search Toggle Icon */}
          <button 
            onClick={() => setShowSearchBar(!showSearchBar)}
            className={`p-2 border rounded-xl transition cursor-pointer ${
              showSearchBar
                ? 'bg-purple-100 border-[#4A1F6F] text-[#4A1F6F]'
                : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200'
            }`}
            title="Toggle Search"
          >
            <Search size={16} />
          </button>

          {/* Add Icon Button (Only Icon) */}
          <button 
            onClick={() => { setShowForm(true); setIsEditing(false); }}
            className="p-2 text-white rounded-xl transition font-medium cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #4A1F6F 0%, #2D0F47 100%)', boxShadow: '0 4px 12px rgba(74,31,111,0.35)' }}
            title="Add Credential"
          >
            <Plus size={16} />
          </button>

          {/* Header 3-Dots actions dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowHeaderDropdown(!showHeaderDropdown)}
              className={`p-2 border rounded-xl transition cursor-pointer ${
                showHeaderDropdown
                  ? 'bg-[#4A1F6F] border-[#4A1F6F] text-white'
                  : 'text-purple-700 border-purple-200 bg-white hover:bg-gray-50'
              }`}
              title="More Options"
            >
              <MoreVertical size={16} />
            </button>
            {showHeaderDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowHeaderDropdown(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-150 rounded-xl shadow-lg py-1.5 z-30 font-semibold text-gray-700 text-sm">
                  <button
                    onClick={() => {
                      setShowHeaderDropdown(false)
                      setShowFilterDropdown(!showFilterDropdown)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <ListFilter size={14} className="text-gray-500" />
                    {showFilterDropdown ? 'Hide Employee Filter' : 'Filter by Teammate'}
                  </button>
                  <button
                    onClick={() => {
                      setShowHeaderDropdown(false)
                      handleOpenGlobalHistory()
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <History size={14} className="text-gray-500" />
                    All Password Versions
                  </button>
                </div>
              </>
            )}
          </div>
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
              className="px-3 py-1.5 text-xs font-semibold text-white bg-red-655 rounded-lg hover:bg-red-700 transition"
            >
              Bulk Delete
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Search & Filter Bar */}
      {(showSearchBar || showFilterDropdown) && (
        <div className="card mb-6 p-4 space-y-3 animate-fade-in">
          {showSearchBar && (
            <div className="flex items-center gap-2 bg-gray-55 border border-gray-200 rounded-xl px-3 py-2">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search passwords..."
                className="bg-transparent border-none outline-none text-sm w-full text-gray-800 placeholder-gray-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {showFilterDropdown && (
            <div className="flex flex-col justify-center">
              <EmployeeMultiSelect
                employees={employees}
                selected={filterEmployees}
                onChange={setFilterEmployees}
                placeholder="Filter by employee assignment..."
              />
              {filterEmployees.length > 0 && (
                <div className="flex justify-end mt-1 px-1">
                  <button 
                    type="button" 
                    onClick={() => setFilterEmployees([])} 
                    className="text-xs font-semibold cursor-pointer text-[#4A1F6F] hover:underline"
                  >
                    Clear Filter
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Credentials List */}
      <div className="flex flex-col gap-4">
        {loading && entries.length === 0 ? (
          <div className="card text-center py-20 text-gray-400 animate-pulse">Loading passwords…</div>
        ) : filteredEntries.length === 0 ? (
          <div className="card text-center py-20 text-gray-400">
            <KeyRound size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500 font-medium">No credentials found</p>
            <p className="text-xs text-gray-400 mt-0.5">Try a different search term or add a new one</p>
          </div>
        ) : (
          filteredEntries.map(entry => {
            const domain = entry.site_url ? getDomain(entry.site_url) : getDomain(entry.service_name)

            return (
              <div
                key={entry.id}
                onClick={() => setSelectedEntryId(entry.id)}
                className="card p-4 bg-white border border-gray-200/80 rounded-2xl shadow-xs transition-all hover:border-[#4A1F6F]/40 hover:shadow-md cursor-pointer group flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Favicon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border overflow-hidden bg-purple-50/50 border-purple-100">
                    <img
                      src={`https://www.google.com/icons/thirdparty/images/png?size=32&domain=${domain}`}
                      alt={entry.service_name}
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        ;(e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                    <span className="text-sm font-bold uppercase select-none fallback-initial text-purple-700">
                      {entry.service_name[0]}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-gray-800 text-sm group-hover:text-[#4A1F6F] transition-colors truncate">
                      {entry.service_name}
                    </h4>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {entry.username}
                    </p>
                  </div>
                </div>

                <span className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <ExternalLink size={14} />
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* ── Credential Details Modal Card ── */}
      {selectedEntryId && (() => {
        const entry = entries.find(e => e.id === selectedEntryId)
        if (!entry) return null
        const domain = entry.site_url ? getDomain(entry.site_url) : getDomain(entry.service_name)
        const showFormPwLocal = !!revealedPasswords[entry.id]

        return (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 cursor-default"
            onClick={() => setSelectedEntryId(null)}
          >
            <div 
              className="bg-white rounded-2xl w-full max-w-sm sm:max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in p-6 space-y-4 cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border overflow-hidden bg-purple-50/50 border-purple-100">
                    <img
                      src={`https://www.google.com/icons/thirdparty/images/png?size=32&domain=${domain}`}
                      alt={entry.service_name}
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        ;(e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                    <span className="text-sm font-bold uppercase select-none fallback-initial text-purple-700">
                      {entry.service_name[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">{entry.service_name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Encrypted Credential Details</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* History (Versions) Trigger - Icon Only */}
                  <button
                    onClick={() => handleOpenHistory()}
                    className="p-2 border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition cursor-pointer"
                    title="Version History"
                  >
                    <History size={16} />
                  </button>

                  {/* 3-Dots actions dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowActionsDropdown(showActionsDropdown === entry.id ? null : entry.id)}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                        showActionsDropdown === entry.id
                          ? 'bg-[#4A1F6F] border-[#4A1F6F] text-white'
                          : 'text-purple-700 border-purple-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {showActionsDropdown === entry.id && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setShowActionsDropdown(null)} />
                        <div className="absolute right-0 top-full mt-1.5 w-40 bg-white border border-gray-150 rounded-xl shadow-lg py-1.5 z-30 font-semibold text-gray-700">
                          <button
                            onClick={() => {
                              setShowActionsDropdown(null)
                              setForm({
                                service_name: entry.service_name,
                                username: entry.username,
                                password: entry.password || '',
                                site_url: entry.site_url || '',
                                notes: entry.notes || '',
                              })
                              setSelectedEmployees(entry.assignments?.map(a => a.assigned_to) || [])
                              setIsEditing(true)
                              setShowForm(true)
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700"
                          >
                            <Edit size={14} className="text-gray-500" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setShowActionsDropdown(null)
                              handleDelete(entry.id, entry.service_name)
                            }}
                            className="w-full px-4 py-2 text-left text-red-650 hover:bg-red-50 flex items-center gap-2 text-red-600 transition"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => setSelectedEntryId(null)}
                    className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Left side: Username & Password */}
                <div className="space-y-3.5">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 block mb-1">Username / Email</span>
                    <div className="px-4 py-3 rounded-xl flex items-center justify-between font-mono text-sm border bg-[#4A1F6F]/5 border-[#4A1F6F]/10">
                      <span className="select-all font-semibold text-[#2D0F47] truncate pr-2">{entry.username}</span>
                      <button
                        onClick={() => copyToClipboard(entry.username || '', 'username')}
                        className="p-1 text-purple-700 hover:text-purple-900 transition-colors cursor-pointer shrink-0"
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
                    <div className="px-4 py-3 rounded-xl flex items-center justify-between font-mono text-sm border bg-[#4A1F6F]/5 border-[#4A1F6F]/10">
                      <span className="select-all font-semibold text-[#2D0F47] truncate pr-2">
                        {showFormPwLocal ? entry.password : '••••••••••••••'}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setRevealedPasswords(prev => ({ ...prev, [entry.id]: !prev[entry.id] }))}
                          className="p-1 text-purple-700 hover:text-purple-900 transition-colors cursor-pointer"
                          title={showFormPwLocal ? "Hide password" : "Reveal password"}
                        >
                          {showFormPwLocal ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(entry.password || '', 'password')}
                          className="p-1 text-purple-700 hover:text-purple-900 transition-colors cursor-pointer"
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
                </div>

                {/* Right side: Site Link & Notes */}
                <div className="space-y-3.5">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 block mb-1">Link / URL</span>
                    <div className="mt-1.5">
                      <a
                        href={getSiteUrl(entry.service_name, entry.site_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-sm inline-flex items-center gap-1 underline transition text-purple-750 hover:text-purple-900"
                      >
                        {getSiteLink(entry.service_name, entry.site_url)}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-gray-400 block mb-1">Notes</span>
                    <div className="px-4 py-3 rounded-xl min-h-[92px] text-xs sm:text-sm leading-relaxed border bg-[#4A1F6F]/5 border-purple-100 text-gray-700">
                      {entry.notes || <span className="text-gray-450 italic">No notes added</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Created & Last updated footer log */}
              <div className="flex flex-col gap-1 text-[10px] sm:text-xs text-gray-400 font-medium pt-1">
                {(entry as any).creator && (
                  <div>
                    Created by <span className="font-semibold text-gray-600">{(entry as any).creator?.name}</span>
                  </div>
                )}
                {(entry as any).editor && (
                  <div>
                    Last updated by <span className="font-semibold text-gray-600">{(entry as any).editor?.name}</span>
                  </div>
                )}
              </div>

              {/* Teammates access checklist */}
              <div className="pt-3 border-t border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-2">
                  Manage Teammate Assignments (Check to Assign, Uncheck to Revoke)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {employees.map(user => {
                    const assignment = entry.assignments?.find(a => a.assigned_to === user.id)
                    const isAssigned = !!assignment
                    const toggleKey = `${user.id}-${entry.id}`
                    const isToggling = !!togglingKeys[toggleKey]

                    return (
                      <label
                        key={user.id}
                        className={`flex items-center gap-2.5 p-2.5 border rounded-xl cursor-pointer transition-all ${
                          isAssigned
                            ? 'bg-purple-50/50 border-[#4A1F6F]/40 shadow-xs'
                            : 'bg-white border-gray-200/70 hover:bg-gray-50/50'
                        } ${isToggling ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          disabled={isToggling}
                          onChange={async (e) => {
                            const shouldAllow = e.target.checked
                            if (isToggling) return
                            setTogglingKeys(prev => ({ ...prev, [toggleKey]: true }))
                            
                            const currentAssigned = entry.assignments?.map(a => a.assigned_to) || []
                            let nextAssigned: string[]
                            if (shouldAllow) {
                              nextAssigned = [...currentAssigned, user.id]
                            } else {
                              nextAssigned = currentAssigned.filter(id => id !== user.id)
                            }

                            // Optimistic local state update
                            setEntries(prev => prev.map(item => {
                              if (item.id !== entry.id) return item
                              return {
                                ...item,
                                assignments: shouldAllow
                                  ? [...(item.assignments || []), {
                                      id: `temp-${Date.now()}`,
                                      vault_id: entry.id,
                                      assigned_to: user.id,
                                      is_revealed: false,
                                      assignee: user
                                    }]
                                  : (item.assignments || []).filter(a => a.assigned_to !== user.id)
                              }
                            }))

                            try {
                              await vaultAPI.assignEmployees(entry.id, nextAssigned)
                              await fetchData(false, true)
                            } catch (err: any) {
                              alert(`Failed to update assignment: ${err.message}`)
                              await fetchData(false, true)
                            } finally {
                              setTogglingKeys(prev => ({ ...prev, [toggleKey]: false }))
                            }
                          }}
                          className="rounded text-[#4A1F6F] focus:ring-[#4A1F6F] h-4 w-4 border-gray-300 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-gray-800 text-xs block truncate">{user.name}</span>
                          <span className="text-[10px] text-gray-500 block truncate capitalize">
                            {(user as any).role || 'Employee'} • {user.email}
                          </span>
                        </div>
                        {isAssigned && (
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                            assignment?.is_revealed ? 'bg-red-100 text-red-750' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {assignment?.is_revealed ? 'Seen' : 'Pending'}
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>
        )
      })()}

      {/* ── Single Credential History Modal ── */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto flex items-start justify-center z-50 p-4 pt-10 pb-10">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto my-auto">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto flex items-start justify-center z-50 p-4 pt-10 pb-10">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto my-auto">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto flex items-start justify-center z-50 p-4 pt-10 pb-10">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto my-auto">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto flex items-start justify-center z-50 p-4 pt-10 pb-10">
          <div className="bg-white rounded-2xl w-full max-w-sm sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4A1F6F 0%, #2D0F47 100%)' }}>
                  <Shield size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{isEditing ? 'Edit Credential' : 'Add Credential'}</h3>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto flex items-start justify-center z-50 p-4 pt-10 pb-10">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto my-auto">
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

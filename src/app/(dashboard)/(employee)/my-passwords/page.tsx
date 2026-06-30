'use client'

import { useEffect, useState, useCallback } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { vaultAPI, EmployeeVaultEntry } from '@/lib/tasks-api'
import { usePrefetchStore } from '@/lib/store/prefetch-store'
import { useAuth } from '@/lib/auth-context'
import {
  Shield, Eye, EyeOff, RefreshCw, Copy, Check,
  KeyRound, X, ArrowLeft, ExternalLink,
  Plus, Trash2, Edit, MoreVertical,
} from 'lucide-react'

const PURPLE = '#4A1F6F'
const PURPLE_DARK = '#2D0F47'
const P06 = 'rgba(74,31,111,0.06)'
const P10 = 'rgba(74,31,111,0.10)'
const P15 = 'rgba(74,31,111,0.15)'
const P20 = 'rgba(74,31,111,0.20)'

const getDomain = (urlOrName: string) => {
  const clean = urlOrName.trim().toLowerCase()
  try {
    if (clean.startsWith('http://') || clean.startsWith('https://')) return new URL(clean).hostname
  } catch (e) {}
  if (clean.includes('.')) return clean
  return `${clean}.com`
}

const getSiteLink = (serviceName: string, siteUrl?: string | null) => {
  if (siteUrl) {
    try {
      const clean = siteUrl.trim().toLowerCase()
      if (clean.startsWith('http://') || clean.startsWith('https://')) return new URL(clean).hostname
      return clean
    } catch { return siteUrl }
  }
  if (serviceName.toLowerCase().includes('apollo')) return 'app.apollo.io'
  return getDomain(serviceName)
}

const getSiteUrl = (serviceName: string, siteUrl?: string | null) => {
  if (siteUrl) return siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`
  const link = getSiteLink(serviceName)
  return link.startsWith('http') ? link : `https://${link}`
}

export default function EmployeeVaultPage() {
  const { user: currentUser } = useAuth()
  const storeEntries = usePrefetchStore((state) => state.vaultEntries)
  const [entries, setEntries] = useState<EmployeeVaultEntry[]>(() => storeEntries ?? [])
  const [loading, setLoading] = useState(() => !storeEntries || storeEntries.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null)
  const [showCredentials, setShowCredentials] = useState(false)
  const [showActionsDropdown, setShowActionsDropdown] = useState(false)
  const [revealing, setRevealing] = useState<string | null>(null)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({})
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ service_name: '', username: '', password: '', site_url: '', notes: '' })
  const [showFormPw, setShowFormPw] = useState(false)

  const fetchEntries = useCallback(async (selectFirst = false, silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await vaultAPI.getEntries()
      const fetchedEntries = res.data.entries as EmployeeVaultEntry[]
      setEntries(fetchedEntries)
      usePrefetchStore.setState({ vaultEntries: fetchedEntries, status: { ...usePrefetchStore.getState().status, vault: 'done' } })
      if (selectFirst && fetchedEntries.length > 0 && !selectedEntryId) setSelectedEntryId(fetchedEntries[0].id)
    } catch (e: any) { if (!silent) setError(e.message) }
    finally { if (!silent) setLoading(false) }
  }, [selectedEntryId])

  useEffect(() => {
    if (storeEntries && storeEntries.length > 0) {
      setEntries(storeEntries)
      if (!selectedEntryId) setSelectedEntryId(storeEntries[0].id)
    }
  }, [storeEntries, selectedEntryId])

  useEffect(() => { const hasData = storeEntries && storeEntries.length > 0; fetchEntries(true, hasData) }, [fetchEntries])
  useEffect(() => { setShowCredentials(false); setShowActionsDropdown(false) }, [selectedEntryId])

  const handleToggleReveal = async () => {
    if (!selectedEntryId) return
    if (showCredentials) { setShowCredentials(false); return }
    const cached = revealedPasswords[selectedEntryId]
    if (cached) { setShowCredentials(true); return }
    setRevealing(selectedEntryId)
    try {
      const res = await vaultAPI.revealPassword(selectedEntryId)
      setRevealedPasswords(prev => ({ ...prev, [selectedEntryId]: res.data.password }))
      setShowCredentials(true)
    } catch (e: any) { setError(e.message) }
    finally { setRevealing(null) }
  }

  const handleCopyPassword = async () => {
    if (!selectedEntryId) return
    let pass = revealedPasswords[selectedEntryId]
    if (!pass) {
      setRevealing(selectedEntryId)
      try {
        const res = await vaultAPI.revealPassword(selectedEntryId)
        pass = res.data.password
        setRevealedPasswords(prev => ({ ...prev, [selectedEntryId]: pass }))
        setShowCredentials(true)
      } catch (e: any) { setError(e.message); return }
      finally { setRevealing(null) }
    }
    navigator.clipboard.writeText(pass); setCopiedField('password'); setTimeout(() => setCopiedField(null), 2000)
  }

  const copyToClipboard = (text: string, field: 'username' | 'password') => {
    navigator.clipboard.writeText(text); setCopiedField(field); setTimeout(() => setCopiedField(null), 2000)
  }

  const resetForm = () => {
    setForm({ service_name: '', username: '', password: '', site_url: '', notes: '' })
    setShowFormPw(false); setIsEditing(false); setError(null)
  }

  const handleEditClick = () => {
    if (!selectedEntry) return
    setForm({ service_name: selectedEntry.service_name, username: selectedEntry.username, site_url: selectedEntry.site_url || '', notes: selectedEntry.notes || '', password: revealedPasswords[selectedEntry.id] || '' })
    setIsEditing(true); setShowForm(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError(null)
    try {
      if (isEditing && selectedEntryId) {
        const payload: any = { service_name: form.service_name, username: form.username, site_url: form.site_url, notes: form.notes }
        if (form.password) payload.password = form.password
        const res = await vaultAPI.updateEntry(selectedEntryId, payload)
        const raw = res.data.entry
        const updated: EmployeeVaultEntry = {
          id: raw.id, assignment_id: selectedEntry?.assignment_id || `new-a-${raw.id}`,
          service_name: raw.service_name, username: raw.username, notes: raw.notes, site_url: raw.site_url, created_at: raw.created_at,
          creator: selectedEntry?.creator || { id: currentUser?.id || '', name: currentUser?.name || '', email: currentUser?.email || '' },
          is_revealed: selectedEntry?.is_revealed ?? true,
        }
        if (form.password) setRevealedPasswords(prev => ({ ...prev, [selectedEntryId]: form.password }))
        const list = entries.map(e => e.id === selectedEntryId ? updated : e)
        setEntries(list); usePrefetchStore.setState({ vaultEntries: list })
        setShowForm(false); resetForm()
      } else {
        const tempId = `temp-${Date.now()}`
        const newEntry: EmployeeVaultEntry = {
          id: tempId, assignment_id: `new-a-${tempId}`, service_name: form.service_name, username: form.username,
          notes: form.notes, site_url: form.site_url, created_at: new Date().toISOString(),
          creator: { id: currentUser?.id || '', name: currentUser?.name || '', email: currentUser?.email || '' }, is_revealed: true,
        }
        if (form.password) setRevealedPasswords(prev => ({ ...prev, [newEntry.id]: form.password }))
        const list = [newEntry, ...entries]
        setEntries(list); usePrefetchStore.setState({ vaultEntries: list })
        setSelectedEntryId(newEntry.id); setShowCredentials(true); setShowForm(false)
        const saved = { ...form }; resetForm()
        vaultAPI.createEntry({ service_name: saved.service_name, username: saved.username, password: saved.password, site_url: saved.site_url, notes: saved.notes, assigned_to: [] })
          .then(res => {
            const r = res.data.entry
            const real: EmployeeVaultEntry = {
              id: r.id, assignment_id: r.assignments?.[0]?.id || `new-a-${r.id}`,
              service_name: r.service_name, username: r.username, notes: r.notes, site_url: r.site_url, created_at: r.created_at,
              creator: { id: currentUser?.id || '', name: currentUser?.name || '', email: currentUser?.email || '' }, is_revealed: true,
            }
            if (saved.password) setRevealedPasswords(prev => { const n = { ...prev, [real.id]: saved.password }; delete n[tempId]; return n })
            setEntries(prev => { const l = prev.map(e => e.id === tempId ? real : e); usePrefetchStore.setState({ vaultEntries: l }); return l })
            setSelectedEntryId(real.id)
          }).catch(err => {
            setEntries(prev => { const l = prev.filter(e => e.id !== tempId); usePrefetchStore.setState({ vaultEntries: l }); return l })
            setSelectedEntryId(prev => prev === tempId ? null : prev)
            setError(err.message || 'Failed to create credential'); setForm(saved); setShowForm(true)
          })
      }
    } catch (err: any) { setError(err.message || 'Failed to save credential') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently delete "${name}"?`)) return
    setLoading(true)
    try {
      await vaultAPI.deleteEntry(id)
      const list = entries.filter(e => e.id !== id)
      setEntries(list); usePrefetchStore.setState({ vaultEntries: list })
      if (selectedEntryId === id) setSelectedEntryId(null)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const filteredEntries = entries.filter(e =>
    e.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedEntry = entries.find(e => e.id === selectedEntryId) || null
  const plaintextPassword = selectedEntry ? revealedPasswords[selectedEntry.id] : null
  const isCreatedBySelf = selectedEntry && currentUser && (selectedEntry as any).created_by === currentUser.id

  const gradBtn = `linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_DARK} 100%)`
  const gradBtnHover = `linear-gradient(135deg, ${PURPLE_DARK} 0%, #1a0930 100%)`

  return (
    <PageWrapper
      title={<div className="flex items-center gap-2"><KeyRound style={{ color: PURPLE }} size={22} /><span>My Passwords</span></div>}
      actions={
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={() => fetchEntries(false, false)} disabled={loading}
            className="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm border rounded-lg disabled:opacity-50 transition"
            style={{ borderColor: P15, color: PURPLE, background: P06 }}
            onMouseEnter={e => (e.currentTarget.style.background = P10)}
            onMouseLeave={e => (e.currentTarget.style.background = P06)}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-white rounded-lg transition font-medium"
            style={{ background: gradBtn, boxShadow: '0 4px 12px rgba(74,31,111,0.35)' }}
            onMouseEnter={e => (e.currentTarget.style.background = gradBtnHover)}
            onMouseLeave={e => (e.currentTarget.style.background = gradBtn)}>
            <Plus size={16} /><span>Add</span>
          </button>
        </div>
      }
    >
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
          <X size={14} />{error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[550px]">

        {/* LEFT PANEL */}
        <div className={`col-span-1 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col ${selectedEntryId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search passwords" className="bg-transparent border-none outline-none text-sm w-full text-gray-800 placeholder-gray-400" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 max-h-[500px]">
            {loading && entries.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading passwords…</div>
            ) : filteredEntries.length === 0 ? (
              <div className="p-12 text-center">
                <KeyRound size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 font-medium">No credentials found</p>
                <p className="text-xs text-gray-400 mt-0.5">Try creating a credential</p>
              </div>
            ) : filteredEntries.map(entry => {
              const isSelected = selectedEntryId === entry.id
              const domain = entry.site_url ? getDomain(entry.site_url) : getDomain(entry.service_name)
              return (
                <div key={entry.id} onClick={() => setSelectedEntryId(entry.id)}
                  className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${isSelected ? 'border-l-4' : 'hover:bg-gray-50'}`}
                  style={isSelected ? { background: P06, borderLeftColor: PURPLE } : {}}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border overflow-hidden"
                    style={{ background: P06, borderColor: P15 }}>
                    <img src={`https://www.google.com/icons/thirdparty/images/png?size=32&domain=${domain}`}
                      alt={entry.service_name} className="w-5 h-5 object-contain"
                      onError={e => { (e.target as HTMLElement).style.display = 'none' }} />
                    <span className="text-sm font-bold uppercase select-none" style={{ color: PURPLE }}>{entry.service_name[0]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: isSelected ? PURPLE_DARK : '#1F2937' }}>{entry.service_name}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{entry.username}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className={`col-span-1 lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col ${!selectedEntryId ? 'hidden lg:flex items-center justify-center p-8' : 'p-6'}`}>
          {!selectedEntry ? (
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200" style={{ background: P06, color: PURPLE }}>
                <Shield size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-700">No Credential Selected</h3>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">Choose a credential from the sidebar to view its details.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <button onClick={() => setSelectedEntryId(null)}
                  className="lg:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition flex items-center justify-center">
                  <ArrowLeft size={18} />
                </button>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
                  style={{ background: 'rgba(217,164,65,0.10)', color: '#92650a', borderColor: 'rgba(217,164,65,0.25)' }}>
                  <img src={`https://www.google.com/icons/thirdparty/images/png?size=64&domain=${selectedEntry.site_url ? getDomain(selectedEntry.site_url) : getDomain(selectedEntry.service_name)}`}
                    alt="" className="w-6 h-6 object-contain" onError={e => { (e.target as HTMLElement).style.display = 'none' }} />
                  <span className="text-sm font-bold uppercase select-none">{selectedEntry.service_name[0]}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{selectedEntry.service_name}</h2>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">Username / Email</span>
                      <div className="px-4 py-3 rounded-xl flex items-center justify-between font-mono text-sm border transition duration-150"
                        style={{ background: P06, color: PURPLE_DARK, borderColor: 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.background = P10)} onMouseLeave={e => (e.currentTarget.style.background = P06)}>
                        {showCredentials
                          ? <span className="select-all font-medium truncate pr-2">{selectedEntry.username}</span>
                          : <span className="tracking-widest font-semibold text-gray-500">••••••••••••••</span>}
                        <button onClick={() => copyToClipboard(selectedEntry.username, 'username')} className="transition-colors p-1" style={{ color: PURPLE }} title="Copy">
                          {copiedField === 'username' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">Password</span>
                      <div className="px-4 py-3 rounded-xl flex items-center justify-between font-mono text-sm border transition duration-150 min-h-[48px]"
                        style={{ background: P06, color: PURPLE_DARK, borderColor: 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.background = P10)} onMouseLeave={e => (e.currentTarget.style.background = P06)}>
                        {showCredentials && plaintextPassword
                          ? <span className="select-all font-medium truncate pr-2">{plaintextPassword}</span>
                          : <span className="tracking-widest font-semibold text-gray-500">••••••••••••••</span>}
                        <button onClick={handleCopyPassword} className="transition p-1" style={{ color: PURPLE }} title="Copy">
                          {copiedField === 'password' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">Sites</span>
                      <a href={getSiteUrl(selectedEntry.service_name, selectedEntry.site_url)} target="_blank" rel="noreferrer"
                        className="font-medium text-sm inline-flex items-center gap-1 underline mt-1.5 transition" style={{ color: PURPLE }}>
                        {getSiteLink(selectedEntry.service_name, selectedEntry.site_url)}<ExternalLink size={12} />
                      </a>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">Note</span>
                      <div className="px-4 py-3 rounded-xl min-h-[92px] text-sm leading-relaxed border"
                        style={{ background: 'rgba(74,31,111,0.04)', color: '#374151', borderColor: P15 }}>
                        {selectedEntry.notes || <span className="text-gray-400 italic">No note added</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Creator log */}
                {(selectedEntry as any).creator && (
                  <div className="text-[10px] sm:text-xs text-gray-400 font-medium pb-2">
                    Created by <span className="font-semibold text-gray-600">{(selectedEntry as any).creator?.name}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-100 relative">
                  <button onClick={handleToggleReveal} disabled={revealing === selectedEntry.id}
                    className="flex-1 rounded-full text-white px-6 py-2.5 font-semibold text-sm transition flex items-center justify-center gap-2"
                    style={{ background: gradBtn, boxShadow: '0 4px 12px rgba(74,31,111,0.35)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = gradBtnHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = gradBtn)}>
                    {revealing === selectedEntry.id ? <><RefreshCw size={14} className="animate-spin" /> Fetching…</>
                      : showCredentials ? <><EyeOff size={14} /> Hide Credentials</>
                      : <><Eye size={14} /> Reveal Credentials</>}
                  </button>

                  {isCreatedBySelf && (
                    <div className="relative">
                      <button onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                        className="w-[42px] h-[42px] rounded-full flex items-center justify-center transition focus:outline-none"
                        style={{ border: `1.5px solid ${P20}`, color: PURPLE }}>
                        <MoreVertical size={18} />
                      </button>
                      {showActionsDropdown && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setShowActionsDropdown(false)} />
                          <div className="absolute bottom-full right-0 mb-2 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-30">
                            <button onClick={() => { setShowActionsDropdown(false); handleEditClick() }}
                              className="w-full px-4 py-2 text-left text-sm font-semibold hover:bg-gray-50 flex items-center gap-2 text-gray-700 transition">
                              <Edit size={14} className="text-gray-500" /> Edit
                            </button>
                            <button onClick={() => { setShowActionsDropdown(false); handleDelete(selectedEntry.id, selectedEntry.service_name) }}
                              className="w-full px-4 py-2 text-left text-sm font-semibold hover:bg-red-50 flex items-center gap-2 text-red-600 transition">
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: gradBtn }}>
                  <Shield size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{isEditing ? 'Edit Credential' : 'Add Credential'}</h3>
                  <p className="text-xs text-gray-400">Password encrypted with AES-256-GCM</p>
                </div>
              </div>
              <button onClick={() => { setShowForm(false); resetForm() }} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Name *</label>
                <input value={form.service_name} onChange={e => setForm(p => ({ ...p, service_name: e.target.value }))}
                  placeholder="e.g. apollo.io, Cloudflare" required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition"
                  onFocus={e => (e.currentTarget.style.borderColor = PURPLE)} onBlur={e => (e.currentTarget.style.borderColor = '#D1D5DB')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Site URL <span className="text-gray-400 font-normal">(optional)</span></label>
                <input value={form.site_url} onChange={e => setForm(p => ({ ...p, site_url: e.target.value }))}
                  placeholder="e.g. https://app.apollo.io"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition"
                  onFocus={e => (e.currentTarget.style.borderColor = PURPLE)} onBlur={e => (e.currentTarget.style.borderColor = '#D1D5DB')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username / Email *</label>
                <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  placeholder="admin@company.com" required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition"
                  onFocus={e => (e.currentTarget.style.borderColor = PURPLE)} onBlur={e => (e.currentTarget.style.borderColor = '#D1D5DB')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password {isEditing ? <span className="text-gray-400 font-normal">(leave blank to keep)</span> : '*'}
                </label>
                <div className="relative">
                  <input type={showFormPw ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder={isEditing ? 'New password (optional)' : 'Enter password'} required={!isEditing}
                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm outline-none font-mono transition"
                    onFocus={e => (e.currentTarget.style.borderColor = PURPLE)} onBlur={e => (e.currentTarget.style.borderColor = '#D1D5DB')} />
                  <button type="button" onClick={() => setShowFormPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showFormPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. recovery codes, pins" rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none resize-none transition"
                  onFocus={e => (e.currentTarget.style.borderColor = PURPLE)} onBlur={e => (e.currentTarget.style.borderColor = '#D1D5DB')} />
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setShowForm(false); resetForm() }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium transition">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
                  style={{ background: gradBtn, boxShadow: '0 4px 12px rgba(74,31,111,0.3)' }}
                  onMouseEnter={e => !submitting && (e.currentTarget.style.background = gradBtnHover)}
                  onMouseLeave={e => !submitting && (e.currentTarget.style.background = gradBtn)}>
                  {submitting ? 'Saving…' : 'Save Credential'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}

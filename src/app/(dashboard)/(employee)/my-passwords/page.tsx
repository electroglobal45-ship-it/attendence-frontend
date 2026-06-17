'use client'

import { useEffect, useState, useCallback } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { vaultAPI, EmployeeVaultEntry } from '@/lib/tasks-api'
import { usePrefetchStore } from '@/lib/store/prefetch-store'
import {
  Shield, Eye, EyeOff, RefreshCw, Copy, Check,
  AlertTriangle, KeyRound, X, ArrowLeft, ExternalLink,
} from 'lucide-react'

// ── Helper to format domains and URLs ─────────────────────────────────────────
const getDomain = (serviceName: string) => {
  const clean = serviceName.trim().toLowerCase()
  if (clean.includes('.')) return clean
  return `${clean}.com`
}

const getSiteLink = (serviceName: string) => {
  const domain = getDomain(serviceName)
  if (serviceName.toLowerCase().includes('apollo')) {
    return 'app.apollo.io'
  }
  return domain
}

const getSiteUrl = (serviceName: string) => {
  const link = getSiteLink(serviceName)
  return link.startsWith('http') ? link : `https://${link}`
}

export default function EmployeeVaultPage() {
  const storeEntries = usePrefetchStore((state) => state.vaultEntries)
  const [entries, setEntries] = useState<EmployeeVaultEntry[]>(() => storeEntries ?? [])
  const [loading, setLoading] = useState(() => !storeEntries || storeEntries.length === 0)
  const [error, setError] = useState<string | null>(null)

  // Two-pane states
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // One-time reveal states
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [revealing, setRevealing] = useState<string | null>(null)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({})

  const fetchEntries = useCallback(async (selectFirst = false, silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await vaultAPI.getEntries()
      const fetchedEntries = res.data.entries as EmployeeVaultEntry[]
      setEntries(fetchedEntries)
      usePrefetchStore.setState({
        vaultEntries: fetchedEntries,
        status: { ...usePrefetchStore.getState().status, vault: 'done' }
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
    if (storeEntries && storeEntries.length > 0) {
      setEntries(storeEntries)
      if (!selectedEntryId) {
        setSelectedEntryId(storeEntries[0].id)
      }
    }
  }, [storeEntries, selectedEntryId])

  useEffect(() => { 
    const hasData = storeEntries && storeEntries.length > 0
    fetchEntries(true, hasData) 
  }, [fetchEntries])

  useEffect(() => {
    setShowPassword(false)
  }, [selectedEntryId])

  const handleRevealConfirm = async (id: string) => {
    setConfirmId(null)
    setRevealing(id)
    try {
      const res = await vaultAPI.revealPassword(id)
      setRevealedPasswords(prev => ({ ...prev, [id]: res.data.password }))
      setShowPassword(true)
      // Mark locally as revealed
      setEntries(prev => prev.map(e => e.id === id ? { ...e, is_revealed: true } : e))
      usePrefetchStore.setState({
        vaultEntries: usePrefetchStore.getState().vaultEntries.map(e => e.id === id ? { ...e, is_revealed: true } : e)
      })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRevealing(null)
    }
  }

  const copyToClipboard = (text: string, field: 'username' | 'password') => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Filtered list based on search
  const filteredEntries = entries.filter(entry => 
    entry.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedEntry = entries.find(e => e.id === selectedEntryId) || null
  const plaintextPassword = selectedEntry ? revealedPasswords[selectedEntry.id] : null
  const isRevealed = selectedEntry ? selectedEntry.is_revealed : false

  return (
    <PageWrapper
      title={
        <div className="flex items-center gap-2">
          <KeyRound className="text-gray-900" size={22} />
          <span>My Passwords</span>
        </div>
      }
      subtitle="Credentials assigned to you — handle with care"
      actions={
        <button onClick={() => fetchEntries(false, false)} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      }
    >
      {/* Security notice */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-250 rounded-xl mb-6">
        <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold">One-Time Reveal Policy</p>
          <p className="text-amber-750 mt-0.5">
            Each password can only be revealed <strong>once</strong>. After you click Reveal and confirm,
            the password will be shown this session only. If you navigate away or refresh, it will be
            permanently hidden. Contact your admin if you need to view it again.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
          <X size={14} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Two-Pane Password Manager Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[550px]">
        
        {/* LEFT PANEL: SEARCH & PASSWORD LIST */}
        <div className={`col-span-1 border-r border-gray-200 flex flex-col ${selectedEntryId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100 space-y-3">
            {/* Search Bar */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
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
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 max-h-[500px]">
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
                const domain = getDomain(entry.service_name)
                
                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntryId(entry.id)}
                    className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Site favicon */}
                    <div className="w-10 h-10 rounded-xl bg-[#f3f1fb] flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-100 overflow-hidden">
                      <img
                        src={`https://www.google.com/icons/thirdparty/images/png?size=32&domain=${domain}`}
                        alt={entry.service_name}
                        className="w-5 h-5 object-contain"
                        onError={(e) => {
                          ;(e.target as HTMLElement).style.display = 'none'
                        }}
                      />
                      <span className="text-indigo-600 text-sm font-bold uppercase select-none">
                        {entry.service_name[0]}
                      </span>
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-indigo-900' : 'text-gray-800'}`}>
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
        </div>

        {/* RIGHT PANEL: SELECTED ENTRY DETAILS */}
        <div className={`col-span-1 lg:col-span-2 flex flex-col ${!selectedEntryId ? 'hidden lg:flex items-center justify-center p-8 bg-gray-50/50' : 'flex p-6'}`}>
          {!selectedEntry ? (
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-gray-150 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-450 border border-gray-200">
                <Shield size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-700">No Credential Selected</h3>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                Choose a credential from the sidebar list to view its details and reveal the password.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Back Button (mobile) + Favicon + Site Name */}
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <button
                  onClick={() => setSelectedEntryId(null)}
                  className="lg:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition flex items-center justify-center"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 border border-indigo-500/20">
                  <img
                    src={`https://www.google.com/icons/thirdparty/images/png?size=64&domain=${getDomain(selectedEntry.service_name)}`}
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
                </h2>
              </div>

              {/* CARD DETAILS */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column: Username, Password */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">Username</span>
                      <div className="bg-[#f0eef9] hover:bg-[#eae8f5] text-[#1e1b4b] px-4 py-3 rounded-xl flex items-center justify-between font-mono text-sm border border-transparent hover:border-indigo-100 transition duration-150">
                        <span className="select-all font-medium truncate pr-2">{selectedEntry.username}</span>
                        <button
                          onClick={() => copyToClipboard(selectedEntry.username, 'username')}
                          className="text-indigo-500 hover:text-indigo-700 transition-colors p-1"
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
                      <div className="bg-[#f0eef9] hover:bg-[#eae8f5] text-[#1e1b4b] px-4 py-3 rounded-xl flex items-center justify-between font-mono text-sm border border-transparent hover:border-indigo-100 transition duration-150 min-h-[48px]">
                        
                        {/* 1. Already revealed and plaintext cached in this session */}
                        {plaintextPassword ? (
                          <>
                            {showPassword ? (
                              <span className="select-all font-medium truncate pr-2">{plaintextPassword}</span>
                            ) : (
                              <span className="tracking-widest font-semibold text-gray-500">••••••••••••••</span>
                            )}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-indigo-500 hover:text-indigo-700 transition p-1"
                                title={showPassword ? "Hide password" : "Show password"}
                              >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                              <button
                                onClick={() => copyToClipboard(plaintextPassword, 'password')}
                                className="text-indigo-500 hover:text-indigo-700 transition p-1"
                                title="Copy password"
                              >
                                {copiedField === 'password' ? (
                                  <Check size={16} className="text-emerald-600" />
                                ) : (
                                  <Copy size={16} />
                                )}
                              </button>
                            </div>
                          </>
                        ) : isRevealed ? (
                          /* 2. Already revealed in a previous session */
                          <div className="flex items-center gap-1.5 py-0.5">
                            <EyeOff size={16} className="text-gray-400" />
                            <span className="text-xs text-gray-500 font-medium">Already Revealed (Hidden for Security)</span>
                          </div>
                        ) : (
                          /* 3. Not yet revealed */
                          <button
                            onClick={() => setConfirmId(selectedEntry.id)}
                            disabled={revealing === selectedEntry.id}
                            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition font-semibold text-xs py-0.5 disabled:opacity-50"
                          >
                            {revealing === selectedEntry.id ? (
                              <><RefreshCw size={13} className="animate-spin" /> Revealing…</>
                            ) : (
                              <><Eye size={13} /> Reveal Password</>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Sites, Note */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">Sites</span>
                      <a
                        href={getSiteUrl(selectedEntry.service_name)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 font-medium text-sm inline-flex items-center gap-1 underline mt-1.5 transition"
                      >
                        {getSiteLink(selectedEntry.service_name)}
                        <ExternalLink size={12} />
                      </a>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-400 block mb-1">Note</span>
                      <div className="bg-[#f0eef9] text-[#423f6d] px-4 py-3 rounded-xl min-h-[92px] text-sm leading-relaxed border border-transparent">
                        {selectedEntry.notes || <span className="text-gray-400 italic">No note added</span>}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Confirm Reveal Modal */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                <AlertTriangle size={26} className="text-amber-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Reveal Password?</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                This password can only be revealed <strong className="text-gray-900">once</strong>.
                Make sure no one is watching your screen.
                After you navigate away or refresh, the password will be permanently hidden.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfirmId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium transition">
                Cancel
              </button>
              <button
                onClick={() => handleRevealConfirm(confirmId)}
                className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-700 text-sm font-medium transition flex items-center justify-center gap-2">
                <Eye size={14} />
                Yes, Reveal It
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}

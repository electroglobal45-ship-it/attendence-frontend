'use client'

import { useState, useEffect } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Plus, Trash2, Calendar } from 'lucide-react'
import { usePrefetchStore } from '@/lib/store/prefetch-store'

export default function HolidaysPage() {
  const storeHolidays = usePrefetchStore((state) => state.holidays)
  const [holidays, setHolidays] = useState<any[]>(() => storeHolidays ?? [])
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const token = () => localStorage.getItem('authToken')

  const fetchHolidays = async (silent = false) => {
    try {
      const res = await fetch('/api/holidays')
      const d = await res.json()
      const fetchedHolidays = d.holidays || []
      setHolidays(fetchedHolidays)
      usePrefetchStore.setState({
        holidays: fetchedHolidays,
        status: { ...usePrefetchStore.getState().status, holidays: 'done' }
      })
    } catch (err) {
      console.error('Failed to fetch holidays:', err)
    }
  }

  // Keep state in sync with prefetch store updates
  useEffect(() => {
    if (storeHolidays) {
      setHolidays(storeHolidays)
    }
  }, [storeHolidays])

  useEffect(() => {
    const hasData = storeHolidays && storeHolidays.length > 0
    fetchHolidays(hasData)
  }, [])

  const addHoliday = async () => {
    if (!date || !name.trim()) { setError('Date and name are required'); return }
    setSaving(true); setError(''); setSuccess('')
    const res = await fetch('/api/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ date, name }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || 'Failed to add holiday'); return }
    
    // Optimistic Update: update store & UI state
    const newHoliday = data.holiday
    const updated = [...holidays, newHoliday].sort((a, b) => a.date.localeCompare(b.date))
    setHolidays(updated)
    usePrefetchStore.setState({ holidays: updated })
    
    setDate(''); setName('')
    setSuccess('Holiday added successfully')
    setTimeout(() => setSuccess(''), 3000)
  }

  const removeHoliday = async (id: string) => {
    if (!confirm('Remove this holiday?')) return
    
    // Optimistic Update: update store & UI state
    const updated = holidays.filter(h => h.id !== id)
    setHolidays(updated)
    usePrefetchStore.setState({ holidays: updated })
    
    try {
      const res = await fetch(`/api/holidays?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (!res.ok) {
        // Revert on failure
        fetchHolidays(true)
      }
    } catch {
      // Revert on failure
      fetchHolidays(true)
    }
  }

  // Group by month
  const grouped: Record<string, any[]> = {}
  for (const h of holidays) {
    const month = h.date.substring(0, 7)
    if (!grouped[month]) grouped[month] = []
    grouped[month].push(h)
  }

  const monthName = (ym: string) => {
    const [y, m] = ym.split('-')
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  }

  return (
    <PageWrapper title="Holidays" subtitle="Manage company holidays — Sundays and 3rd Saturdays are automatic">
      <div className="max-w-2xl space-y-5">

        {/* Add holiday */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Plus size={16} className="text-[#4A1F6F]" /> Add Company Holiday
          </h3>

          {error   && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          {success && <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>}

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#4A1F6F] focus:ring-2 focus:ring-[#4A1F6F]/10 transition-all" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Holiday Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g., Diwali"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#4A1F6F] focus:ring-2 focus:ring-[#4A1F6F]/10 transition-all" />
            </div>
            <div className="flex items-end">
              <button onClick={addHoliday} disabled={saving}
                className="px-5 py-2 bg-gradient-to-r from-[#4A1F6F] to-[#3B1859] text-white rounded-lg text-sm font-semibold hover:opacity-95 active:scale-98 transition-all disabled:opacity-50 shadow-sm shadow-[#4A1F6F]/10">
                {saving ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>

        {/* Automatic holidays note */}
        <div className="bg-[#4A1F6F]/5 border border-[#4A1F6F]/10 rounded-xl p-4 text-sm text-[#4A1F6F]">
          <p className="font-semibold mb-1 flex items-center gap-1.5">
            <Calendar size={14} /> Automatic Holidays (no setup needed)
          </p>
          <ul className="text-xs space-y-0.5 text-[#4A1F6F]/90 ml-5 list-disc">
            <li>Every <strong className="font-bold">Sunday</strong> — weekly off</li>
            <li><strong className="font-bold">3rd Saturday</strong> of every month — monthly off</li>
          </ul>
        </div>

        {/* Holiday list */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
            <Calendar size={16} className="text-[#4A1F6F]" />
            <h3 className="font-semibold text-gray-900">Company Holidays ({holidays.length})</h3>
          </div>

          {holidays.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">No holidays added yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {Object.entries(grouped).sort().map(([ym, hs]) => (
                <div key={ym}>
                  <div className="px-5 py-2 bg-gray-50 text-xs font-semibold text-[#4A1F6F] uppercase tracking-wider">{monthName(ym)}</div>
                  {hs.map(h => (
                    <div key={h.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#D9A441]/10 flex items-center justify-center text-sm font-bold text-[#D9A441] border border-[#D9A441]/20">
                          {new Date(h.date + 'T00:00:00').getDate()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{h.name}</p>
                          <p className="text-xs text-gray-400">{h.date} · {new Date(h.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' })}</p>
                        </div>
                      </div>
                      <button onClick={() => removeHoliday(h.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </PageWrapper>
  )
}

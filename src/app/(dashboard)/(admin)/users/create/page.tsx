'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Menu, User, Mail, Lock, Shield, Briefcase, Building2, DollarSign, Calendar, ChevronDown, UserPlus } from 'lucide-react'
import { usersAPI } from '@/lib/tasks-api'
import { useSidebarStore } from '@/lib/store/sidebar-store'

// ── Theme ────────────────────────────────────────────────────────────────────
const PURPLE      = '#4A1F6F'
const PURPLE_DARK = '#2D0F47'
const PURPLE_10   = 'rgba(74,31,111,0.10)'
const PURPLE_5    = 'rgba(74,31,111,0.05)'
const GOLD        = '#D9A441'

const ROLE_META: Record<string, { label: string; desc: string; color: string; bg: string }> = {
  employee:     { label: 'Employee',    desc: 'Limited access — personal dashboard & tasks',          color: '#4A1F6F', bg: 'rgba(74,31,111,0.08)'  },
  'team leader':{ label: 'Team Leader', desc: 'Board management + employee features',                 color: '#D9A441', bg: 'rgba(217,164,65,0.12)' },
  hr:           { label: 'HR',          desc: 'HR dashboard & employee management',                   color: '#6B2D8E', bg: 'rgba(107,45,142,0.10)' },
  admin:        { label: 'Admin',       desc: 'Full system access — all dashboards & settings',       color: '#2D0F47', bg: 'rgba(45,15,71,0.10)'   },
}

// ── Input wrapper ─────────────────────────────────────────────────────────────
function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
        {label}
        {required && <span style={{ color: '#EF4444', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{hint}</p>}
    </div>
  )
}

// ── Styled input ──────────────────────────────────────────────────────────────
function StyledInput({ icon: Icon, ...props }: { icon?: any } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      {Icon && (
        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <Icon size={15} color={focused ? PURPLE : '#9CA3AF'} />
        </div>
      )}
      <input
        {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e) }}
        onBlur={e => { setFocused(false); props.onBlur?.(e) }}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: Icon ? '10px 14px 10px 38px' : '10px 14px',
          border: `1.5px solid ${focused ? PURPLE : '#E5E7EB'}`,
          borderRadius: 10,
          fontSize: 13,
          color: '#111827',
          background: focused ? PURPLE_5 : '#FAFAFA',
          outline: 'none',
          transition: 'all 0.15s',
          boxShadow: focused ? `0 0 0 3px ${PURPLE_10}` : 'none',
          fontFamily: 'inherit',
          ...props.style,
        }}
      />
    </div>
  )
}

// ── Styled select ─────────────────────────────────────────────────────────────
function StyledSelect({ icon: Icon, children, ...props }: { icon?: any } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      {Icon && (
        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}>
          <Icon size={15} color={focused ? PURPLE : '#9CA3AF'} />
        </div>
      )}
      <select
        {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e) }}
        onBlur={e => { setFocused(false); props.onBlur?.(e) }}
        style={{
          width: '100%', boxSizing: 'border-box', appearance: 'none',
          padding: Icon ? '10px 36px 10px 38px' : '10px 36px 10px 14px',
          border: `1.5px solid ${focused ? PURPLE : '#E5E7EB'}`,
          borderRadius: 10, fontSize: 13, color: '#111827',
          background: focused ? PURPLE_5 : '#FAFAFA',
          outline: 'none', transition: 'all 0.15s', cursor: 'pointer',
          boxShadow: focused ? `0 0 0 3px ${PURPLE_10}` : 'none',
          fontFamily: 'inherit',
        }}
      >
        {children}
      </select>
      <ChevronDown size={14} color="#9CA3AF" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  )
}

export default function CreateUserPage() {
  const router = useRouter()
  const setOpen = useSidebarStore((state) => state.setOpen)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    role: 'employee' as 'admin' | 'employee' | 'hr' | 'team leader',
    category: 'regular',
    department: '',
    designation: '',
    monthly_salary: '',
    joining_date: new Date().toISOString().split('T')[0],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) { alert('Passwords do not match'); return }
    if (formData.password.length < 6) { alert('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const response = await usersAPI.createUser({
        email: formData.email,
        name: formData.name,
        password: formData.password,
        role: formData.role,
        category: formData.category,
        department: formData.department || undefined,
        designation: formData.designation || undefined,
        monthly_salary: formData.monthly_salary ? parseFloat(formData.monthly_salary) : undefined,
        joining_date: formData.joining_date,
      })
      if (response.success) {
        alert(`User created successfully!\n\nEmail: ${formData.email}\nPassword: ${formData.password}\n\nMake sure to save these credentials!`)
        router.push('/employees')
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const roleMeta = ROLE_META[formData.role] || ROLE_META.employee
  const showEmployeeFields = formData.role === 'employee' || formData.role === 'team leader'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8F9FA', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-3 py-3 sm:px-7 sm:py-4 flex-shrink-0 shadow-xs">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            {/* Hamburger menu for mobile */}
            <button
              onClick={() => setOpen(true)}
              className="lg:hidden p-1.5 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg touch-manipulation cursor-pointer flex-shrink-0"
              style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <button
              onClick={() => router.back()}
              style={{ padding: '6px 8px', background: 'transparent', border: `1px solid #E5E7EB`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s', color: '#6B7280', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.background = PURPLE_5; e.currentTarget.style.borderColor = `${PURPLE}40`; e.currentTarget.style.color = PURPLE }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280' }}
            >
              <ArrowLeft size={16} />
            </button>
            <div style={{ minWidth: 0 }}>
              <h1 className="text-base sm:text-2xl font-extrabold tracking-tight" style={{ color: PURPLE, margin: 0, letterSpacing: '-.3px' }}>Create New User</h1>
              <p className="hidden sm:block" style={{ color: '#6B7280', fontSize: 13, margin: '2px 0 0' }}>Add a new admin or employee to the system</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form ────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <form onSubmit={handleSubmit}>

            {/* Card */}
            <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

              {/* Card Header Banner */}
              <div style={{ background: `linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_DARK} 100%)`, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <UserPlus size={22} color="#fff" />
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', margin: 0 }}>New Account</p>
                  <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: '2px 0 0' }}>Fill in the details below</p>
                </div>
              </div>

              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* ── Personal Info ─── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: '.5px', margin: 0, paddingBottom: 8, borderBottom: `1px solid ${PURPLE_10}` }}>
                    Personal Information
                  </p>
                </div>

                <Field label="Full Name" required>
                  <StyledInput
                    icon={User}
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </Field>

                <Field label="Email Address" required>
                  <StyledInput
                    icon={Mail}
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    required
                  />
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="Password" required hint="At least 6 characters">
                    <StyledInput
                      icon={Lock}
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </Field>
                  <Field label="Confirm Password" required>
                    <StyledInput
                      icon={Lock}
                      type="password"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </Field>
                </div>

                {/* ── Role & Access ─── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: '.5px', margin: 0, paddingBottom: 8, borderBottom: `1px solid ${PURPLE_10}` }}>
                    Role & Access
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="Role" required>
                    <StyledSelect
                      icon={Shield}
                      value={formData.role}
                      onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                    >
                      <option value="employee">Employee</option>
                      <option value="team leader">Team Leader</option>
                      <option value="hr">HR</option>
                      <option value="admin">Admin</option>
                    </StyledSelect>
                  </Field>
                  <Field label="Category">
                    <StyledSelect
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="regular">Regular</option>
                      <option value="contract">Contract</option>
                      <option value="intern">Intern</option>
                    </StyledSelect>
                  </Field>
                </div>

                {/* Role badge */}
                <div style={{ padding: '10px 14px', borderRadius: 10, background: roleMeta.bg, border: `1px solid ${roleMeta.color}20`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: roleMeta.color, flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: roleMeta.color }}>{roleMeta.label}</span>
                    <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 8 }}>{roleMeta.desc}</span>
                  </div>
                </div>

                {/* ── Employee Details ─── */}
                {showEmployeeFields && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: '.5px', margin: 0, paddingBottom: 8, borderBottom: `1px solid ${PURPLE_10}` }}>
                        Employment Details
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <Field label="Department">
                        <StyledInput
                          icon={Building2}
                          type="text"
                          value={formData.department}
                          onChange={e => setFormData({ ...formData, department: e.target.value })}
                          placeholder="Engineering, Sales, etc."
                        />
                      </Field>
                      <Field label="Designation">
                        <StyledInput
                          icon={Briefcase}
                          type="text"
                          value={formData.designation}
                          onChange={e => setFormData({ ...formData, designation: e.target.value })}
                          placeholder="Software Engineer, Manager…"
                        />
                      </Field>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <Field label="Monthly Salary">
                        <StyledInput
                          icon={DollarSign}
                          type="number"
                          value={formData.monthly_salary}
                          onChange={e => setFormData({ ...formData, monthly_salary: e.target.value })}
                          placeholder="50000"
                          min="0"
                          step="0.01"
                        />
                      </Field>
                      <Field label="Joining Date">
                        <StyledInput
                          icon={Calendar}
                          type="date"
                          value={formData.joining_date}
                          onChange={e => setFormData({ ...formData, joining_date: e.target.value })}
                        />
                      </Field>
                    </div>
                  </>
                )}

                {/* ── Action Buttons ─── */}
                <div style={{ display: 'flex', gap: 12, paddingTop: 8, borderTop: '1px solid #F3F4F6', marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    disabled={loading}
                    style={{
                      flex: 1, padding: '11px 20px', border: '1.5px solid #E5E7EB', borderRadius: 10,
                      background: '#FFFFFF', color: '#374151', fontSize: 14, fontWeight: 600,
                      cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
                      transition: 'all 0.15s', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => !loading && (e.currentTarget.style.background = '#F9FAFB')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 1, padding: '11px 20px', border: 'none', borderRadius: 10,
                      background: loading ? '#9CA3AF' : `linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_DARK} 100%)`,
                      color: '#FFFFFF', fontSize: 14, fontWeight: 700,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: loading ? 'none' : `0 4px 14px ${PURPLE}40`,
                      transition: 'all 0.15s', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => !loading && (e.currentTarget.style.background = `linear-gradient(135deg, ${PURPLE_DARK} 0%, #1a0930 100%)`)}
                    onMouseLeave={e => !loading && (e.currentTarget.style.background = `linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_DARK} 100%)`)}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} />
                        Create User
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          </form>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Users, ClipboardList, Settings as SettingsIcon,
  CheckCircle2, Search, Plus, Pencil, Trash2,
  Shield, Download, User, Bell, Server, Activity,
  RefreshCw, X, Lock,
} from 'lucide-react'
import { apiRequest, getToken } from '../services/api'

const inputStyle = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400'
const buttonStyle = 'rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'

function PageHeading({ title, description, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color, bg }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>
        <span className={`rounded-lg p-2.5 ${bg}`}>
          <Icon size={21} className={color} />
        </span>
      </div>
      <h2 className="mt-3 text-3xl font-bold text-slate-900">{value}</h2>
    </div>
  )
}

function StatusBadge({ children, color = 'slate' }) {
  const styles = {
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
  }

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[color]}`}>
      {children}
    </span>
  )
}

function ErrorMessage({ children }) {
  if (!children) return null
  return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{children}</p>
}

function getRoleColor(role) {
  if (role === 'admin') return 'purple'
  if (role === 'manager') return 'amber'
  if (role === 'engineer') return 'blue'
  return 'slate'
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

// =====================================================
// TEAM MANAGEMENT
// =====================================================

export function TeamManagement() {
  const token = getToken()
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  const emptyForm = {
    name: '',
    email: '',
    password: '',
    role: 'engineer',
    department: 'Cloud Operations',
    is_active: true,
  }

  const [form, setForm] = useState(emptyForm)

  const canManage = ['admin', 'manager'].includes(currentUser?.role)

  const loadMembers = useCallback(async () => {
    try {
      const [teamResponse, meResponse] = await Promise.all([
        apiRequest('/team', { token }),
        apiRequest('/auth/me', { token }),
      ])

      setError('')
      setMembers(teamResponse.data || [])
      setCurrentUser(meResponse.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    let cancelled = false

    async function fetchMembers() {
      try {
        const [teamResponse, meResponse] = await Promise.all([
          apiRequest('/team', { token }),
          apiRequest('/auth/me', { token }),
        ])

        if (!cancelled) {
          setMembers(teamResponse.data || [])
          setCurrentUser(meResponse.user)
          setError('')
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchMembers()
    return () => { cancelled = true }
  }, [token])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()

    return members.filter(member => {
      const matchesSearch =
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        String(member.id).includes(q)

      const matchesRole = roleFilter === 'all' || member.role === roleFilter

      return matchesSearch && matchesRole
    })
  }, [members, search, roleFilter])

  function openForm(member = null) {
    setEditing(member)
    setForm(member ? {
      name: member.name,
      email: member.email,
      password: '',
      role: member.role,
      department: member.department || 'Cloud Operations',
      is_active: member.is_active,
    } : emptyForm)
    setError('')
    setNotice('')
    setShowModal(true)
  }

  async function saveMember(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      if (editing) {
        await apiRequest(`/team/${editing.id}`, {
          token,
          method: 'PATCH',
          body: JSON.stringify({
            name: form.name,
            role: form.role,
            department: form.department,
            is_active: form.is_active,
          }),
        })
        setNotice('Team member updated successfully.')
      } else {
        await apiRequest('/team', {
          token,
          method: 'POST',
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
            department: form.department,
          }),
        })
        setNotice('Team member created successfully.')
      }

      setShowModal(false)
      setEditing(null)
      setForm(emptyForm)
      await loadMembers()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deactivateMember(member) {
    if (!window.confirm(`Deactivate ${member.name}'s account? They will no longer be able to log in.`)) {
      return
    }

    setError('')
    setNotice('')

    try {
      await apiRequest(`/team/${member.id}`, {
        token,
        method: 'DELETE',
      })
      setNotice(`${member.name} has been deactivated.`)
      await loadMembers()
    } catch (err) {
      setError(err.message)
    }
  }

  const activeCount = members.filter(member => member.is_active).length
  const adminCount = members.filter(member => member.role === 'admin').length

  return (
    <div className="space-y-7">
      <PageHeading
        title="Team Management"
        description="Manage engineers, access roles and operational team members."
        action={
          <button
            onClick={() => openForm()}
            disabled={!canManage}
            title={!canManage ? 'Administrator or manager permission required' : ''}
            className={`${buttonStyle} flex items-center gap-2`}
          >
            <Plus size={18} /> Add Member
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard title="Total Members" value={members.length} icon={Users} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Active Members" value={activeCount} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Administrators" value={adminCount} icon={Shield} color="text-purple-600" bg="bg-purple-50" />
      </div>

      <ErrorMessage>{error}</ErrorMessage>
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      {!canManage && currentUser && (
        <p className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
          You have read-only team access with your current role ({currentUser.role}). An administrator or manager can make team changes.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-semibold text-slate-900">Team Directory</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search team members..."
                className={`${inputStyle} bg-slate-50 pl-10`}
              />
            </div>
            <select value={roleFilter} onChange={event => setRoleFilter(event.target.value)} className={`${inputStyle} sm:w-48`}>
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="engineer">Engineer</option>
              <option value="viewer">Viewer</option>
            </select>
            <button onClick={loadMembers} className="rounded-lg border border-slate-200 px-3 py-2 text-slate-600 hover:bg-slate-50" title="Refresh">
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left">
            <thead className="bg-slate-50">
              <tr className="text-xs text-slate-500">
                {['MEMBER', 'DEPARTMENT', 'ROLE', 'STATUS', 'ACTIONS'].map(item => (
                  <th key={item} className="px-5 py-4 font-semibold">{item}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-10 text-center text-sm text-slate-500">Loading team members...</td></tr>
              ) : filtered.map(member => (
                <tr key={member.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-800">{member.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{member.email}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{member.department || '—'}</td>
                  <td className="px-5 py-4"><StatusBadge color={getRoleColor(member.role)}>{member.role}</StatusBadge></td>
                  <td className="px-5 py-4">
                    <StatusBadge color={member.is_active ? 'green' : 'slate'}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </td>
                  <td className="px-5 py-4">
                    {canManage && Number(member.id) !== Number(currentUser?.id) && (
                      <div className="flex gap-1">
                        <button onClick={() => openForm(member)} title="Edit member" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50">
                          <Pencil size={16} />
                        </button>
                        {member.is_active && (
                          <button onClick={() => deactivateMember(member)} title="Deactivate member" className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan="5" className="p-10 text-center text-sm text-slate-500">No team members found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          Showing {filtered.length} of {members.length} members
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
          <form onSubmit={saveMember} className="my-auto w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing ? 'Edit Team Member' : 'Add Team Member'}</h2>
              <button type="button" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Full name *</label>
              <input required value={form.name} onChange={event => setForm(p => ({ ...p, name: event.target.value }))} className={inputStyle} />
            </div>

            {!editing && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium">Email address *</label>
                  <input required type="email" value={form.email} onChange={event => setForm(p => ({ ...p, email: event.target.value }))} className={inputStyle} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Temporary password *</label>
                  <input required type="password" minLength={8} value={form.password} onChange={event => setForm(p => ({ ...p, password: event.target.value }))} className={inputStyle} autoComplete="new-password" />
                  <p className="mt-1 text-xs text-slate-500">At least 8 characters. Share it securely with the new member.</p>
                </div>
              </>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium">Role</label>
              <select value={form.role} onChange={event => setForm(p => ({ ...p, role: event.target.value }))} className={inputStyle}>
                <option value="engineer">Engineer</option>
                <option value="viewer">Viewer</option>
                {currentUser?.role === 'admin' && <>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </>}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Department</label>
              <input value={form.department} onChange={event => setForm(p => ({ ...p, department: event.target.value }))} className={inputStyle} />
            </div>

            {editing && (
              <div>
                <label className="mb-2 block text-sm font-medium">Account status</label>
                <select value={String(form.is_active)} onChange={event => setForm(p => ({ ...p, is_active: event.target.value === 'true' }))} className={inputStyle}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            )}

            <ErrorMessage>{error}</ErrorMessage>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancel</button>
              <button disabled={saving} type="submit" className={buttonStyle}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Member'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// =====================================================
// AUDIT LOGS
// =====================================================

export function AuditLogs() {
  const token = getToken()
  const [logs, setLogs] = useState([])
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadLogs = useCallback(async () => {
    try {
      const response = await apiRequest('/audit-logs?limit=250', { token })
      setError('')
      setLogs(response.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    let cancelled = false

    async function fetchLogs() {
      try {
        const response = await apiRequest('/audit-logs?limit=250', { token })

        if (!cancelled) {
          setLogs(response.data || [])
          setError('')
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchLogs()
    return () => { cancelled = true }
  }, [token])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()

    return logs.filter(log => {
      const text = [
        log.user_name,
        log.action,
        log.entity_type,
        log.entity_id,
        JSON.stringify(log.details || {}),
      ].join(' ').toLowerCase()

      const matchesSearch = text.includes(q)
      const matchesModule = moduleFilter === 'all' ||
        (log.entity_type || '').toLowerCase() === moduleFilter

      return matchesSearch && matchesModule
    })
  }, [logs, search, moduleFilter])

  function exportCSV() {
    const headers = ['ID', 'User', 'Action', 'Module', 'Entity ID', 'Details', 'Timestamp']
    const rows = filtered.map(log => [
      log.id,
      log.user_name || 'Unknown user',
      log.action,
      log.entity_type || '',
      log.entity_id || '',
      JSON.stringify(log.details || {}),
      log.created_at,
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n')

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'opsboard-audit-logs.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const createCount = logs.filter(log => log.action.toLowerCase().includes('created')).length
  const updateCount = logs.filter(log => log.action.toLowerCase().includes('updated')).length

  return (
    <div className="space-y-7">
      <PageHeading
        title="Audit Logs"
        description="Review recorded application activity and operational changes."
        action={
          <button onClick={exportCSV} disabled={!filtered.length} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <Download size={17} /> Export CSV
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard title="Recorded Activities" value={logs.length} icon={ClipboardList} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Create Actions" value={createCount} icon={Plus} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Update Actions" value={updateCount} icon={Activity} color="text-amber-600" bg="bg-amber-50" />
      </div>

      <ErrorMessage>{error}</ErrorMessage>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Activity History</h2>
              <p className="mt-1 text-xs text-slate-500">Latest recorded server-side activity.</p>
            </div>
            <button onClick={loadLogs} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Refresh">
              <RefreshCw size={18} />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search activity or user..." className={`${inputStyle} bg-slate-50 pl-10`} />
            </div>
            <select value={moduleFilter} onChange={event => setModuleFilter(event.target.value)} className={`${inputStyle} sm:w-48`}>
              <option value="all">All Modules</option>
              <option value="team">Team</option>
              <option value="settings">Settings</option>
              <option value="incidents">Incidents</option>
              <option value="services">Services</option>
              <option value="deployments">Deployments</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-slate-50">
              <tr className="text-xs text-slate-500">
                {['ACTIVITY', 'USER', 'MODULE', 'ENTITY ID', 'TIMESTAMP'].map(item => (
                  <th key={item} className="px-5 py-4 font-semibold">{item}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-10 text-center text-sm text-slate-500">Loading audit records...</td></tr>
              ) : filtered.map(log => (
                <tr key={log.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-800">{log.action}</p>
                    <p className="mt-1 max-w-sm truncate text-xs text-slate-500">{JSON.stringify(log.details || {})}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{log.user_name || 'Unknown user'}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{log.entity_type || '—'}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{log.entity_id || '—'}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{formatDate(log.created_at)}</td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan="5" className="p-10 text-center text-sm text-slate-500">No audit records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          Showing {filtered.length} of {logs.length} records
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Shield size={19} className="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Audit activity</p>
            <p className="mt-1 text-xs leading-5 text-blue-800">
              Records are retrieved from the PostgreSQL audit_logs table. The current integration records Team and Settings changes; additional operational modules can be connected to this audit trail next.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// SETTINGS
// =====================================================

export function SettingsPage() {
  const token = getToken()
  const [activeTab, setActiveTab] = useState('Profile')
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
  })
  const [preferences, setPreferences] = useState({
    emailAlerts: true,
    incidentAlerts: true,
    deploymentAlerts: true,
    maintenanceAlerts: false,
    weeklyReport: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const tabs = [
    { name: 'Profile', icon: User },
    { name: 'Notifications', icon: Bell },
    { name: 'Security', icon: Lock },
    { name: 'Application', icon: SettingsIcon },
  ]


  useEffect(() => {
    let cancelled = false

    async function fetchSettings() {
      try {
        const response = await apiRequest('/settings', { token })
        const data = response.data

        if (!cancelled) {
          setProfile({
            name: data.name || '',
            email: data.email || '',
            role: data.role || '',
            department: data.department || '',
          })

          setPreferences(p => ({
            ...p,
            ...(data.preferences || {}),
          }))

          setError('')
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchSettings()
    return () => { cancelled = true }
  }, [token])

  async function saveProfile(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      const response = await apiRequest('/settings', {
        token,
        method: 'PATCH',
        body: JSON.stringify({
          name: profile.name,
          department: profile.department,
        }),
      })

      setProfile(p => ({
        ...p,
        name: response.data.name,
        department: response.data.department || '',
      }))

      setNotice('Profile updated successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function savePreferences() {
    setSaving(true)
    setError('')
    setNotice('')

    try {
      const response = await apiRequest('/settings', {
        token,
        method: 'PATCH',
        body: JSON.stringify({ preferences }),
      })

      setPreferences(p => ({ ...p, ...(response.data.preferences || {}) }))
      setNotice('Notification preferences saved successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function togglePreference(key) {
    setPreferences(p => ({ ...p, [key]: !p[key] }))
    setNotice('')
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading account settings...</div>
  }

  return (
    <div className="space-y-7">
      <PageHeading
        title="Settings"
        description="Manage your profile and application preferences."
      />

      <ErrorMessage>{error}</ErrorMessage>
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <div className="h-fit rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.name}
                onClick={() => { setActiveTab(tab.name); setNotice(''); setError('') }}
                className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium ${activeTab === tab.name ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Icon size={18} />{tab.name}
              </button>
            )
          })}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {activeTab === 'Profile' && (
            <>
              <h2 className="text-lg font-bold text-slate-900">Profile Information</h2>
              <p className="mt-1 text-sm text-slate-500">Manage your personal account details.</p>

              <div className="my-6 flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                  {profile.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{profile.name}</p>
                  <p className="text-sm capitalize text-slate-500">{profile.role}</p>
                </div>
              </div>

              <form onSubmit={saveProfile} className="max-w-xl space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium">Full name</label>
                  <input required maxLength={100} value={profile.name} onChange={event => setProfile(p => ({ ...p, name: event.target.value }))} className={inputStyle} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Email address</label>
                  <input type="email" value={profile.email} disabled className={`${inputStyle} bg-slate-50 text-slate-500`} />
                  <p className="mt-1 text-xs text-slate-500">Email changes are not enabled in this version.</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Department</label>
                  <input maxLength={100} value={profile.department} onChange={event => setProfile(p => ({ ...p, department: event.target.value }))} className={inputStyle} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Account role</label>
                  <input value={profile.role} disabled className={`${inputStyle} bg-slate-50 text-slate-500`} />
                </div>
                <button disabled={saving} className={buttonStyle}>{saving ? 'Saving...' : 'Save Profile'}</button>
              </form>
            </>
          )}

          {activeTab === 'Notifications' && (
            <>
              <h2 className="text-lg font-bold text-slate-900">Notification Preferences</h2>
              <p className="mt-1 text-sm text-slate-500">Choose which operational updates you want to receive.</p>

              <div className="mt-6 divide-y divide-slate-100">
                {[
                  ['emailAlerts', 'Email notifications', 'Receive application notifications by email.'],
                  ['incidentAlerts', 'Incident alerts', 'Get notified about new and critical incidents.'],
                  ['deploymentAlerts', 'Deployment updates', 'Receive deployment success and failure updates.'],
                  ['maintenanceAlerts', 'Maintenance reminders', 'Get reminders about scheduled maintenance.'],
                  ['weeklyReport', 'Weekly operations report', 'Receive a weekly operations summary.'],
                ].map(([key, label, description]) => (
                  <div key={key} className="flex items-center justify-between gap-4 py-5">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{label}</p>
                      <p className="mt-1 text-xs text-slate-500">{description}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={preferences[key]}
                      onClick={() => togglePreference(key)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition ${preferences[key] ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${preferences[key] ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={savePreferences} disabled={saving} className={`${buttonStyle} mt-6`}>
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </>
          )}

          {activeTab === 'Security' && (
            <>
              <h2 className="text-lg font-bold text-slate-900">Security Settings</h2>
              <p className="mt-1 text-sm text-slate-500">Account security and access controls.</p>

              <div className="mt-6 space-y-4">
                <div className="rounded-lg border border-slate-200 p-5">
                  <div className="flex items-center gap-3">
                    <Lock className="text-blue-600" />
                    <div>
                      <p className="text-sm font-semibold">Password management</p>
                      <p className="mt-1 text-xs text-slate-500">Password change workflow is not yet implemented.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 p-5">
                  <div className="flex items-center gap-3">
                    <Shield className="text-emerald-600" />
                    <div>
                      <p className="text-sm font-semibold">Role-based access control</p>
                      <p className="mt-1 text-xs text-slate-500">Your current role is {profile.role}. Access is checked by the backend on protected operations.</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'Application' && (
            <>
              <h2 className="text-lg font-bold text-slate-900">Application Settings</h2>
              <p className="mt-1 text-sm text-slate-500">OpsBoard application information.</p>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-5">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Application name</p>
                    <p className="mt-1 text-xs text-slate-500">OpsBoard Cloud Operations Platform</p>
                  </div>
                  <Server className="text-blue-600" />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-5">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Frontend framework</p>
                    <p className="mt-1 text-xs text-slate-500">React + Vite</p>
                  </div>
                  <Activity className="text-blue-600" />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-5">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Application version</p>
                    <p className="mt-1 text-xs text-slate-500">v1.0.0 - Development</p>
                  </div>
                  <StatusBadge color="blue">v1.0.0</StatusBadge>
                </div>
                <div className="rounded-lg bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-800">Environment</p>
                  <p className="mt-1 text-xs text-slate-500">Docker-based local environment</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}















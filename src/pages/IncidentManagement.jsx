import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search, Plus, Activity, AlertCircle, Clock,
  CheckCircle2, RefreshCw,
} from 'lucide-react'
import { apiRequest, getToken } from '../services/api'

const severityMap = {
  critical: 'P1',
  high: 'P2',
  medium: 'P3',
  low: 'P4',
}

const severityToApi = {
  P1: 'critical',
  P2: 'high',
  P3: 'medium',
  P4: 'low',
}

const statusStyles = {
  open: 'bg-blue-50 text-blue-700',
  investigating: 'bg-amber-50 text-amber-700',
  resolved: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-slate-100 text-slate-600',
}

const severityStyles = {
  P1: 'bg-red-50 text-red-700',
  P2: 'bg-orange-50 text-orange-700',
  P3: 'bg-yellow-50 text-yellow-700',
  P4: 'bg-slate-100 text-slate-600',
}

const emptyForm = {
  title: '',
  description: '',
  service_id: '',
  severity: 'P3',
}

function mapIncident(item) {
  return {
    ...item,
    id: String(item.id),
    service: item.service_name || 'Unassigned',
    assignee: item.assignee_name || 'Unassigned',
    severity: severityMap[item.severity] || 'P3',
    status: item.status || 'open',
    createdAt: item.created_at
      ? new Date(item.created_at).toLocaleDateString('en-IN')
      : 'Not available',
  }
}

export default function IncidentManagement() {
  const [incidents, setIncidents] = useState([])
  const [services, setServices] = useState([])
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const loadData = useCallback(async () => {
    try {
      const token = getToken()
      const [incidentResult, serviceResult] = await Promise.all([
        apiRequest('/incidents', { token }),
        apiRequest('/services', { token }),
      ])

      setError('')
      setIncidents((incidentResult.data || []).map(mapIncident))
      setServices(serviceResult.data || [])
    } catch (err) {
      setError(err.message || 'Unable to load incidents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const token = getToken()
        const [incidentResult, serviceResult] = await Promise.all([
          apiRequest('/incidents', { token }),
          apiRequest('/services', { token }),
        ])

        if (!cancelled) {
          setIncidents((incidentResult.data || []).map(mapIncident))
          setServices(serviceResult.data || [])
          setError('')
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load incidents')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [])

  const stats = useMemo(() => ({
    total: incidents.length,
    open: incidents.filter(item => item.status === 'open').length,
    investigating: incidents.filter(item => item.status === 'investigating').length,
    resolved: incidents.filter(item => ['resolved', 'closed'].includes(item.status)).length,
  }), [incidents])

  const filtered = useMemo(() => {
    const query = search.toLowerCase()

    return incidents.filter(item => {
      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        item.service.toLowerCase().includes(query) ||
        item.id.includes(query)

      const matchesSeverity =
        severityFilter === 'All' || item.severity === severityFilter

      const matchesStatus =
        statusFilter === 'All' || item.status === statusFilter

      return matchesSearch && matchesSeverity && matchesStatus
    })
  }, [incidents, search, severityFilter, statusFilter])

  function changeForm(event) {
    setForm(previous => ({
      ...previous,
      [event.target.name]: event.target.value,
    }))
  }

  async function createIncident(event) {
    event.preventDefault()
    setFormError('')

    if (!form.title.trim()) {
      setFormError('Please enter an incident title.')
      return
    }

    setSaving(true)

    try {
      await apiRequest('/incidents', {
        method: 'POST',
        token: getToken(),
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          service_id: form.service_id || null,
          severity: severityToApi[form.severity],
        }),
      })

      setForm(emptyForm)
      setShowModal(false)
      await loadData()
    } catch (err) {
      setFormError(err.message || 'Unable to create incident')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(incident, status) {
    try {
      await apiRequest(`/incidents/${incident.id}`, {
        method: 'PATCH',
        token: getToken(),
        body: JSON.stringify({ status }),
      })
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to update incident')
    }
  }

  const cards = [
    { title: 'Total Incidents', value: stats.total, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Open', value: stats.open, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Investigating', value: stats.investigating, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Resolved / Closed', value: stats.resolved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Incident Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track, investigate and resolve recorded incidents.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} disabled={loading} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => { setForm(emptyForm); setFormError(''); setShowModal(true) }} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus size={18} /> Create Incident
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <div key={card.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <div className={`rounded-lg p-2.5 ${card.bg}`}><Icon size={21} className={card.color} /></div>
              </div>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">{card.value}</h2>
            </div>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-semibold text-slate-900">All Incidents</h2>
          <p className="mt-1 text-xs text-slate-500">Live records from the OpsBoard database.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search incidents..." className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-400" />
            </div>
            <select value={severityFilter} onChange={event => setSeverityFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
              <option value="All">All Severities</option>
              <option value="P1">P1 - Critical</option>
              <option value="P2">P2 - High</option>
              <option value="P3">P3 - Medium</option>
              <option value="P4">P4 - Low</option>
            </select>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
              <option value="All">All Statuses</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading incidents...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No incidents found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Incident</th>
                  <th className="px-5 py-4 font-semibold">Service</th>
                  <th className="px-5 py-4 font-semibold">Severity</th>
                  <th className="px-5 py-4 font-semibold">Assigned To</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(incident => (
                  <tr key={incident.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">{incident.title}</p>
                      <p className="mt-1 text-xs text-slate-500">INC-{incident.id}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{incident.service}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${severityStyles[incident.severity]}`}>
                        {incident.severity}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{incident.assignee}</td>
                    <td className="px-5 py-4">
                      <select aria-label={`Update incident ${incident.id} status`} value={incident.status} onChange={event => updateStatus(incident, event.target.value)} className={`rounded-lg border-0 px-2.5 py-1.5 text-xs font-semibold ${statusStyles[incident.status]}`}>
                        <option value="open">Open</option>
                        <option value="investigating">Investigating</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{incident.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-bold text-slate-900">Create Incident</h2>
            <form onSubmit={createIncident} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Incident Title</label>
                <input name="title" value={form.title} onChange={changeForm} required className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" placeholder="e.g. API latency detected" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                <textarea name="description" value={form.description} onChange={changeForm} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Affected Service</label>
                <select name="service_id" value={form.service_id} onChange={changeForm} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
                  <option value="">Not assigned</option>
                  {services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Severity</label>
                <select name="severity" value={form.severity} onChange={changeForm} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
                  <option value="P1">P1 - Critical</option>
                  <option value="P2">P2 - High</option>
                  <option value="P3">P3 - Medium</option>
                  <option value="P4">P4 - Low</option>
                </select>
              </div>
              {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Create Incident'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}




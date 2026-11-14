import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { apiRequest, getToken } from '../services/api'

const emptyForm = {
  title: '',
  description: '',
  service_id: '',
  start_time: '',
  end_time: '',
}

const statusStyles = {
  scheduled: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-600',
}

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : date.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
}


export function MaintenanceScheduler() {
  const [items, setItems] = useState([])
  const [services, setServices] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const loadData = useCallback(async () => {
    try {
      const token = getToken()
      const [maintenanceResult, serviceResult] = await Promise.all([
        apiRequest('/maintenance', { token }),
        apiRequest('/services', { token }),
      ])
      setError('')
      setItems(maintenanceResult.data || [])
      setServices(serviceResult.data || [])
    } catch (err) {
      setError(err.message || 'Unable to load maintenance windows')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const token = getToken()
        const [maintenanceResult, serviceResult] = await Promise.all([
          apiRequest('/maintenance', { token }),
          apiRequest('/services', { token }),
        ])

        if (!cancelled) {
          setItems(maintenanceResult.data || [])
          setServices(serviceResult.data || [])
          setError('')
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load maintenance windows')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const query = search.toLowerCase()
    return items.filter(item => {
      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        (item.service_name || '').toLowerCase().includes(query)
      const matchesStatus =
        statusFilter === 'All' || item.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [items, search, statusFilter])

  function changeForm(event) {
    setForm(previous => ({
      ...previous,
      [event.target.name]: event.target.value,
    }))
  }

  async function createMaintenance(event) {
    event.preventDefault()
    setFormError('')

    if (!form.title.trim() || !form.start_time || !form.end_time) {
      setFormError('Title, start time and end time are required.')
      return
    }

    if (new Date(form.end_time) <= new Date(form.start_time)) {
      setFormError('End time must be after start time.')
      return
    }

    setSaving(true)
    try {
      await apiRequest('/maintenance', {
        method: 'POST',
        token: getToken(),
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          description: form.description.trim(),
          service_id: form.service_id || null,
          start_time: new Date(form.start_time).toISOString(),
          end_time: new Date(form.end_time).toISOString(),
        }),
      })
      setForm(emptyForm)
      setShowModal(false)
      await loadData()
    } catch (err) {
      setFormError(err.message || 'Unable to create maintenance window')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(item, status) {
    try {
      await apiRequest(`/maintenance/${item.id}`, {
        method: 'PATCH',
        token: getToken(),
        body: JSON.stringify({ status }),
      })
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to update maintenance status')
    }
  }

  async function deleteItem(item) {
    if (!window.confirm(`Delete maintenance window "${item.title}"?`)) return
    try {
      await apiRequest(`/maintenance/${item.id}`, {
        method: 'DELETE',
        token: getToken(),
      })
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to delete maintenance window')
    }
  }

  const counts = {
    total: items.length,
    scheduled: items.filter(item => item.status === 'scheduled').length,
    inProgress: items.filter(item => item.status === 'in_progress').length,
    completed: items.filter(item => item.status === 'completed').length,
  }

  const cards = [
    ['Total Windows', counts.total],
    ['Scheduled', counts.scheduled],
    ['In Progress', counts.inProgress],
    ['Completed', counts.completed],
  ]

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Maintenance Scheduler</h1>
          <p className="mt-1 text-sm text-slate-500">Plan and track service maintenance windows.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} disabled={loading} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => { setForm(emptyForm); setFormError(''); setShowModal(true) }} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus size={18} /> Schedule Maintenance
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">{value}</h2>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-semibold text-slate-900">Maintenance Windows</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search maintenance..." className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
              <option value="All">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading maintenance windows...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No maintenance windows found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Maintenance</th>
                  <th className="px-5 py-4 font-semibold">Service</th>
                  <th className="px-5 py-4 font-semibold">Start</th>
                  <th className="px-5 py-4 font-semibold">End</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.description || 'No description'}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{item.service_name || 'All services'}</td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(item.start_time)}</td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(item.end_time)}</td>
                    <td className="px-5 py-4">
                      <select aria-label={`Update maintenance ${item.id} status`} value={item.status} onChange={event => updateStatus(item, event.target.value)} className={`rounded-lg border-0 px-2.5 py-1.5 text-xs font-semibold ${statusStyles[item.status]}`}>
                        <option value="scheduled">Scheduled</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => deleteItem(item)} title="Delete maintenance window" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </td>
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
            <div className="mb-5 flex items-center gap-2">
              <CalendarDays size={20} className="text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Schedule Maintenance</h2>
            </div>
            <form onSubmit={createMaintenance} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Title</label>
                <input name="title" value={form.title} onChange={changeForm} required className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" placeholder="e.g. Database upgrade" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                <textarea name="description" value={form.description} onChange={changeForm} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Service</label>
                <select name="service_id" value={form.service_id} onChange={changeForm} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
                  <option value="">All services</option>
                  {services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Start Time</label>
                  <input type="datetime-local" name="start_time" value={form.start_time} onChange={changeForm} required className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">End Time</label>
                  <input type="datetime-local" name="end_time" value={form.end_time} onChange={changeForm} required className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
                </div>
              </div>
              {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Schedule Window'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}





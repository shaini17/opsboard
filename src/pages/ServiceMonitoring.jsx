import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search, Plus, Server, Activity, CheckCircle2,
  AlertTriangle, X, Trash2, RefreshCw,
} from 'lucide-react'
import { apiRequest, getToken } from '../services/api'

const emptyForm = {
  name: '',
  description: '',
  environment: 'production',
  status: 'operational',
  server_name: '',
  endpoint: '',
}

const statusLabels = {
  operational: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
  maintenance: 'Maintenance',
}

const statusStyles = {
  operational: 'bg-emerald-50 text-emerald-700',
  degraded: 'bg-amber-50 text-amber-700',
  down: 'bg-red-50 text-red-700',
  maintenance: 'bg-blue-50 text-blue-700',
}

function formatService(service) {
  return {
    ...service,
    id: String(service.id),
    environment: service.environment || 'production',
    status: service.status || 'operational',
    cpu: Number(service.cpu_usage || 0),
    memory: Number(service.memory_usage || 0),
  }
}

export default function ServiceMonitoring() {
  const [services, setServices] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [environmentFilter, setEnvironmentFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  // Used by refresh, create, update and delete actions.
  const loadServices = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await apiRequest('/services', {
        token: getToken(),
      })

      setServices((result.data || []).map(formatService))
    } catch (err) {
      setError(err.message || 'Unable to load services')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial loading: fetch asynchronously and clean up on unmount.
  useEffect(() => {
    let cancelled = false

    async function fetchServices() {
      try {
        const result = await apiRequest('/services', {
          token: getToken(),
        })

        if (!cancelled) {
          setError('')
          setServices((result.data || []).map(formatService))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load services')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchServices()

    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => ({
    total: services.length,
    operational: services.filter(s => s.status === 'operational').length,
    degraded: services.filter(s => s.status === 'degraded').length,
    down: services.filter(s => s.status === 'down').length,
  }), [services])

  const filteredServices = useMemo(() => {
    const query = search.toLowerCase()

    return services.filter(service => {
      const matchesSearch =
        service.name.toLowerCase().includes(query) ||
        String(service.id).includes(query) ||
        (service.description || '').toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'All' || service.status === statusFilter

      const matchesEnvironment =
        environmentFilter === 'All' ||
        service.environment === environmentFilter

      return matchesSearch && matchesStatus && matchesEnvironment
    })
  }, [services, search, statusFilter, environmentFilter])

  function changeForm(event) {
    setForm(previous => ({
      ...previous,
      [event.target.name]: event.target.value,
    }))
  }

  async function createService(event) {
    event.preventDefault()
    setFormError('')

    if (!form.name.trim()) {
      setFormError('Please enter a service name.')
      return
    }

    setSaving(true)

    try {
      await apiRequest('/services', {
        method: 'POST',
        token: getToken(),
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          description: form.description.trim(),
          server_name: form.server_name.trim() || null,
          endpoint: form.endpoint.trim() || null,
        }),
      })

      setForm(emptyForm)
      setShowModal(false)
      await loadServices()
    } catch (err) {
      setFormError(err.message || 'Unable to register service')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(service, status) {
    try {
      await apiRequest(`/services/${service.id}`, {
        method: 'PATCH',
        token: getToken(),
        body: JSON.stringify({ status }),
      })

      await loadServices()
    } catch (err) {
      setError(err.message || 'Unable to update service status')
    }
  }

  async function deleteService(service) {
    if (!window.confirm(`Delete service "${service.name}"?`)) return

    try {
      await apiRequest(`/services/${service.id}`, {
        method: 'DELETE',
        token: getToken(),
      })

      await loadServices()
    } catch (err) {
      setError(err.message || 'Unable to delete service')
    }
  }

  const cards = [
    {
      label: 'Total Services',
      value: stats.total,
      icon: Server,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Healthy',
      value: stats.operational,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Degraded',
      value: stats.degraded,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Down',
      value: stats.down,
      icon: Activity,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ]

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Service Monitoring
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor and manage services stored in PostgreSQL.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadServices}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw
              size={16}
              className={loading ? 'animate-spin' : ''}
            />
            Refresh
          </button>

          <button
            onClick={() => {
              setForm(emptyForm)
              setFormError('')
              setShowModal(true)
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={18} />
            Register Service
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => {
          const Icon = card.icon

          return (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  {card.label}
                </p>

                <div className={`rounded-lg p-2.5 ${card.bg}`}>
                  <Icon size={21} className={card.color} />
                </div>
              </div>

              <h2 className="mt-3 text-3xl font-bold text-slate-900">
                {card.value}
              </h2>
            </div>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-semibold text-slate-900">
            Registered Services
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Changes are saved directly to the database.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search services..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600"
            >
              <option value="All">All Statuses</option>
              <option value="operational">Healthy</option>
              <option value="degraded">Degraded</option>
              <option value="down">Down</option>
              <option value="maintenance">Maintenance</option>
            </select>

            <select
              value={environmentFilter}
              onChange={event => setEnvironmentFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600"
            >
              <option value="All">All Environments</option>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Loading services...
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No services found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Service</th>
                  <th className="px-5 py-4 font-semibold">Environment</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">CPU</th>
                  <th className="px-5 py-4 font-semibold">Memory</th>
                  <th className="px-5 py-4 font-semibold">Update Status</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredServices.map(service => (
                  <tr
                    key={service.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">
                        {service.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {service.server_name || `Service ID: ${service.id}`}
                      </p>
                    </td>

                    <td className="px-5 py-4 capitalize text-slate-600">
                      {service.environment}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[service.status] || 'bg-slate-100 text-slate-600'}`}
                      >
                        {statusLabels[service.status] || service.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {service.cpu}%
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {service.memory}%
                    </td>

                    <td className="px-5 py-4">
                      <select
                        aria-label={`Update ${service.name} status`}
                        value={service.status}
                        onChange={event =>
                          updateStatus(service, event.target.value)
                        }
                        className="rounded-lg border border-slate-200 px-2 py-2 text-xs"
                      >
                        <option value="operational">Healthy</option>
                        <option value="degraded">Degraded</option>
                        <option value="down">Down</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        onClick={() => deleteService(service)}
                        title="Delete service"
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
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
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Register Service
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={createService} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Service Name
                </label>

                <input
                  name="name"
                  value={form.name}
                  onChange={changeForm}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                  placeholder="e.g. Banking API"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={changeForm}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                  placeholder="What does this service do?"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Environment
                  </label>

                  <select
                    name="environment"
                    value={form.environment}
                    onChange={changeForm}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                  >
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Initial Status
                  </label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={changeForm}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                  >
                    <option value="operational">Healthy</option>
                    <option value="degraded">Degraded</option>
                    <option value="down">Down</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Server Name (optional)
                </label>

                <input
                  name="server_name"
                  value={form.server_name}
                  onChange={changeForm}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                  placeholder="e.g. bank-prod-01"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Endpoint (optional)
                </label>

                <input
                  name="endpoint"
                  value={form.endpoint}
                  onChange={changeForm}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                  placeholder="https://api.example.com"
                />
              </div>

              {formError && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                >
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Register Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

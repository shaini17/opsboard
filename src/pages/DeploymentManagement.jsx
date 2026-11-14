import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Rocket,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  Plus,
  X,
  RotateCcw,
} from 'lucide-react'

import { apiRequest, getToken } from '../services/api'

const emptyForm = {
  service_id: '',
  version: '',
  environment: 'development',
  commit_hash: '',
  deployment_notes: '',
}

const statusStyle = {
  Successful: 'bg-emerald-50 text-emerald-700',
  Failed: 'bg-red-50 text-red-700',
  'In Progress': 'bg-blue-50 text-blue-700',
  Pending: 'bg-slate-100 text-slate-700',
  'Rolled Back': 'bg-amber-50 text-amber-700',
}

function formatStatus(status) {
  const statuses = {
    successful: 'Successful',
    failed: 'Failed',
    in_progress: 'In Progress',
    pending: 'Pending',
    rolled_back: 'Rolled Back',
  }

  return statuses[String(status || '').toLowerCase()] || status || 'Unknown'
}

function formatEnvironment(environment) {
  if (!environment) return 'Not specified'

  return environment.charAt(0).toUpperCase() + environment.slice(1).toLowerCase()
}

function formatDate(dateValue) {
  if (!dateValue) return 'Not available'

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) return 'Not available'

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function calculateDuration(startedAt, completedAt) {
  if (!startedAt) return 'Not available'
  if (!completedAt) return 'Running'

  const start = new Date(startedAt).getTime()
  const end = new Date(completedAt).getTime()

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return 'Not available'
  }

  const totalSeconds = Math.floor((end - start) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) return `${seconds}s`

  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

function mapDeployment(item) {
  return {
    id: `DEP-${String(item.id).padStart(3, '0')}`,
    databaseId: item.id,
    app: item.service_name || 'Unknown Service',
    version: item.version || 'Not specified',
    environment: formatEnvironment(item.environment),
    status: formatStatus(item.status),
    commit: item.commit_hash || 'Not provided',
    engineer: item.engineer || 'Unknown',
    date: formatDate(item.created_at || item.started_at),
    completedDate: formatDate(item.completed_at),
    duration: calculateDuration(item.started_at, item.completed_at),
    notes: item.deployment_notes || 'No deployment notes provided',
  }
}

export default function DeploymentManagement() {
  const [deployments, setDeployments] = useState([])
  const [services, setServices] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [environmentFilter, setEnvironmentFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [statusError, setStatusError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setFetchError('')

      const token = getToken()

      if (!token) {
        throw new Error('Please log in to view deployments.')
      }

      const [deploymentResult, dashboardResult] = await Promise.all([
        apiRequest('/deployments', { token }),
        apiRequest('/dashboard', { token }),
      ])

      if (!deploymentResult.success || !Array.isArray(deploymentResult.data)) {
        throw new Error('Invalid deployment response from server.')
      }

      if (!dashboardResult.success || !Array.isArray(dashboardResult.data?.services)) {
        throw new Error('Unable to retrieve registered services.')
      }

      const mappedDeployments = deploymentResult.data.map(mapDeployment)

      setDeployments(mappedDeployments)
      setServices(dashboardResult.data.services)

      setSelected((current) => {
        if (!current) return null

        return mappedDeployments.find(
          (deployment) => String(deployment.databaseId) === String(current.databaseId)
        ) || null
      })
    } catch (error) {
      setFetchError(error.message || 'Unable to load deployment data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadData])

  const successful = deployments.filter(
    (deployment) => deployment.status === 'Successful'
  ).length

  const failed = deployments.filter(
    (deployment) => deployment.status === 'Failed'
  ).length

  const running = deployments.filter(
    (deployment) => deployment.status === 'In Progress'
  ).length

  const filtered = useMemo(() => {
    const query = search.toLowerCase()

    return deployments.filter((deployment) => {
      const matchesSearch =
        deployment.id.toLowerCase().includes(query) ||
        deployment.app.toLowerCase().includes(query) ||
        deployment.version.toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'All' || deployment.status === statusFilter

      const matchesEnvironment =
        environmentFilter === 'All' ||
        deployment.environment === environmentFilter

      return matchesSearch && matchesStatus && matchesEnvironment
    })
  }, [deployments, search, statusFilter, environmentFilter])

  function changeForm(event) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  function openCreateModal() {
    setForm(emptyForm)
    setFormError('')
    setSuccessMessage('')
    setShowModal(true)
  }

  async function createDeployment(event) {
    event.preventDefault()
    setFormError('')
    setSuccessMessage('')

    if (!form.service_id || !form.version.trim()) {
      setFormError('Please select a service and enter a version.')
      return
    }

    try {
      setSaving(true)

      const token = getToken()

      if (!token) {
        throw new Error('Your login session is missing. Please log in again.')
      }

      const result = await apiRequest('/deployments', {
        method: 'POST',
        token,
        body: JSON.stringify({
          service_id: Number(form.service_id),
          version: form.version.trim(),
          environment: form.environment,
          commit_hash: form.commit_hash.trim(),
          deployment_notes: form.deployment_notes.trim(),
        }),
      })

      if (!result.success) {
        throw new Error(result.message || 'Unable to create deployment.')
      }

      setShowModal(false)
      setForm(emptyForm)
      setSuccessMessage('Deployment created successfully.')

      await loadData()
    } catch (error) {
      setFormError(error.message || 'Unable to create deployment.')
    } finally {
      setSaving(false)
    }
  }

  async function updateDeploymentStatus(status) {
    if (!selected || updatingStatus) return

    const statusLabels = {
      successful: 'Successful',
      failed: 'Failed',
      rolled_back: 'Rolled Back',
      in_progress: 'In Progress',
    }

    const label = statusLabels[status]

    if (!label) return

    const confirmed = window.confirm(
      `Are you sure you want to mark ${selected.id} as ${label}?`
    )

    if (!confirmed) return

    try {
      setUpdatingStatus(true)
      setStatusError('')
      setStatusMessage('')

      const token = getToken()

      if (!token) {
        throw new Error('Please log in again.')
      }

      const result = await apiRequest(
        `/deployments/${selected.databaseId}/status`,
        {
          method: 'PATCH',
          token,
          body: JSON.stringify({ status }),
        }
      )

      if (!result.success) {
        throw new Error(result.message || 'Unable to update deployment status.')
      }

      setStatusMessage(`Deployment marked as ${label}.`)

      await loadData()
    } catch (error) {
      setStatusError(error.message || 'Unable to update deployment status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const stats = [
    {
      label: 'Total Deployments',
      value: deployments.length,
      icon: Rocket,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Successful',
      value: successful,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Failed',
      value: failed,
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'In Progress',
      value: running,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ]

  if (selected) {
    const terminalStatuses = ['Successful', 'Failed', 'Rolled Back']

    return (
      <div className="space-y-6">
        <button
          onClick={() => {
            setSelected(null)
            setStatusError('')
            setStatusMessage('')
          }}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← Back to Deployments
        </button>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-400">{selected.id}</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {selected.app}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Deployment version {selected.version}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                statusStyle[selected.status] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {selected.status}
            </span>
          </div>

          {statusMessage && (
            <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {statusMessage}
            </div>
          )}

          {statusError && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {statusError}
            </div>
          )}

          <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Environment', selected.environment],
              ['Commit', selected.commit],
              ['Engineer', selected.engineer],
              ['Deployment date', selected.date],
              ['Duration', selected.duration],
              ['Completed at', selected.completedDate],
              ['Deployment notes', selected.notes],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 break-all text-sm font-semibold text-slate-800">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <h2 className="font-semibold text-slate-900">
              Deployment Actions
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Update the recorded status of this deployment.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => updateDeploymentStatus('successful')}
                disabled={updatingStatus || selected.status === 'Successful'}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCircle2 size={17} />
                Mark Successful
              </button>

              <button
                type="button"
                onClick={() => updateDeploymentStatus('failed')}
                disabled={updatingStatus || selected.status === 'Failed'}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <XCircle size={17} />
                Mark Failed
              </button>

              <button
                type="button"
                onClick={() => updateDeploymentStatus('rolled_back')}
                disabled={updatingStatus || selected.status === 'Rolled Back'}
                className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw size={17} />
                Mark Rolled Back
              </button>

              {!terminalStatuses.includes(selected.status) && (
                <button
                  type="button"
                  onClick={() => updateDeploymentStatus('in_progress')}
                  disabled={updatingStatus || selected.status === 'In Progress'}
                  className="flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Clock size={17} />
                  Mark In Progress
                </button>
              )}
            </div>

            {updatingStatus && (
              <p className="mt-4 text-sm text-slate-500">
                Updating deployment status...
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Deployment Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track application releases and deployment activity across environments.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          disabled={services.length === 0}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Plus size={18} />
          New Deployment
        </button>
      </div>

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon

          return (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{stat.label}</p>
                <span className={`rounded-lg p-2.5 ${stat.bg}`}>
                  <Icon size={21} className={stat.color} />
                </span>
              </div>

              <h2 className="mt-3 text-3xl font-bold text-slate-900">
                {stat.value}
              </h2>
            </div>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">
                Deployment History
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Records retrieved from the OpsBoard database.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search deployments..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="All">All Statuses</option>
              <option>Successful</option>
              <option>Failed</option>
              <option>In Progress</option>
              <option>Pending</option>
              <option>Rolled Back</option>
            </select>

            <select
              value={environmentFilter}
              onChange={(event) => setEnvironmentFilter(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="All">All Environments</option>
              <option>Development</option>
              <option>Staging</option>
              <option>Production</option>
            </select>
          </div>
        </div>

        {fetchError && (
          <div className="m-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">
              Unable to load deployment data
            </p>
            <p className="mt-1 text-sm text-red-600">{fetchError}</p>
            <button
              type="button"
              onClick={() => void loadData()}
              className="mt-3 text-sm font-semibold text-red-700 underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw
              size={24}
              className="mx-auto animate-spin text-blue-600"
            />
            <p className="mt-3 text-sm text-slate-500">
              Loading deployments...
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100 text-xs text-slate-500">
                  {[
                    'DEPLOYMENT',
                    'VERSION',
                    'ENVIRONMENT',
                    'STATUS',
                    'ENGINEER',
                    'DATE',
                    'ACTIONS',
                  ].map((heading) => (
                    <th key={heading} className="px-5 py-4 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((deployment) => (
                  <tr
                    key={deployment.databaseId}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-800">
                        {deployment.app}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {deployment.id}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-slate-700">
                      {deployment.version}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {deployment.environment}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusStyle[deployment.status] ||
                          'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {deployment.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {deployment.engineer}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {deployment.date}
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        title="View deployment details"
                        onClick={() => {
                          setSelected(deployment)
                          setStatusError('')
                          setStatusMessage('')
                        }}
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-sm text-slate-500">
                      {fetchError ? 'Unable to load deployments.' : 'No deployments found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          Showing {filtered.length} of {deployments.length} deployments
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Register Deployment
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Create a deployment record in PostgreSQL.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createDeployment} className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Application / Service *
                </label>
                <select
                  name="service_id"
                  value={form.service_id}
                  onChange={changeForm}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="">Select a service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} ({service.environment})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Version *
                  </label>
                  <input
                    name="version"
                    value={form.version}
                    onChange={changeForm}
                    required
                    maxLength={50}
                    placeholder="e.g. v1.3.0"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Environment *
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
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Commit Hash
                </label>
                <input
                  name="commit_hash"
                  value={form.commit_hash}
                  onChange={changeForm}
                  maxLength={100}
                  placeholder="Optional Git commit hash"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Deployment Notes
                </label>
                <textarea
                  name="deployment_notes"
                  value={form.deployment_notes}
                  onChange={changeForm}
                  rows={3}
                  placeholder="Describe this deployment..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>

              {formError && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus size={17} />
                  {saving ? 'Creating...' : 'Register Deployment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

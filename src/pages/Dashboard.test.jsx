
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Dashboard from './Dashboard'

const dashboardResponse = {
  success: true,
  data: {
    stats: {
      monitoredServices: 12,
      activeIncidents: 3,
      monthlyDeployments: 8,
    },
    infrastructureHealth: {
      operational: 9,
      degraded: 2,
      down: 1,
      maintenance: 0,
      total: 12,
    },
    deploymentActivity: [
      { day: 'Mon', date: '2026-11-09', deployments: 2 },
      { day: 'Tue', date: '2026-11-10', deployments: 1 },
      { day: 'Wed', date: '2026-11-11', deployments: 3 },
      { day: 'Thu', date: '2026-11-12', deployments: 0 },
      { day: 'Fri', date: '2026-11-13', deployments: 2 },
      { day: 'Sat', date: '2026-11-14', deployments: 1 },
      { day: 'Sun', date: '2026-11-15', deployments: 0 },
    ],
    services: [],
    recentIncidents: [],
  },
}

describe('Dashboard', () => {
  beforeEach(() => {
    localStorage.setItem('opsboard_token', 'test-jwt-token')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(dashboardResponse),
      })
    )
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.unstubAllGlobals()
  })

  it('renders the dashboard heading', async () => {
    render(<Dashboard />)

    expect(
      await screen.findByRole('heading', { name: 'Overview' })
    ).toBeInTheDocument()
  })

  it('renders the deployment activity section', async () => {
    render(<Dashboard />)

    expect(
      await screen.findByText('Deployment Activity')
    ).toBeInTheDocument()
  })

  it('renders infrastructure health information', async () => {
    render(<Dashboard />)

    expect(
      await screen.findByText('Infrastructure Health')
    ).toBeInTheDocument()

    expect(
      (await screen.findAllByText('Operational')).length
    ).toBeGreaterThan(0)

    expect(
      screen.getAllByText('Degraded').length
    ).toBeGreaterThan(0)

    expect(
      screen.getAllByText('Down').length
    ).toBeGreaterThan(0)
  })

  it('renders the service health section', async () => {
    render(<Dashboard />)

    expect(
      await screen.findByText('Service Health')
    ).toBeInTheDocument()
  })

  it('renders the recent incidents section', async () => {
    render(<Dashboard />)

    expect(
      await screen.findByText('Recent Incidents')
    ).toBeInTheDocument()
  })
})

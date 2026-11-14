
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import {
  apiRequest,
  getToken,
  saveToken,
  clearToken,
} from './services/api'

vi.mock('./services/api', () => ({
  apiRequest: vi.fn(),
  getToken: vi.fn(),
  saveToken: vi.fn(),
  clearToken: vi.fn(),
}))

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

describe('OpsBoard Application', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    localStorage.clear()
    sessionStorage.clear()

    getToken.mockReturnValue(null)

    apiRequest.mockResolvedValue({
      token: 'test-jwt-token',
      user: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
      },
    })

    saveToken.mockImplementation((token) => {
      localStorage.setItem('opsboard_token', token)
      sessionStorage.setItem('opsboard_token', token)
    })

    clearToken.mockImplementation(() => {
      localStorage.removeItem('opsboard_token')
      sessionStorage.removeItem('opsboard_token')
    })

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

  it('shows the login page when the application starts', async () => {
    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: /sign in to opsboard/i,
      })
    ).toBeInTheDocument()

    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('allows a user to log in and access the dashboard', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'test@example.com'
    )

    await user.type(
      screen.getByPlaceholderText('Enter your password'),
      'OpsBoard@123'
    )

    await user.click(
      screen.getByRole('button', { name: /sign in/i })
    )

    expect(
      await screen.findByRole('heading', { name: 'Overview' })
    ).toBeInTheDocument()

    expect(apiRequest).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'OpsBoard@123',
      }),
    })

    expect(saveToken).toHaveBeenCalledWith(
      'test-jwt-token',
      true
    )
  })

  it('allows navigation to the incidents page', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'test@example.com'
    )

    await user.type(
      screen.getByPlaceholderText('Enter your password'),
      'OpsBoard@123'
    )

    await user.click(
      screen.getByRole('button', { name: /sign in/i })
    )

    const navigation = await screen.findByRole('navigation')

    await user.click(
      within(navigation).getByText('Incidents')
    )

    expect(
      await screen.findByText('Incident Management')
    ).toBeInTheDocument()
  })

  it('allows a user to log out and return to login', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'test@example.com'
    )

    await user.type(
      screen.getByPlaceholderText('Enter your password'),
      'OpsBoard@123'
    )

    await user.click(
      screen.getByRole('button', { name: /sign in/i })
    )

    expect(
      await screen.findByRole('heading', { name: 'Overview' })
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /profile|administrator/i })
    )

    await user.click(
      screen.getByRole('menuitem', { name: /sign out/i })
    )

    expect(clearToken).toHaveBeenCalled()

    expect(
      await screen.findByRole('heading', {
        name: /sign in to opsboard/i,
      })
    ).toBeInTheDocument()
  })
})

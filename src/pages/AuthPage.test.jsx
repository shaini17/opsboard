
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthPage from './AuthPage'
import { apiRequest } from '../services/api'

vi.mock('../services/api', () => ({
  apiRequest: vi.fn(),
}))

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the login form', () => {
    render(<AuthPage onLogin={vi.fn()} />)

    expect(
      screen.getByRole('heading', { name: /sign in to opsboard/i })
    ).toBeInTheDocument()

    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
  })

  it('shows an error for an invalid email address', async () => {
    const user = userEvent.setup()

    render(<AuthPage onLogin={vi.fn()} />)

    const emailInput = screen.getByPlaceholderText('you@example.com')

    await user.type(emailInput, 'invalid-email')

    await user.type(
      screen.getByPlaceholderText('Enter your password'),
      'password123'
    )

    emailInput.setAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please enter a valid email address.'
    )

    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('rejects passwords shorter than 8 characters', async () => {
    const user = userEvent.setup()

    render(<AuthPage onLogin={vi.fn()} />)

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'test@example.com'
    )

    await user.type(
      screen.getByPlaceholderText('Enter your password'),
      '12345'
    )

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Password must contain at least 8 characters.'
    )

    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('calls onLogin with the backend response and normalized email', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()

    apiRequest.mockResolvedValue({
      token: 'test-jwt-token',
      user: {
        id: 1,
        name: 'Shaini Sharma',
        email: 'shaini@example.com',
      },
    })

    render(<AuthPage onLogin={onLogin} />)

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'Shaini@Example.com'
    )

    await user.type(
      screen.getByPlaceholderText('Enter your password'),
      'OpsBoard@123'
    )

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(apiRequest).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'shaini@example.com',
        password: 'OpsBoard@123',
      }),
    })

    expect(onLogin).toHaveBeenCalledWith({
      user: {
        id: 1,
        name: 'Shaini Sharma',
        email: 'shaini@example.com',
      },
      token: 'test-jwt-token',
      remember: true,
    })
  })

  it('allows the user to disable Remember me', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()

    apiRequest.mockResolvedValue({
      token: 'test-jwt-token',
      user: {
        id: 1,
        name: 'Shaini Sharma',
        email: 'shaini@example.com',
      },
    })

    render(<AuthPage onLogin={onLogin} />)

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'shaini@example.com'
    )

    await user.type(
      screen.getByPlaceholderText('Enter your password'),
      'OpsBoard@123'
    )

    await user.click(
      screen.getByRole('checkbox', { name: /remember me/i })
    )

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(onLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'test-jwt-token',
        remember: false,
      })
    )
  })
})

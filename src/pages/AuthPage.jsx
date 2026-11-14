
import { useState } from 'react'
import {
  Activity,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Server,
  CheckCircle2,
} from 'lucide-react'

import { apiRequest } from '../services/api'

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  function updateField(e) {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }))
    setError('')
    setSuccess('')
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setSuccess('')
    setShowPassword(false)
    setShowConfirm(false)
    setForm({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const email = form.email.trim().toLowerCase()

    if (mode === 'register' && !form.name.trim()) {
      setError('Please enter your full name.')
      return
    }

    if (mode === 'register' && form.name.trim().length > 100) {
      setError('Name cannot exceed 100 characters.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (mode === 'register') {
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match.')
        return
      }

      if (new TextEncoder().encode(form.password).length > 72) {
        setError('Password is too long. Maximum is 72 bytes.')
        return
      }
    }

    setLoading(true)

    try {
      if (mode === 'register') {
        const data = await apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name.trim(),
            email,
            password: form.password,
          }),
        })

        setSuccess(
          data.message || 'Registration successful. You can now sign in.'
        )
        setMode('login')
        setForm((previous) => ({
          ...previous,
          name: '',
          email,
          password: '',
          confirmPassword: '',
        }))
        setShowPassword(false)
        setShowConfirm(false)
        return
      }

      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: form.password,
        }),
      })

      onLogin({
        user: data.user,
        token: data.token,
        remember,
      })
    } catch (error) {
      setError(error.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#14233D] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -bottom-48 -left-32 h-[500px] w-[500px] rounded-full border border-white/10" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="rounded-xl bg-blue-600 p-2.5">
            <Activity size={25} />
          </div>
          <span className="text-2xl font-bold tracking-tight">OpsBoard</span>
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-xs font-medium text-blue-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Cloud Operations Platform
          </div>

          <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
            Take control of your infrastructure.
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
            Monitor services, manage incidents, track deployments and keep
            your operations running smoothly from one central platform.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4">
            {[
              { icon: Server, title: 'Service Monitoring', desc: 'Infrastructure visibility' },
              { icon: ShieldCheck, title: 'Incident Management', desc: 'Operational control' },
              { icon: Activity, title: 'Deployment Tracking', desc: 'Release management' },
              { icon: CheckCircle2, title: 'Team Operations', desc: 'Centralized workflows' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <Icon size={21} className="text-blue-400" />
                  <p className="mt-3 text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-400">
          OpsBoard Cloud Operations Platform · v1.0.0
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="rounded-xl bg-blue-600 p-2.5 text-white">
              <Activity size={24} />
            </div>
            <span className="text-2xl font-bold text-slate-900">OpsBoard</span>
          </div>

          <div>
            <p className="text-sm font-semibold text-blue-600">
              {isLogin ? 'WELCOME BACK' : 'GET STARTED'}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {isLogin ? 'Sign in to OpsBoard' : 'Create your account'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {isLogin
                ? 'Enter your credentials to access your operations dashboard.'
                : 'Register to start managing your cloud operations.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {!isLogin && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Full name
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={updateField}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={updateField}
                  placeholder="Enter your password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={updateField}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((previous) => !previous)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {isLogin && (
              <div className="flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                  />
                  Remember me
                </label>
                <span className="text-xs text-slate-400">Forgot password? Coming soon</span>
              </div>
            )}

            {error && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                onClick={() => switchMode(isLogin ? 'register' : 'login')}
                disabled={loading}
                className="ml-1 font-semibold text-blue-600 hover:text-blue-700"
              >
                {isLogin ? 'Create account' : 'Sign in'}
              </button>
            </p>
          </div>

          <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={15} />
            OpsBoard Cloud Operations Platform
          </div>
        </div>
      </section>
    </div>
  )
}

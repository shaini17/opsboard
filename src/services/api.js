const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const TOKEN_KEY = 'opsboard_token'

export function saveToken(token, remember = true) {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)

  const storage = remember ? localStorage : sessionStorage
  storage.setItem(TOKEN_KEY, token)
}

export function getToken() {
  return (
    localStorage.getItem(TOKEN_KEY) ||
    sessionStorage.getItem(TOKEN_KEY)
  )
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

export async function apiRequest(path, options = {}) {
  const { token, ...fetchOptions } = options

  const headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
    })
  } catch {
    throw new Error(
      'Unable to connect to the OpsBoard server. Please check whether the backend is running.'
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong')
  }

  return data
}

import { mockFetch } from './mock/server'

// Set NEXT_PUBLIC_API_MODE=live once the Express backend + MySQL are running.
// Until then every request is answered by the in-browser demo API.
export const API_MODE = process.env.NEXT_PUBLIC_API_MODE === 'live' ? 'live' : 'demo'

async function liveFetch(path, options) {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }
  if (!response.ok) {
    const error = new Error((payload && payload.error) || 'Request failed')
    error.status = response.status
    throw error
  }
  return payload
}

export function apiFetch(path, options = {}) {
  return API_MODE === 'live' ? liveFetch(path, options) : mockFetch(path, options)
}

export const fetcher = (path) => apiFetch(path)

export function apiSend(path, method, body) {
  return apiFetch(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })
}

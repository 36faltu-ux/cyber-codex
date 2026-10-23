const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '')

export function isApiConfigured() {
  return Boolean(apiBaseUrl)
}

/**
 * Small JSON API wrapper for backend integration.
 * Call as apiRequest('path', { method: 'POST', body: { ... } }).
 * Authentication and concrete endpoint contracts should be added once the
 * backend owner defines them; never put a private key in this browser client.
 */
export async function apiRequest(path, { method = 'GET', body, headers = {}, signal } = {}) {
  if (!apiBaseUrl) {
    throw new Error('Backend is not configured. Set VITE_API_BASE_URL in .env.local.')
  }

  const requestHeaders = new Headers(headers)
  if (!requestHeaders.has('Accept')) requestHeaders.set('Accept', 'application/json')
  const requestBody = body === undefined ? undefined : JSON.stringify(body)
  if (requestBody !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${apiBaseUrl}/${String(path).replace(/^\/+/, '')}`, {
    method,
    headers: requestHeaders,
    body: requestBody,
    signal,
  })

  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  const result = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message = typeof result === 'object' && result !== null && 'message' in result
      ? result.message
      : `Backend request failed (${response.status})`
    throw new Error(message)
  }

  return result
}

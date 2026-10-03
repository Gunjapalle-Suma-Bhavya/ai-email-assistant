/**
 * Central API Client with JWT Bearer Token Injection
 */

const BASE_URL = '/api';

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('aether_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    // Expired or invalid token
    localStorage.removeItem('aether_token');
    localStorage.removeItem('aether_user');
    if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup') && window.location.pathname !== '/') {
      window.location.href = '/login?expired=1';
    }
  }

  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  return null;
}

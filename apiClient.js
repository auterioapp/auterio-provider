import * as SecureStore from 'expo-secure-store';
import { API_URL } from './constants';

let refreshPromise = null;
let authFailureHandler = null;

export const setAuthFailureHandler = handler => { authFailureHandler = handler; };

// The server rejected the refresh token — as opposed to a network problem, which
// must never sign the provider out.
const isAuthRejection = (error) => [400, 401, 403].includes(error?.status) || error?.message === 'No refresh token';

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = await SecureStore.getItemAsync('providerRefreshToken');
    if (!refreshToken) throw new Error('No refresh token');
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.token) {
      const error = new Error(data.error || 'Session expired');
      error.status = response.ok ? 401 : response.status;
      throw error;
    }
    await Promise.all([
      SecureStore.setItemAsync('providerToken', data.token),
      SecureStore.setItemAsync('providerRefreshToken', data.refreshToken),
    ]);
    return data.token;
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function request(url, options, token) {
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export async function authorizedFetch(url, options = {}) {
  let token = await SecureStore.getItemAsync('providerToken');
  let response = await request(url, options, token);
  if (response.status === 401) {
    try {
      token = await refreshAccessToken();
      response = await request(url, options, token);
    } catch (error) {
      if (isAuthRejection(error)) {
        await Promise.all([
          SecureStore.deleteItemAsync('providerToken'),
          SecureStore.deleteItemAsync('providerRefreshToken'),
        ]);
        authFailureHandler?.();
      }
    }
  }
  return response;
}

export async function fetchJson(url, options = {}) {
  const response = await authorizedFetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(data?.error || data?.message || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

import * as SecureStore from 'expo-secure-store';
import { API_URL } from './constants';

let _authToken = null;
let _refreshToken = null;
let _onAuthFailure = null;
let _refreshPromise = null;

async function tryRefreshToken() {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: _refreshToken }),
      });
      if (!res.ok) throw new Error('Refresh failed');
      const data = await res.json();
      _authToken = data.token;
      _refreshToken = data.refreshToken;
      await SecureStore.setItemAsync('providerToken', data.token);
      await SecureStore.setItemAsync('providerRefreshToken', data.refreshToken);
      return true;
    } catch {
      _onAuthFailure?.();
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}

function parseResponse(text, contentType, status) {
  if (!text) return null;
  if (!contentType.includes('application/json')) throw new Error(`Expected JSON, received ${contentType || 'unknown content type'}`);
  return JSON.parse(text);
}

async function fetchJson(url, options = {}) {
  const makeHeaders = () => ({
    ...(options.headers || {}),
    ...(_authToken && _authToken !== 'logged_in' ? { Authorization: `Bearer ${_authToken}` } : {}),
  });

  const response = await fetch(url, { ...options, headers: makeHeaders() });
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';

  // Auto-refresh on 401
  if (response.status === 401 && _refreshToken) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const retry = await fetch(url, { ...options, headers: makeHeaders() });
      const retryText = await retry.text();
      const retryCT = retry.headers.get('content-type') || '';
      if (!retry.ok) {
        const payload = retryText ? JSON.parse(retryText) : {};
        const e = new Error(payload.error || payload.message || `Request failed: ${retry.status}`);
        e.status = retry.status;
        throw e;
      }
      return parseResponse(retryText, retryCT, retry.status);
    }
    return null;
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    if (contentType.includes('application/json') && text) {
      const payload = JSON.parse(text);
      message = payload.error || payload.message || message;
    } else if (text) {
      message = `${message} ${text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`;
    }
    const e = new Error(message);
    e.status = response.status;
    throw e;
  }
  return parseResponse(text, contentType, response.status);
}

export function setAuthToken(token) {
  _authToken = token;
}

export function setRefreshToken(token) {
  _refreshToken = token;
}

export function setOnAuthFailure(fn) {
  _onAuthFailure = fn;
}

export { fetchJson };

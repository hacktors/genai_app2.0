import axios from 'axios';

const apiBaseURL = (import.meta.env?.VITE_BACKEND_URL || '').replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: apiBaseURL
});

const stringifyErrorValue = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const messages = value
      .map((entry) => stringifyErrorValue(entry, ''))
      .filter(Boolean);
    return messages.length ? messages.join(' ') : fallback;
  }
  if (typeof value === 'object') {
    if (value.message) return stringifyErrorValue(value.message, fallback);
    if (value.error) return stringifyErrorValue(value.error, fallback);
    if (value.code) return stringifyErrorValue(value.code, fallback);

    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
};

export const getApiErrorMessage = (error, fallback = 'Request failed.') => {
  const payload = error?.response?.data;
  return stringifyErrorValue(payload?.error ?? payload?.message ?? payload ?? error?.message, fallback);
};

const getStoredToken = () => {
  try {
    const storedUser = localStorage.getItem('userContext');
    if (!storedUser) return null;
    const user = JSON.parse(storedUser);
    return user?.token || null;
  } catch {
    localStorage.removeItem('userContext');
    return null;
  }
};

api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token && !config.headers?.Authorization) {
    config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;

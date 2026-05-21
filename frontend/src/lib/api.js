import axios from 'axios';

const api = axios.create();

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

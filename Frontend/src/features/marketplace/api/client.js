const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = async (endpoint, { method = 'GET', body, headers = {}, isFormData = false } = {}) => {
  const token = localStorage.getItem('token') || localStorage.getItem('cc_token');
  const devUser = localStorage.getItem('devUser') || localStorage.getItem('cc_user');

  const defaultHeaders = {};
  if (!isFormData) {
    defaultHeaders['Content-Type'] = 'application/json';
  }
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  } else if (devUser) {
    defaultHeaders['x-dev-user'] = devUser;
  }

  const config = {
    method,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  };

  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.error?.message || response.statusText || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

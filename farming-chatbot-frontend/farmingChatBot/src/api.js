// api.js - shared axios client for the FastAPI backend
import axios from 'axios';

const TOKEN_KEY = 'farmbot_token';
const USER_KEY = 'farmbot_username';
const NAME_KEY = 'farmbot_name';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
});

// Attach the login token to every request when we have one.
api.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getSession = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USER_KEY);
  const name = localStorage.getItem(NAME_KEY) || username;
  return token ? { token, username, name } : null;
};

export const saveSession = ({ token, username, name }) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, username);
  localStorage.setItem(NAME_KEY, name || username);
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(NAME_KEY);
};

// Log in and return the session data; used by both the login and signup pages.
export const logIn = async (username, password) => {
  const res = await api.post('/login', { username, password });
  return { token: res.data.access_token, username: res.data.username, name: res.data.name };
};

// Turn an axios error into a message we can show the user.
export const getErrorMessage = (err) => {
  if (!err.response) {
    if (err.code === 'ECONNABORTED') {
      return 'The server took too long to respond. Please try again.';
    }
    return 'Cannot reach the server. Check your connection and make sure the backend is running.';
  }
  const detail = err.response.data?.detail;
  if (typeof detail === 'string') {
    return detail;
  }
  // FastAPI validation errors (422) return a list of problems.
  if (Array.isArray(detail) && detail.length > 0) {
    const { loc, msg } = detail[0];
    const field = loc?.[loc.length - 1];
    return field ? `${field}: ${msg}` : msg;
  }
  return 'Something went wrong. Please try again.';
};

export default api;

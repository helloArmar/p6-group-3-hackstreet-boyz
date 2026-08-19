import axios from 'axios';

const TOKEN_KEY = 'rentease_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach the JWT to every request rather than threading it through each caller.
client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 means the token is gone, expired, or the account was deactivated.
    // Drop it and let the router bounce the user to /login.
    if (error.response?.status === 401 && getToken()) {
      clearToken();
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }

    // Normalise every failure into a plain Error carrying the API's message.
    const message =
      error.response?.data?.message || error.message || 'Something went wrong. Try again.';
    const normalised = new Error(message);
    normalised.status = error.response?.status;
    return Promise.reject(normalised);
  },
);

export default client;

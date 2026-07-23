import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send the httpOnly refresh-token cookie
});

let accessToken = null;
let isRefreshing = false;
let refreshQueue = [];

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't try to refresh on the auth endpoints themselves
    const isAuthRoute = originalRequest.url?.includes('/auth/');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthRoute
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Queue this request until the in-flight refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject, originalRequest });
        });
      }

      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh-token');
        setAccessToken(data.accessToken);

        refreshQueue.forEach(({ resolve, originalRequest: queuedReq }) => {
          queuedReq.headers.Authorization = `Bearer ${data.accessToken}`;
          resolve(api(queuedReq));
        });
        refreshQueue = [];

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        refreshQueue.forEach(({ reject }) => reject(refreshError));
        refreshQueue = [];
        setAccessToken(null);
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

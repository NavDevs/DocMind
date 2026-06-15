import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL
        ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/api`
        : '/api',
    timeout: 60000,
});

// Auto-attach JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('docmind_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle auth errors globally
api.interceptors.response.use(
    (res) => res,
    (err) => {
        const url = err.config?.url || '';
        // Only trigger global logout for non-auth endpoints
        if (err.response?.status === 401 && !url.includes('/auth/')) {
            localStorage.removeItem('docmind_token');
            localStorage.removeItem('docmind_user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export default api;

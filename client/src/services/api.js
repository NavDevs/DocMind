import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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
        if (err.response?.status === 401) {
            localStorage.removeItem('docmind_token');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export default api;

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { auth, googleProvider, signInWithPopup, signOut, isConfigured } from '../services/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // Seed user from cache so the UI is never blocked waiting for /auth/me
    const [user, setUser] = useState(() => {
        try {
            const cached = localStorage.getItem('docmind_user');
            return cached ? JSON.parse(cached) : null;
        } catch { return null; }
    });
    const [token, setToken] = useState(() => localStorage.getItem('docmind_token'));
    const [loading, setLoading] = useState(!localStorage.getItem('docmind_token')); // only show spinner when there's no cached token

    // Restore / validate session on mount — runs in background, does NOT block UI
    useEffect(() => {
        if (!token) { setLoading(false); return; }

        api.get('/auth/me')
            .then(({ data }) => {
                setUser(data.user);
                localStorage.setItem('docmind_user', JSON.stringify(data.user));
            })
            .catch(() => {
                localStorage.removeItem('docmind_token');
                localStorage.removeItem('docmind_user');
                setToken(null);
                setUser(null);
            })
            .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // run once on mount only

    // Email/password login
    const login = (userData, jwt) => {
        localStorage.setItem('docmind_token', jwt);
        localStorage.setItem('docmind_user', JSON.stringify(userData));
        setToken(jwt);
        setUser(userData);
    };

    // Google Sign-in via Firebase — optimised: popup + parallel token exchange
    const loginWithGoogle = async () => {
        if (!isConfigured) throw new Error('Firebase is not configured. Add VITE_FIREBASE_* to client/.env');

        // 1. Open Google popup
        const result = await signInWithPopup(auth, googleProvider);

        // 2. Get Firebase ID token (uses cached token if still valid — very fast)
        const firebaseToken = await result.user.getIdToken();

        // 3. Exchange for our app JWT
        const { data } = await api.post('/auth/firebase', null, {
            headers: { Authorization: `Bearer ${firebaseToken}` },
        });

        // 4. Persist session
        localStorage.setItem('docmind_token', data.token);
        localStorage.setItem('docmind_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);

        return data.user;
    };

    const logout = async () => {
        localStorage.removeItem('docmind_token');
        localStorage.removeItem('docmind_user');
        setToken(null);
        setUser(null);
        if (isConfigured && auth) {
            try { await signOut(auth); } catch { /* ignore */ }
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, loginWithGoogle, isAuthenticated: !!user, isFirebaseConfigured: isConfigured }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};


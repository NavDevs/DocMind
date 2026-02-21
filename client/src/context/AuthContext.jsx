import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { auth, googleProvider, signInWithPopup, signOut, isConfigured } from '../services/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('docmind_token'));
    const [loading, setLoading] = useState(true);

    // Restore session on mount
    useEffect(() => {
        const restore = async () => {
            if (token) {
                try {
                    const { data } = await api.get('/auth/me');
                    setUser(data.user);
                } catch {
                    localStorage.removeItem('docmind_token');
                    setToken(null);
                }
            }
            setLoading(false);
        };
        restore();
    }, [token]);

    // Email/password login
    const login = (userData, jwt) => {
        localStorage.setItem('docmind_token', jwt);
        setToken(jwt);
        setUser(userData);
    };

    // Google Sign-in via Firebase
    const loginWithGoogle = async () => {
        if (!isConfigured) throw new Error('Firebase is not configured. Add VITE_FIREBASE_* to client/.env');

        try {
            // 1. Sign in via Google popup
            const result = await signInWithPopup(auth, googleProvider);
            const firebaseToken = await result.user.getIdToken();

            // 2. Exchange Firebase ID token for our app's JWT
            const { data } = await api.post('/auth/firebase', null, {
                headers: { Authorization: `Bearer ${firebaseToken}` },
            });

            // 3. Store and set session
            localStorage.setItem('docmind_token', data.token);
            setToken(data.token);
            setUser(data.user);

            return data.user;
        } catch (err) {
            throw err;
        }
    };

    const logout = async () => {
        localStorage.removeItem('docmind_token');
        setToken(null);
        setUser(null);
        // Sign out of Firebase too (no-op if not configured)
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

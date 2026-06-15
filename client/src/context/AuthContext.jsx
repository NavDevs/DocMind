import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { auth, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, isConfigured } from '../services/firebase';

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
        const initializeAuth = async () => {
            // 1. Check if we just returned from a Google Redirect
            if (isConfigured && auth) {
                try {
                    const result = await getRedirectResult(auth);
                    if (result) {
                        const firebaseToken = await result.user.getIdToken();
                        const { data } = await api.post('/auth/firebase', null, {
                            headers: { Authorization: `Bearer ${firebaseToken}` },
                        });
                        localStorage.setItem('docmind_token', data.token);
                        localStorage.setItem('docmind_user', JSON.stringify(data.user));
                        setToken(data.token);
                        setUser(data.user);
                        setLoading(false);
                        window.location.href = '/documents';
                        return; // Stop here, redirect takes over
                    }
                } catch (err) {
                    console.error('Firebase redirect error:', err);
                }
            }

            // 2. Standard Session Restore
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
        };

        initializeAuth();
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

        try {
            // 1. Try Google popup
            const result = await signInWithPopup(auth, googleProvider);

            // 2. Get Firebase ID token
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
        } catch (error) {
            console.error('Google Popup failed:', error.code || error.message);
            // If popup is blocked by COOP headers or stuck in a bad nonce state, seamlessly fallback to redirect
            if (
                error.code === 'auth/missing-or-invalid-nonce' ||
                error.message.includes('Duplicate credential') ||
                error.code === 'auth/popup-closed-by-user' ||
                error.code === 'auth/cross-origin-opener-policy-failed'
            ) {
                console.warn('Falling back to Google Redirect...');
                await signInWithRedirect(auth, googleProvider);
                // execution stops here as the browser navigates away
                return new Promise(() => {}); // never resolves, preventing UI flash
            }
            throw error; // throw other errors to be caught by the UI
        }
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


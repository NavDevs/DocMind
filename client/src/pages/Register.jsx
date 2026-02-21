import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import './Auth.css';

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const { login, loginWithGoogle, isFirebaseConfigured } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.post('/auth/register', form);
            login(data.user, data.token);
            toast.success('Account created! Welcome to DocMind 🎉');
            navigate('/documents');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        try {
            const user = await loginWithGoogle();
            toast.success(`Account created! Welcome, ${user.name}! 🎉`);
            navigate('/documents');
        } catch (err) {
            toast.error(err.message || 'Google sign-in failed');
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card glass-card animate-fade-up">
                <div className="auth-header">
                    <div className="auth-icon">🚀</div>
                    <h2>Get started free</h2>
                    <p>Create your DocMind account</p>
                </div>

                {isFirebaseConfigured && (
                    <>
                        <button
                            className="btn btn-google w-full"
                            onClick={handleGoogleLogin}
                            disabled={googleLoading}
                        >
                            {googleLoading ? <span className="spinner" /> : (
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
                                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                                </svg>
                            )}
                            Sign up with Google
                        </button>
                        <div className="auth-divider"><span>or create an account with email</span></div>
                    </>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="John Doe"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="Min. 6 characters"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
                        {loading ? <><span className="spinner" /> Creating account...</> : 'Create Account →'}
                    </button>
                </form>
                <p className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

    // Close mobile menu on route change
    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);

    // Prevent body scroll when menu is open
    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [menuOpen]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link to="/" className="navbar-brand">
                    <span className="brand-icon">🧠</span>
                    <span className="brand-text">Doc<span className="text-gradient">Mind</span></span>
                </Link>

                {/* Desktop Links */}
                <div className="navbar-links desktop-links">
                    {isAuthenticated ? (
                        <>
                            <Link to="/documents" className={isActive('/documents')}>Documents</Link>
                            <Link to="/analytics" className={isActive('/analytics')}>Analytics</Link>
                            <div className="navbar-user">
                                <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
                                <span className="user-name">{user?.name}</span>
                            </div>
                            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className={isActive('/login')}>Sign In</Link>
                            <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
                        </>
                    )}
                </div>

                {/* Hamburger Button (mobile only) */}
                <button
                    className={`hamburger ${menuOpen ? 'open' : ''}`}
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle menu"
                    aria-expanded={menuOpen}
                >
                    <span />
                    <span />
                    <span />
                </button>
            </div>

            {/* Mobile Drawer Overlay */}
            {menuOpen && <div className="mobile-overlay" onClick={() => setMenuOpen(false)} />}

            {/* Mobile Drawer */}
            <div className={`mobile-drawer ${menuOpen ? 'open' : ''}`}>
                <div className="mobile-drawer-header">
                    <Link to="/" className="navbar-brand">
                        <span className="brand-icon">🧠</span>
                        <span className="brand-text">Doc<span className="text-gradient">Mind</span></span>
                    </Link>
                    <button className="drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">✕</button>
                </div>

                <div className="mobile-nav-links">
                    {isAuthenticated ? (
                        <>
                            <div className="mobile-user-info">
                                <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
                                <span>{user?.name}</span>
                            </div>
                            <Link to="/documents" className={isActive('/documents')}>📄 Documents</Link>
                            <Link to="/analytics" className={isActive('/analytics')}>📊 Analytics</Link>
                            <button className="btn btn-secondary w-full" onClick={handleLogout}>Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-secondary w-full">Sign In</Link>
                            <Link to="/register" className="btn btn-primary w-full">Get Started →</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

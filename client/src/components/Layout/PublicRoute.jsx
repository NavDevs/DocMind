import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * PublicRoute — wraps pages that should only be visible to guests.
 * If the user is already authenticated, redirect them to /documents.
 * Shows a spinner while the auth state is still loading (prevents flash).
 */
export default function PublicRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '100vh' }}>
                <div className="spinner spinner-lg" />
            </div>
        );
    }

    return isAuthenticated ? <Navigate to="/documents" replace /> : children;
}

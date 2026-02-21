import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '100vh' }}>
                <div className="spinner spinner-lg" />
            </div>
        );
    }

    return isAuthenticated ? children : <Navigate to="/login" replace />;
}

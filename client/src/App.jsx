import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Layout/Navbar';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import PublicRoute from './components/Layout/PublicRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Documents from './pages/Documents';
import ChatPage from './pages/ChatPage';
import AnalyticsPage from './pages/AnalyticsPage';

export default function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <BrowserRouter>
                    <Navbar />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                        <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
                        <Route path="/chat/:documentId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            style: {
                                background: 'var(--bg-surface-container)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                            },
                        }}
                    />
                </BrowserRouter>
            </ThemeProvider>
        </AuthProvider>
    );
}

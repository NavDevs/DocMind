import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import api from '../services/api';
import toast from 'react-hot-toast';
import './AnalyticsPage.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const StatCard = ({ icon, label, value, sub }) => (
    <div className="stat-card glass-card">
        <div className="stat-card-icon">{icon}</div>
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-label">{label}</div>
        {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
);

export default function AnalyticsPage() {
    const [stats, setStats] = useState(null);
    const [recentDocs, setRecentDocs] = useState([]);
    const [daily, setDaily] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [dashRes, dailyRes] = await Promise.all([
                    api.get('/analytics/dashboard'),
                    api.get('/analytics/usage/daily'),
                ]);
                setStats(dashRes.data.stats);
                // recentDocuments is at the top-level of the response, not inside stats
                setRecentDocs(dashRes.data.recentDocuments || []);
                setDaily(dailyRes.data.daily);
            } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to load analytics');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const chartData = {
        labels: daily.map(d => {
            const date = new Date(d._id);
            return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
        }),
        datasets: [
            {
                label: 'Queries',
                data: daily.map(d => d.count),
                fill: true,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99,102,241,0.12)',
                pointBackgroundColor: '#818cf8',
                pointRadius: 4,
                tension: 0.4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#0d1427',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                titleColor: '#f1f5f9',
                bodyColor: '#94a3b8',
            },
        },
        scales: {
            x: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#94a3b8', font: { size: 11 } },
            },
            y: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#94a3b8', font: { size: 11 } },
                beginAtZero: true,
            },
        },
    };

    if (loading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner spinner-lg" /></div>;

    return (
        <div className="analytics-page page-content">
            <div className="page-container">
                <div className="analytics-header">
                    <div>
                        <h2>Usage Analytics</h2>
                        <p>Track your DocMind activity and API usage.</p>
                    </div>
                    <Link to="/documents" className="btn btn-secondary btn-sm">← Documents</Link>
                </div>

                {/* Stats Grid */}
                <div className="stats-grid">
                    <StatCard icon="📄" label="Documents Uploaded" value={stats?.totalDocuments ?? 0} />
                    <StatCard icon="💬" label="Total Queries" value={stats?.totalQueries ?? 0} />
                    <StatCard icon="🔢" label="Tokens Used" value={(stats?.totalTokens ?? 0).toLocaleString()} sub="OpenAI tokens" />
                    <StatCard icon="⚡" label="Avg Response" value={stats?.avgResponseMs ? `${stats.avgResponseMs}ms` : '—'} sub="per query" />
                </div>

                {/* Daily Chart */}
                <div className="chart-section glass-card">
                    <h3>Queries — Last 30 Days</h3>
                    {daily.length > 0 ? (
                        <div className="chart-wrapper">
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="icon">📊</div>
                            <p>No query data yet. Start chatting with a document!</p>
                            <Link to="/documents" className="btn btn-primary btn-sm mt-4">Go to Documents</Link>
                        </div>
                    )}
                </div>

                {/* Recent Documents */}
                {recentDocs.length > 0 && (
                    <div className="recent-section">
                        <h3>Recent Documents</h3>
                        <div className="recent-list">
                            {recentDocs.map(doc => (
                                <div key={doc._id} className="recent-item glass-card">
                                    <span className="recent-icon">📄</span>
                                    <span className="recent-name">{doc.originalName}</span>
                                    <span className={`badge badge-${doc.status}`}>{doc.status}</span>
                                    <span className="recent-date">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                    {doc.status === 'ready' && (
                                        <Link to={`/chat/${doc._id}`} className="btn btn-primary btn-sm">Chat</Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

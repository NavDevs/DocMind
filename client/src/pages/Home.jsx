import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const features = [
    { icon: '📄', title: 'Upload PDF', desc: 'Drag & drop any PDF — research papers, reports, contracts, books.' },
    { icon: '🔍', title: 'Semantic Search', desc: 'AI embeddings find contextually relevant chunks, not just keywords.' },
    { icon: '🤖', title: 'GPT-4o Answers', desc: 'Get precise, grounded answers synthesized from your document.' },
    { icon: '📌', title: 'Source Highlight', desc: 'Every answer shows the exact document section it came from.' },
    { icon: '📊', title: 'Confidence Score', desc: 'Know how confident the AI is based on similarity scores.' },
    { icon: '🔒', title: 'Private & Secure', desc: 'JWT-authenticated accounts. Your documents stay yours.' },
];

export default function Home() {
    const { isAuthenticated } = useAuth();

    return (
        <div className="home-page">
            {/* Hero */}
            <section className="hero-section">
                <div className="page-container">
                    <div className="hero-content animate-fade-up">
                        <div className="hero-badge">🧠 RAG-Powered Document Intelligence</div>
                        <h1>
                            Chat with your <br />
                            <span className="text-gradient">PDF Documents</span>
                        </h1>
                        <p className="hero-subtitle">
                            Upload any PDF and have a conversation with it. DocMind uses Retrieval-Augmented Generation
                            to find exactly what you need — with sources and confidence scores.
                        </p>
                        <div className="hero-actions">
                            {isAuthenticated ? (
                                <Link to="/documents" className="btn btn-primary btn-lg">Go to Documents →</Link>
                            ) : (
                                <>
                                    <Link to="/register" className="btn btn-primary btn-lg">Start for Free →</Link>
                                    <Link to="/login" className="btn btn-secondary btn-lg">Sign In</Link>
                                </>
                            )}
                        </div>
                        <div className="hero-stats">
                            <div className="stat"><span className="stat-value">RAG</span><span className="stat-label">Architecture</span></div>
                            <div className="stat-divider" />
                            <div className="stat"><span className="stat-value">GPT-4o</span><span className="stat-label">Powered</span></div>
                            <div className="stat-divider" />
                            <div className="stat"><span className="stat-value">∞</span><span className="stat-label">Documents</span></div>
                        </div>
                    </div>
                    <div className="hero-visual animate-fade-in">
                        <div className="chat-preview glass-card">
                            <div className="chat-preview-header">
                                <div className="preview-dots">
                                    <span style={{ background: '#ef4444' }} />
                                    <span style={{ background: '#f59e0b' }} />
                                    <span style={{ background: '#10b981' }} />
                                </div>
                                <span className="preview-title">research_paper.pdf</span>
                            </div>
                            <div className="preview-messages">
                                <div className="preview-user">What are the key findings of the study?</div>
                                <div className="preview-assistant">
                                    <div className="preview-answer">
                                        The study identifies three key findings: (1) RAG significantly outperforms fine-tuning on domain-specific QA tasks, (2) chunk size of 512 tokens yields optimal retrieval precision, and (3) cosine similarity threshold of 0.72 minimizes hallucinations. <em>[Source 1, 3]</em>
                                    </div>
                                    <div className="preview-sources">
                                        <span className="badge badge-high">● HIGH Confidence</span>
                                        <span className="preview-source-tag">📌 3 Sources</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="features-section">
                <div className="page-container">
                    <div className="section-header">
                        <h2>Everything you need to <span className="text-gradient">understand documents faster</span></h2>
                    </div>
                    <div className="features-grid">
                        {features.map((f, i) => (
                            <div key={i} className="feature-card glass-card" style={{ animationDelay: `${i * 0.08}s` }}>
                                <div className="feature-icon">{f.icon}</div>
                                <h3>{f.title}</h3>
                                <p>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="cta-section">
                <div className="page-container">
                    <div className="cta-card glass-card">
                        <h2>Ready to talk to your documents?</h2>
                        <p>Free to get started — no credit card required.</p>
                        <Link to="/register" className="btn btn-primary btn-lg animate-pulse-glow">
                            Create Free Account →
                        </Link>
                    </div>
                </div>
            </section>

            <footer className="home-footer">
                <p>© 2025 DocMind · Built with React, Node.js, OpenAI &amp; RAG</p>
            </footer>
        </div>
    );
}

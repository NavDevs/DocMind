import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import './ChatPage.css';

const formatContent = (text) => {
    if (!text) return '';
    // Strip ### markdown headers → bold text, parse **bold** text, and handle line breaks
    return text
        .split('\n')
        .map((line, i) => {
            const headerMatch = line.match(/^#{1,3}\s+(.*)/);
            if (headerMatch) {
                return <div key={i} style={{ fontWeight: 700, marginTop: i > 0 ? '0.75rem' : 0, marginBottom: '0.25rem' }}>{headerMatch[1]}</div>;
            }

            // Parse **bold** text inline
            if (line.includes('**')) {
                const parts = line.split(/(\*\*.*?\*\*)/g);
                return (
                    <div key={i}>
                        {parts.map((part, j) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={j}>{part.slice(2, -2)}</strong>;
                            }
                            return <span key={j}>{part}</span>;
                        })}
                    </div>
                );
            }

            return <div key={i}>{line || '\u00A0'}</div>;
        });
};

const SourcePanel = ({ sources }) => {
    if (!sources || sources.length === 0) return null;
    return (
        <div className="source-panel">
            <h4>📌 Sources ({sources.length})</h4>
            <div className="source-list">
                {sources.map((s, i) => (
                    <div key={i} className="source-item glass-card">
                        <div className="source-meta">
                            <span className="source-num">Source {i + 1}</span>
                            <span className="source-score">{(s.score * 100).toFixed(0)}% match</span>
                        </div>
                        <p className="source-text">{s.text.slice(0, 220)}{s.text.length > 220 ? '...' : ''}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function ChatPage() {
    const { documentId } = useParams();
    const [doc, setDoc] = useState(null);
    const [messages, setMessages] = useState([]);
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [docLoading, setDocLoading] = useState(true);
    const [activeSources, setActiveSources] = useState([]);
    const [showSources, setShowSources] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const loadDoc = async () => {
            try {
                const [docRes, histRes] = await Promise.all([
                    api.get(`/documents/${documentId}`),
                    api.get(`/chat/${documentId}/history`),
                ]);
                setDoc(docRes.data.document);
                setMessages(histRes.data.messages || []);
            } catch {
                toast.error('Failed to load document');
            } finally {
                setDocLoading(false);
            }
        };
        loadDoc();
    }, [documentId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!question.trim() || loading) return;

        const userMsg = { role: 'user', content: question, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setQuestion('');
        setLoading(true);

        try {
            const { data } = await api.post(`/chat/${documentId}`, { question: question.trim() });
            const assistantMsg = {
                role: 'assistant',
                content: data.answer,
                sources: data.sources,
                confidenceScore: data.confidenceScore,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to get answer');
            setMessages(prev => prev.slice(0, -1)); // remove optimistic user message
        } finally {
            setLoading(false);
        }
    };

    const handleClearHistory = async () => {
        if (!confirm('Clear all chat history for this document?')) return;
        try {
            await api.delete(`/chat/${documentId}/history`);
            setMessages([]);
            setActiveSources([]);
            toast.success('Chat history cleared');
        } catch {
            toast.error('Failed to clear history');
        }
    };

    if (docLoading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner spinner-lg" /></div>;

    return (
        <div className="chat-page">
            {/* Header */}
            <div className="chat-header">
                <div className="page-container flex-between">
                    <div className="flex gap-2" style={{ alignItems: 'center' }}>
                        <Link to="/documents" className="btn btn-secondary btn-sm">← Back</Link>
                        <div>
                            <div className="chat-doc-name">📄 {doc?.originalName}</div>
                            <div className="chat-doc-meta">{doc?.pageCount} pages · {doc?.chunkCount} chunks indexed</div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            className={`btn btn-secondary btn-sm ${showSources ? 'active' : ''}`}
                            onClick={() => setShowSources(!showSources)}
                        >
                            📌 Sources
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={handleClearHistory}>🗑 Clear</button>
                    </div>
                </div>
            </div>

            <div className="chat-layout">
                {/* Messages Panel */}
                <div className="messages-panel">
                    <div className="messages-scroll">
                        {messages.length === 0 && (
                            <div className="chat-empty">
                                <div style={{ fontSize: '3rem' }}>💬</div>
                                <h3>Start chatting</h3>
                                <p>Ask anything about <strong>{doc?.originalName}</strong></p>
                                {doc?.summary && (
                                    <div className="doc-summary-box glass-card">
                                        <strong>📝 Document Summary</strong>
                                        <p>{doc.summary}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`message ${msg.role} animate-fade-up`}
                                style={{ animationDelay: '0s' }}
                                onClick={() => {
                                    if (msg.role === 'assistant' && msg.sources?.length > 0) {
                                        setActiveSources(msg.sources);
                                        setShowSources(true);
                                    }
                                }}
                            >
                                <div className="message-avatar">{msg.role === 'user' ? '👤' : '🧠'}</div>
                                <div className="message-body">
                                    <div className="message-content">{msg.role === 'assistant' ? formatContent(msg.content) : msg.content}</div>
                                    {msg.role === 'assistant' && (
                                        <div className="message-footer">
                                            {msg.sources?.length > 0 && (
                                                <span className="sources-hint">📌 {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="message assistant animate-fade-up">
                                <div className="message-avatar">🧠</div>
                                <div className="message-body">
                                    <div className="typing-indicator">
                                        <span /><span /><span />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="chat-input-form">
                        <input
                            type="text"
                            className="form-input chat-input"
                            placeholder="Ask a question about this document..."
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                        <button type="submit" className="btn btn-primary" disabled={loading || !question.trim()}>
                            {loading ? <span className="spinner" /> : '→'}
                        </button>
                    </form>
                </div>

                {/* Sources Panel */}
                {showSources && (
                    <div className="sources-sidebar animate-fade-in">
                        <div className="sources-header">
                            <h4>📌 Source Context</h4>
                            <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setShowSources(false)}>✕</button>
                        </div>
                        {activeSources.length > 0 ? (
                            <SourcePanel sources={activeSources} />
                        ) : (
                            <p className="sources-hint-text">Click on an AI answer to view its source chunks.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

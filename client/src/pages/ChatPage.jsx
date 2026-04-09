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

const SourcePanel = ({ sources, onClose }) => {
    if (!sources || sources.length === 0) return null;

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Source text copied');
    };

    return (
        <div className="source-panel">
            <div className="source-header-row">
                <h4>📌 Sources ({sources.length})</h4>
                <button className="btn-close-mobile" onClick={onClose}>✕</button>
            </div>
            <div className="source-list">
                {sources.map((s, i) => (
                    <div key={i} className="source-item glass-card">
                        <div className="source-meta">
                            <span className="source-num">Source {i + 1}</span>
                            <div className="flex gap-2" style={{ alignItems: 'center' }}>
                                <span className="source-score">{(s.score * 100).toFixed(0)}% match</span>
                                <button
                                    className="btn-copy-source"
                                    onClick={() => handleCopy(s.text)}
                                    title="Copy source text"
                                >
                                    📋
                                </button>
                            </div>
                        </div>
                        <p className="source-text">{s.text}</p>
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
    const [showPdf, setShowPdf] = useState(false);
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
            } catch (err) {
                console.error('Error loading document:', err);
                if (err.response?.status === 404) {
                    toast.error('Document not found. It may have been deleted.');
                } else {
                    toast.error('Failed to load document. Please try again.');
                }
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

            // Auto-open sources if they are available
            if (data.sources?.length > 0) {
                setActiveSources(data.sources);
                // On mobile we don't necessarily want it to pop up immediately unless user asks
                // but for "making it work" and not being dummy, we'll ensure they are stored correctly.
            }
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

    const handleOpenPdf = () => {
        setShowPdf(true);
    };

    const handleClosePdf = () => {
        setShowPdf(false);
    };

    if (docLoading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner spinner-lg" /></div>;

    // Get PDF URL from document - extract relative path from storagePath
    // storagePath is like: C:\...\server\uploads\userId\uuid.pdf
    // We need: /uploads/userId/uuid.pdf
    let pdfUrl = null;
    if (doc?.storagePath) {
        const uploadsIndex = doc.storagePath.indexOf('uploads');
        if (uploadsIndex !== -1) {
            const relativePath = doc.storagePath.substring(uploadsIndex);
            pdfUrl = `/${relativePath.replace(/\\/g, '/')}`; // Convert backslashes to forward slashes
        }
    }

    return (
        <div className={`chat-page ${showSources ? 'sources-open' : ''}`}>
            {/* Header */}
            <div className="chat-header">
                <div className="page-container flex-between">
                    <div className="flex gap-2" style={{ alignItems: 'center' }}>
                        <Link to="/documents" className="btn btn-secondary btn-sm">← <span className="hide-mobile">Back</span></Link>
                        <div>
                            <div className="chat-doc-name">📄 {doc?.originalName}</div>
                            <div className="chat-doc-meta">{doc?.pageCount} pages · {doc?.chunkCount} chunks</div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {pdfUrl && (
                            <button
                                className={`btn btn-secondary btn-sm btn-pdf-toggle ${showPdf ? 'active' : ''}`}
                                onClick={handleOpenPdf}
                                title="View PDF"
                            >
                                📄 <span className="hide-mobile">PDF</span>
                            </button>
                        )}
                        <button
                            className={`btn btn-secondary btn-sm btn-sources-toggle ${showSources ? 'active' : ''}`}
                            onClick={() => setShowSources(!showSources)}
                        >
                            📌 <span className="hide-mobile">Sources</span>
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={handleClearHistory}>🗑</button>
                    </div>
                </div>
            </div>

            <div className={`chat-layout ${showPdf ? 'pdf-open' : ''}`}>
                {/* PDF Viewer Panel */}
                {showPdf && pdfUrl && (
                    <div className="pdf-viewer-panel">
                        <div className="pdf-viewer-header">
                            <h3>📄 {doc?.originalName}</h3>
                            <div className="flex gap-2">
                                <a 
                                    href={pdfUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary btn-sm"
                                >
                                    🔗 Open in New Tab
                                </a>
                                <button className="btn-close" onClick={handleClosePdf}>✕</button>
                            </div>
                        </div>
                        <div className="pdf-viewer-content">
                            <iframe
                                src={pdfUrl}
                                title={doc?.originalName}
                                className="pdf-iframe"
                            />
                        </div>
                    </div>
                )}

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
                            >
                                <div className="message-avatar">{msg.role === 'user' ? '👤' : '🧠'}</div>
                                <div className="message-body">
                                    <div className="message-content">{msg.role === 'assistant' ? formatContent(msg.content) : msg.content}</div>
                                    {msg.role === 'assistant' && msg.sources?.length > 0 && (
                                        <div className="message-footer">
                                            <button
                                                className="btn-msg-sources"
                                                onClick={() => {
                                                    setActiveSources(msg.sources);
                                                    setShowSources(true);
                                                }}
                                            >
                                                📌 {msg.sources.length} sources
                                            </button>
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
                    <div className="chat-input-container">
                        <form onSubmit={handleSubmit} className="chat-input-form">
                            <input
                                type="text"
                                className="form-input chat-input"
                                placeholder="Ask about this document..."
                                value={question}
                                onChange={e => setQuestion(e.target.value)}
                                disabled={loading}
                                autoFocus
                            />
                            <button type="submit" className="btn btn-primary btn-send" disabled={loading || !question.trim()}>
                                {loading ? <span className="spinner" /> : '→'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Sources Sidebar / Mobile Bottom Sheet */}
                {showSources && (
                    <>
                        <div className="sources-backdrop" onClick={() => setShowSources(false)} />
                        <div className="sources-sidebar animate-slide-up">
                            <div className="sources-header">
                                <h3>📌 Source Context</h3>
                                <button className="btn-close" onClick={() => setShowSources(false)}>✕</button>
                            </div>
                            <div className="sources-content">
                                {activeSources.length > 0 ? (
                                    <SourcePanel sources={activeSources} onClose={() => setShowSources(false)} />
                                ) : (
                                    <p className="sources-hint-text">Select a message to view its sources.</p>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

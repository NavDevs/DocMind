import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import api from '../services/api';
import { db, isConfigured } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Documents.css';

const StatusBadge = ({ status }) => (
    <span className={`badge badge-${status}`}>
        {status === 'processing' && <span className="spinner" style={{ width: 10, height: 10 }} />}
        {status === 'ready' && '✓'}
        {status === 'failed' && '✕'}
        {' '}{status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
);

const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function Documents() {
    const [docs, setDocs] = useState([]);
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [activeCollectionId, setActiveCollectionId] = useState('all');
    const [showNewModal, setShowNewModal] = useState(false);
    const [newCollName, setNewCollName] = useState('');
    const [targetCollectionId, setTargetCollectionId] = useState('');

    const { user } = useAuth();

    const fetchCollections = useCallback(async () => {
        try {
            const { data } = await api.get('/collections');
            setCollections(data.collections);
        } catch {
            toast.error('Failed to load collections');
        }
    }, []);

    const fetchDocs = useCallback(async () => {
        try {
            const { data } = await api.get('/documents');
            setDocs(data.documents);
        } catch {
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDocs();
        fetchCollections();

        // 🟢 True Real-time Sync via Firestore
        if (isConfigured && db && user) {
            const q = query(
                collection(db, 'docStatus'),
                where('userId', '==', user._id)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const updates = {};
                snapshot.forEach(doc => {
                    updates[doc.id] = doc.data();
                });

                if (Object.keys(updates).length === 0) return;

                setDocs(prev => prev.map(doc => {
                    const update = updates[doc._id];
                    if (update && update.updatedAt) {
                        return { ...doc, ...update };
                    }
                    return doc;
                }));
            });

            return () => unsubscribe();
        }
    }, [fetchDocs, fetchCollections, user]);

    const handleCreateCollection = async (e) => {
        e.preventDefault();
        if (!newCollName.trim()) return;
        try {
            const { data } = await api.post('/collections', { name: newCollName.trim() });
            setCollections(prev => [data.collection, ...prev]);
            setNewCollName('');
            setShowNewModal(false);
            toast.success('Collection created');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create');
        }
    };

    const handleDeleteCollection = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Delete this collection? Documents will be moved to Uncategorized.')) return;
        try {
            await api.delete(`/collections/${id}`);
            setCollections(prev => prev.filter(c => c._id !== id));
            if (activeCollectionId === id) setActiveCollectionId('all');
            // Refresh docs to show uncategorized state
            fetchDocs();
            toast.success('Collection deleted');
        } catch {
            toast.error('Failed to delete');
        }
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            toast.error('Only PDF files are supported');
            return;
        }
        const formData = new FormData();
        formData.append('pdf', file);
        if (targetCollectionId) formData.append('collectionId', targetCollectionId);

        setUploading(true);
        try {
            const { data } = await api.post('/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('PDF uploaded! Processing...');
            setDocs(prev => [data.document, ...prev]);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    }, [targetCollectionId]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false,
        disabled: uploading,
    });

    const handleDeleteDoc = async (docId, e) => {
        e.preventDefault();
        if (!confirm('Delete this document?')) return;
        try {
            await api.delete(`/documents/${docId}`);
            setDocs(prev => prev.filter(d => d._id !== docId));
            toast.success('Document deleted');
        } catch {
            toast.error('Failed to delete');
        }
    };

    const filteredDocs = activeCollectionId === 'all'
        ? docs
        : activeCollectionId === 'uncategorized'
            ? docs.filter(d => !d.collectionId)
            : docs.filter(d => d.collectionId === activeCollectionId);

    return (
        <div className="documents-page page-content">
            <div className="page-container">
                <div className="documents-container">

                    {/* Sidebar */}
                    <aside className="collections-sidebar">
                        <div className="flex-between">
                            <h3 className="section-title">Collections</h3>
                            <button className="btn btn-icon btn-sm" onClick={() => setShowNewModal(true)} title="New Collection">+</button>
                        </div>

                        <div className="collections-list">
                            <div
                                className={`collection-item ${activeCollectionId === 'all' ? 'active' : ''}`}
                                onClick={() => setActiveCollectionId('all')}
                            >
                                <div className="flex-center">
                                    <span className="color-dot" style={{ background: 'var(--text-muted)' }}></span>
                                    All Documents
                                </div>
                                <span className="badge">{docs.length}</span>
                            </div>

                            <div
                                className={`collection-item ${activeCollectionId === 'uncategorized' ? 'active' : ''}`}
                                onClick={() => setActiveCollectionId('uncategorized')}
                            >
                                <div className="flex-center">
                                    <span className="color-dot" style={{ background: '#64748b' }}></span>
                                    Uncategorized
                                </div>
                                <span className="badge">{docs.filter(d => !d.collectionId).length}</span>
                            </div>

                            {collections.map(coll => (
                                <div
                                    key={coll._id}
                                    className={`collection-item ${activeCollectionId === coll._id ? 'active' : ''}`}
                                    onClick={() => setActiveCollectionId(coll._id)}
                                >
                                    <div className="flex-center overflow-hidden">
                                        <span className="color-dot" style={{ background: coll.color }}></span>
                                        <span className="truncate">{coll.name}</span>
                                    </div>
                                    <div className="flex-center">
                                        <span className="badge">{docs.filter(d => d.collectionId === coll._id).length}</span>
                                        <button
                                            className="delete-collection"
                                            onClick={(e) => handleDeleteCollection(coll._id, e)}
                                        >✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="docs-main">
                        <div className="docs-header">
                            <div>
                                <h2>{activeCollectionId === 'all' ? 'My Documents' : collections.find(c => c._id === activeCollectionId)?.name || 'Uncategorized'}</h2>
                                <p>Manage and chat with your PDFs.</p>
                            </div>
                        </div>

                        {/* Upload Wrapper */}
                        <div className="upload-wrapper">
                            <div className="collection-picker">
                                <span>Upload to:</span>
                                <select
                                    value={targetCollectionId}
                                    onChange={(e) => setTargetCollectionId(e.target.value)}
                                >
                                    <option value="">No Collection (Uncategorized)</option>
                                    {collections.map(c => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div {...getRootProps()} className={`upload-zone glass-card ${isDragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}>
                                <input {...getInputProps()} />
                                <div className="upload-icon">{uploading ? <div className="spinner spinner-lg" /> : '📂'}</div>
                                <p className="upload-title">
                                    {uploading ? 'Uploading...' : isDragActive ? 'Drop your PDF here!' : 'Drag & drop a PDF, or click to browse'}
                                </p>
                                <p className="upload-hint">Supports PDF files up to 10MB</p>
                            </div>
                        </div>

                        {/* Document List */}
                        {loading ? (
                            <div className="flex-center" style={{ padding: '60px 0' }}>
                                <div className="spinner spinner-lg" />
                            </div>
                        ) : filteredDocs.length === 0 ? (
                            <div className="empty-state">
                                <div className="icon">📄</div>
                                <h3>No documents here</h3>
                                <p>Upload a PDF to this collection to get started.</p>
                            </div>
                        ) : (
                            <div className="docs-grid">
                                {filteredDocs.map(doc => (
                                    <div key={doc._id} className="doc-card glass-card">
                                        <div className="doc-card-top">
                                            <div className="doc-icon">📄</div>
                                            <div className="flex-center gap-2">
                                                {doc.collectionId && (
                                                    <span className="collection-badge">
                                                        {collections.find(c => c._id === doc.collectionId)?.name || '...'}
                                                    </span>
                                                )}
                                                <StatusBadge status={doc.status} />
                                            </div>
                                        </div>
                                        <div className="doc-name" title={doc.originalName}>{doc.originalName}</div>
                                        {doc.summary && (
                                            <p className="doc-summary">{doc.summary.slice(0, 80)}{doc.summary.length > 80 ? '...' : ''}</p>
                                        )}
                                        <div className="doc-meta">
                                            <span>{doc.pageCount || 0} p</span>
                                            <span>{formatFileSize(doc.fileSize || 0)}</span>
                                        </div>
                                        <div className="doc-actions">
                                            {doc.status === 'ready' ? (
                                                <Link to={`/chat/${doc._id}`} className="btn btn-primary btn-sm w-full">💬 Chat</Link>
                                            ) : (
                                                <button className="btn btn-secondary btn-sm w-full" disabled>
                                                    {doc.status === 'processing' ? 'Processing...' : 'Failed'}
                                                </button>
                                            )}
                                            <button className="btn btn-danger btn-sm btn-icon" onClick={(e) => handleDeleteDoc(doc._id, e)} title="Delete">🗑</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* New Collection Modal */}
            {showNewModal && (
                <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
                    <div className="modal-content glass-card animate-scale-up" onClick={e => e.stopPropagation()}>
                        <h3>New Collection</h3>
                        <form onSubmit={handleCreateCollection}>
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. Finance, Research..."
                                    value={newCollName}
                                    onChange={e => setNewCollName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="flex-center gap-3 mt-4">
                                <button type="button" className="btn btn-secondary w-full" onClick={() => setShowNewModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary w-full" disabled={!newCollName.trim()}>Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

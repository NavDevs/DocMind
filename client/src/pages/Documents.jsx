import api from '../services/api';
import { db, isConfigured } from '../services/firebase';
import { ref, onValue } from 'firebase/database';
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
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const { user } = useAuth();

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

        // 🟢 True Real-time Sync via Firebase
        if (isConfigured && db && user) {
            const docsRef = ref(db, `docs/${user._id}`);

            // Listen for any changes to this user's document statuses
            const unsubscribe = onValue(docsRef, (snapshot) => {
                const data = snapshot.val();
                if (!data) return;

                setDocs(prev => prev.map(doc => {
                    const update = data[doc._id];
                    if (update && update.updatedAt) {
                        // Merge the Firebase real-time status into our state
                        return { ...doc, ...update };
                    }
                    return doc;
                }));
            });

            return () => unsubscribe();
        }
    }, [fetchDocs, user]);

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            toast.error('Only PDF files are supported');
            return;
        }
        const formData = new FormData();
        formData.append('pdf', file);
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
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false,
        disabled: uploading,
    });

    const handleDelete = async (docId, e) => {
        e.preventDefault();
        if (!confirm('Delete this document and its chat history?')) return;
        try {
            await api.delete(`/documents/${docId}`);
            setDocs(prev => prev.filter(d => d._id !== docId));
            toast.success('Document deleted');
        } catch {
            toast.error('Failed to delete');
        }
    };

    return (
        <div className="documents-page page-content">
            <div className="page-container">
                <div className="docs-header">
                    <div>
                        <h2>My Documents</h2>
                        <p>Upload PDFs and start chatting with them.</p>
                    </div>
                </div>

                {/* Upload Zone */}
                <div {...getRootProps()} className={`upload-zone glass-card ${isDragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}>
                    <input {...getInputProps()} />
                    <div className="upload-icon">{uploading ? <div className="spinner spinner-lg" /> : '📂'}</div>
                    <p className="upload-title">
                        {uploading ? 'Uploading...' : isDragActive ? 'Drop your PDF here!' : 'Drag & drop a PDF, or click to browse'}
                    </p>
                    <p className="upload-hint">Supports PDF files up to 10MB</p>
                </div>

                {/* Document List */}
                {loading ? (
                    <div className="flex-center" style={{ padding: '60px 0' }}>
                        <div className="spinner spinner-lg" />
                    </div>
                ) : docs.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">📄</div>
                        <h3>No documents yet</h3>
                        <p>Upload a PDF above to get started.</p>
                    </div>
                ) : (
                    <div className="docs-grid">
                        {docs.map(doc => (
                            <div key={doc._id} className="doc-card glass-card">
                                <div className="doc-card-top">
                                    <div className="doc-icon">📄</div>
                                    <StatusBadge status={doc.status} />
                                </div>
                                <div className="doc-name" title={doc.originalName}>{doc.originalName}</div>
                                {doc.summary && (
                                    <p className="doc-summary">{doc.summary.slice(0, 120)}{doc.summary.length > 120 ? '...' : ''}</p>
                                )}
                                <div className="doc-meta">
                                    <span>{doc.pageCount ? `${doc.pageCount} pages` : '—'}</span>
                                    <span>{formatFileSize(doc.fileSize || 0)}</span>
                                    <span>{doc.chunkCount ? `${doc.chunkCount} chunks` : '—'}</span>
                                </div>
                                <div className="doc-actions">
                                    {doc.status === 'ready' ? (
                                        <Link to={`/chat/${doc._id}`} className="btn btn-primary btn-sm w-full">
                                            💬 Chat
                                        </Link>
                                    ) : doc.status === 'processing' ? (
                                        <button className="btn btn-secondary btn-sm w-full" disabled>
                                            Processing...
                                        </button>
                                    ) : (
                                        <button className="btn btn-secondary btn-sm w-full" disabled>
                                            Failed to process
                                        </button>
                                    )}
                                    <button className="btn btn-danger btn-sm btn-icon" onClick={(e) => handleDelete(doc._id, e)} title="Delete">
                                        🗑
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

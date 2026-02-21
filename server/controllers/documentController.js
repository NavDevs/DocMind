const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const Analytics = require('../models/Analytics');
const { extractTextFromPDF } = require('../services/pdfService');
const { chunkText } = require('../utils/chunkText');
const { embedTexts } = require('../services/embeddingService');
const vectorStore = require('../services/vectorService');
const { generateSummary } = require('../services/summaryService');
const { getAdminDB } = require('../config/firebase');

/**
 * Write document status to Firebase Realtime Database for live UI updates.
 * No-op if Firebase is not configured.
 */
function writeStatusToRTDB(userId, docId, status, extra = {}) {
    const db = getAdminDB();
    if (!db) return;
    db.ref(`docs/${userId}/${docId}`).update({ status, ...extra, updatedAt: Date.now() });
}

// POST /api/documents/upload
const uploadDocument = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No PDF file uploaded' });

        const doc = await Document.create({
            userId: req.user._id,
            originalName: req.file.originalname,
            storagePath: req.file.path,
            fileSize: req.file.size,
            status: 'processing',
        });

        // Respond immediately — process async
        res.status(202).json({ success: true, message: 'Upload received, processing...', document: doc });

        // Write initial status to Firebase RTDB for real-time UI updates
        writeStatusToRTDB(req.user._id.toString(), doc._id.toString(), 'processing');

        // === Async ingestion pipeline ===
        (async () => {
            try {
                // 1. Extract text from PDF
                const { text, numPages } = await extractTextFromPDF(req.file.path);

                // 2. Chunk text
                const chunks = chunkText(text, 2000, 400);
                if (chunks.length === 0) throw new Error('No text could be extracted from this PDF');

                // 3. Generate embeddings
                let embeddings = [];
                try {
                    embeddings = await embedTexts(chunks.map(c => c.text));
                } catch (embErr) {
                    console.warn('Embedding failed (no API key?):', embErr.message);
                }

                // 4. Upsert into vector store
                const namespace = `doc_${doc._id}`;
                if (embeddings.length > 0) {
                    const vectors = chunks.map((chunk, i) => ({
                        id: `chunk_${i}`,
                        values: embeddings[i],
                        metadata: { text: chunk.text, chunkIndex: chunk.chunkIndex, documentId: doc._id.toString() },
                    }));
                    vectorStore.upsert(namespace, vectors);
                }

                // 5. Generate summary
                const summary = await generateSummary(chunks);

                // 6. Update MongoDB document record
                await Document.findByIdAndUpdate(doc._id, {
                    status: 'ready',
                    pageCount: numPages,
                    chunkCount: chunks.length,
                    summary,
                    vectorNamespace: namespace,
                });

                // 7. Push final status to Firebase RTDB → client updates card instantly
                writeStatusToRTDB(req.user._id.toString(), doc._id.toString(), 'ready', {
                    pageCount: numPages,
                    chunkCount: chunks.length,
                });

                // 8. Log analytics
                await Analytics.create({ userId: req.user._id, documentId: doc._id, event: 'upload' });
                await require('../models/User').findByIdAndUpdate(req.user._id, {
                    $inc: { 'apiUsage.totalUploads': 1 },
                });

                console.log(`✅ Document ${doc._id} processed: ${chunks.length} chunks`);
            } catch (procErr) {
                console.error(`❌ Processing failed for doc ${doc._id}:`, procErr.message);
                await Document.findByIdAndUpdate(doc._id, { status: 'failed', errorMessage: procErr.message });
                // Push failure status to Firebase RTDB
                writeStatusToRTDB(req.user._id.toString(), doc._id.toString(), 'failed');
            }
        })();
    } catch (err) {
        next(err);
    }
};

// GET /api/documents
const listDocuments = async (req, res, next) => {
    try {
        const docs = await Document.find({ userId: req.user._id }).sort({ uploadedAt: -1 });
        res.json({ success: true, documents: docs });
    } catch (err) {
        next(err);
    }
};

// GET /api/documents/:id
const getDocument = async (req, res, next) => {
    try {
        const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
        if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
        res.json({ success: true, document: doc });
    } catch (err) {
        next(err);
    }
};

// GET /api/documents/:id/status
const getStatus = async (req, res, next) => {
    try {
        const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id })
            .select('status chunkCount pageCount errorMessage');
        if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
        res.json({ success: true, ...doc.toObject() });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/documents/:id
const deleteDocument = async (req, res, next) => {
    try {
        const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
        if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

        // Delete vector namespace
        if (doc.vectorNamespace) vectorStore.deleteNamespace(doc.vectorNamespace);

        // Delete physical file
        if (fs.existsSync(doc.storagePath)) fs.unlinkSync(doc.storagePath);

        await Document.findByIdAndDelete(doc._id);
        await Analytics.create({ userId: req.user._id, documentId: doc._id, event: 'delete' });

        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (err) {
        next(err);
    }
};

module.exports = { uploadDocument, listDocuments, getDocument, getStatus, deleteDocument };

const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    originalName: {
        type: String,
        required: true,
    },
    storagePath: {
        type: String,
        required: true,
    },
    fileSize: {
        type: Number, // bytes
        default: 0,
    },
    pageCount: {
        type: Number,
        default: 0,
    },
    chunkCount: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['processing', 'ready', 'failed'],
        default: 'processing',
    },
    errorMessage: {
        type: String,
        default: null,
    },
    summary: {
        type: String,
        default: null,
    },
    vectorNamespace: {
        type: String, // e.g., "doc_<_id>" — used as Pinecone namespace or local key
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Document', documentSchema);

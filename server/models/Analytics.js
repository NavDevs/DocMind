const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        default: null,
    },
    event: {
        type: String,
        enum: ['upload', 'query', 'summary', 'login', 'delete'],
        required: true,
    },
    tokensUsed: {
        type: Number,
        default: 0,
    },
    responseTimeMs: {
        type: Number,
        default: 0,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
});

module.exports = mongoose.model('Analytics', analyticsSchema);

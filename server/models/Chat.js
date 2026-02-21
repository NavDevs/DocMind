const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema({
    text: String,
    pageNumber: Number,
    chunkIndex: Number,
    score: Number, // cosine similarity
}, { _id: false });

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    sources: [sourceSchema],
    confidenceScore: {
        type: Number,
        min: 0,
        max: 1,
        default: null,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });

const chatSchema = new mongoose.Schema({
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true,
        index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    messages: [messageSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

chatSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Chat', chatSchema);

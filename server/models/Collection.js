const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    color: {
        type: String,
        default: '#4f46e5', // Brand indigo
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Ensure a user doesn't have duplicate collection names
collectionSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Collection', collectionSchema);

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    passwordHash: {
        type: String,
        required: true,
        minlength: 6,
    },
    plan: {
        type: String,
        enum: ['free', 'pro'],
        default: 'free',
    },
    apiUsage: {
        totalQueries: { type: Number, default: 0 },
        totalUploads: { type: Number, default: 0 },
        totalTokens: { type: Number, default: 0 },
        monthlyQueries: { type: Number, default: 0 },
        lastResetDate: { type: Date, default: Date.now },
    },
    createdAt: { type: Date, default: Date.now },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) return next();
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Don't return passwordHash in JSON responses
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.passwordHash;
    return obj;
};

module.exports = mongoose.model('User', userSchema);

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getAdminAuth, syncUserToFirestore } = require('../config/firebase');

const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

/**
 * Unified auth middleware.
 * Accepts:
 *   1. Standard JWT (email/password login)
 *   2. Firebase ID token (Google Sign-in) — auto-creates user on first visit
 */
const authenticateJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const adminAuth = getAdminAuth();

        // ── Try Firebase ID token first (if Firebase is configured) ────────────
        if (adminAuth) {
            try {
                const decoded = await adminAuth.verifyIdToken(token);
                // Find or create user from Firebase profile
                let user = await User.findOne({ email: decoded.email });
                if (!user) {
                    user = await User.create({
                        name: decoded.name || decoded.email.split('@')[0],
                        email: decoded.email,
                        passwordHash: `firebase_${decoded.uid}`, // placeholder — never used for login
                    });
                }
                req.user = user;
                syncUserToFirestore(user); // Sync to Firestore
                return next();
            } catch (firebaseErr) {
                // Not a Firebase token — fall through to JWT check
            }
        }

        // ── Standard JWT ────────────────────────────────────────────────────────
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }
        req.user = user;
        syncUserToFirestore(user); // Sync to Firestore
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        next(error);
    }
};

module.exports = { authenticateJWT, signToken };

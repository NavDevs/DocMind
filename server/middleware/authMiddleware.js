const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getAdminAuth, syncUserToFirestore } = require('../config/firebase');

const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

/**
 * Peek at a JWT's `iss` claim WITHOUT verifying the signature.
 * Firebase ID tokens have iss = "https://securetoken.google.com/<project>"
 * Our own JWTs have iss = undefined (jsonwebtoken default) or a custom value.
 * This avoids an expensive failing verifyIdToken() on every standard-JWT request.
 */
function looksLikeFirebaseToken(token) {
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return typeof payload.iss === 'string' && payload.iss.startsWith('https://securetoken.google.com/');
    } catch {
        return false;
    }
}

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

        // ── Firebase ID token path (only when it looks like a Firebase token) ──
        if (adminAuth && looksLikeFirebaseToken(token)) {
            try {
                const decoded = await adminAuth.verifyIdToken(token);
                let user = await User.findOne({ email: decoded.email });
                if (!user) {
                    user = await User.create({
                        name: decoded.name || decoded.email.split('@')[0],
                        email: decoded.email,
                        passwordHash: `firebase_${decoded.uid}`,
                    });
                }
                req.user = user;
                // Fire-and-forget — does not block the response
                syncUserToFirestore(user).catch(() => {});
                return next();
            } catch (firebaseErr) {
                // Token looked like Firebase but failed verification — reject immediately
                return res.status(401).json({ success: false, message: 'Invalid Firebase token' });
            }
        }

        // ── Standard JWT ─────────────────────────────────────────────────────────
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }
        req.user = user;
        // Fire-and-forget — does not block the response
        syncUserToFirestore(user).catch(() => {});
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


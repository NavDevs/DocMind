const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const { signToken } = require('../middleware/authMiddleware');

// POST /api/auth/register
const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ success: false, message: 'All fields are required' });
        if (password.length < 6)
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

        const user = await User.create({ name, email, passwordHash: password });
        await Analytics.create({ userId: user._id, event: 'login', tokensUsed: 0 });

        const token = signToken(user._id);
        res.status(201).json({ success: true, token, user });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ success: false, message: 'Email and password required' });

        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password)))
            return res.status(401).json({ success: false, message: 'Invalid credentials' });

        await Analytics.create({ userId: user._id, event: 'login', tokensUsed: 0 });

        const token = signToken(user._id);
        res.json({ success: true, token, user });
    } catch (err) {
        next(err);
    }
};

// GET /api/auth/me
const getMe = async (req, res) => {
    res.json({ success: true, user: req.user });
};

// POST /api/auth/firebase
// Accepts a Firebase ID token, returns a JWT that the client can use for subsequent requests.
// The middleware already created/found the user — this just issues a JWT.
const firebaseAuth = async (req, res) => {
    try {
        const token = signToken(req.user._id);
        res.json({ success: true, token, user: req.user });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Firebase auth failed' });
    }
};

module.exports = { register, login, getMe, firebaseAuth };


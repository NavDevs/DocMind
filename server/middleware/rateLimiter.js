const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // increased to 300 requests per IP per window to prevent false positives
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests from this device, please try again in a few minutes.',
    },
});

module.exports = rateLimiter;

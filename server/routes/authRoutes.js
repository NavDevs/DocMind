const express = require('express');
const router = express.Router();
const { register, login, getMe, firebaseAuth } = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateJWT, getMe);

// Firebase auth: client sends a Firebase ID token, gets back a JWT + user object
// The authenticateJWT middleware handles verifying the Firebase token and finding/creating the user
router.post('/firebase', authenticateJWT, firebaseAuth);

module.exports = router;

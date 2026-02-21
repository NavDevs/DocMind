const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/authMiddleware');
const { askQuestion, getChatHistory, clearHistory } = require('../controllers/chatController');

router.use(authenticateJWT);

router.post('/:documentId', askQuestion);
router.get('/:documentId/history', getChatHistory);
router.delete('/:documentId/history', clearHistory);

module.exports = router;

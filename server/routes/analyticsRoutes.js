const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/authMiddleware');
const { getDashboard, getDailyUsage } = require('../controllers/analyticsController');

router.use(authenticateJWT);

router.get('/dashboard', getDashboard);
router.get('/usage/daily', getDailyUsage);

module.exports = router;

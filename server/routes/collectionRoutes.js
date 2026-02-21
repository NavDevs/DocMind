const express = require('express');
const router = express.Router();
const { listCollections, createCollection, deleteCollection } = require('../controllers/collectionController');
const { authenticateJWT } = require('../middleware/authMiddleware');

// All collection routes protected
router.use(authenticateJWT);

router.get('/', listCollections);
router.post('/', createCollection);
router.delete('/:id', deleteCollection);

module.exports = router;

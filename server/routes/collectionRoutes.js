const express = require('express');
const router = express.Router();
const { listCollections, createCollection, deleteCollection } = require('../controllers/collectionController');
const { protect } = require('../middleware/authMiddleware');

// All collection routes protected
router.use(protect);

router.get('/', listCollections);
router.post('/', createCollection);
router.delete('/:id', deleteCollection);

module.exports = router;

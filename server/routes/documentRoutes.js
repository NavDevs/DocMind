const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const {
    uploadDocument,
    listDocuments,
    getDocument,
    getStatus,
    deleteDocument,
} = require('../controllers/documentController');

router.use(authenticateJWT);

router.post('/upload', upload.single('pdf'), uploadDocument);
router.get('/', listDocuments);
router.get('/:id', getDocument);
router.get('/:id/status', getStatus);
router.delete('/:id', deleteDocument);

module.exports = router;

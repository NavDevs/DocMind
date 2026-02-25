const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userDir = path.join(__dirname, '../uploads', req.user.id.toString());
        if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
        cb(null, userDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}.pdf`;
        cb(null, uniqueName);
    },
});

const fileFilter = (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' ||
        (file.originalname && file.originalname.toLowerCase().endsWith('.pdf'));

    if (isPdf) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
});

module.exports = { upload };

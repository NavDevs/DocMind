const Collection = require('../models/Collection');
const Document = require('../models/Document');

// GET /api/collections
const listCollections = async (req, res, next) => {
    try {
        const collections = await Collection.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, collections });
    } catch (err) {
        next(err);
    }
};

// POST /api/collections
const createCollection = async (req, res, next) => {
    try {
        const { name, color } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Collection name is required' });

        const collection = await Collection.create({
            userId: req.user._id,
            name,
            color
        });

        res.status(201).json({ success: true, collection });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'Collection name already exists' });
        }
        next(err);
    }
};

// DELETE /api/collections/:id
const deleteCollection = async (req, res, next) => {
    try {
        const collection = await Collection.findOne({ _id: req.params.id, userId: req.user._id });
        if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });

        // Unset collectionId for all documents in this collection
        await Document.updateMany({ collectionId: collection._id }, { $set: { collectionId: null } });

        await Collection.findByIdAndDelete(collection._id);

        res.json({ success: true, message: 'Collection deleted. Documents moved to Uncategorized.' });
    } catch (err) {
        next(err);
    }
};

module.exports = { listCollections, createCollection, deleteCollection };

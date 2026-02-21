const Chat = require('../models/Chat');
const Document = require('../models/Document');
const { answerQuestion } = require('../services/ragService');
const { logActivityToFirestore } = require('../config/firebase');

// POST /api/chat/:documentId
const askQuestion = async (req, res, next) => {
    try {
        const { question } = req.body;
        const { documentId } = req.params;

        if (!question || question.trim().length === 0)
            return res.status(400).json({ success: false, message: 'Question is required' });

        // Verify document belongs to user and is ready
        const doc = await Document.findOne({ _id: documentId, userId: req.user._id });
        if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
        if (doc.status !== 'ready')
            return res.status(400).json({ success: false, message: `Document is not ready (status: ${doc.status})` });

        // Run RAG pipeline
        const { answer, sources, confidenceScore, tokensUsed } = await answerQuestion(
            documentId,
            req.user._id,
            question.trim()
        );

        // Append to chat history
        let chat = await Chat.findOne({ documentId, userId: req.user._id });
        if (!chat) {
            chat = new Chat({ documentId, userId: req.user._id, messages: [] });
        }

        chat.messages.push({ role: 'user', content: question.trim(), timestamp: new Date() });
        chat.messages.push({ role: 'assistant', content: answer, sources, confidenceScore, timestamp: new Date() });
        await chat.save();

        // Log chat activity
        await logActivityToFirestore(req.user._id, 'chat_question', {
            documentId,
            tokensUsed
        });

        res.json({ success: true, answer, sources, confidenceScore, tokensUsed });
    } catch (err) {
        next(err);
    }
};

// GET /api/chat/:documentId/history
const getChatHistory = async (req, res, next) => {
    try {
        const chat = await Chat.findOne({ documentId: req.params.documentId, userId: req.user._id });
        res.json({ success: true, messages: chat?.messages || [] });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/chat/:documentId/history
const clearHistory = async (req, res, next) => {
    try {
        await Chat.findOneAndDelete({ documentId: req.params.documentId, userId: req.user._id });
        res.json({ success: true, message: 'Chat history cleared' });
    } catch (err) {
        next(err);
    }
};

module.exports = { askQuestion, getChatHistory, clearHistory };

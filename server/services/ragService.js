const { getChatClient, getChatModel } = require('../config/openai');
const vectorStore = require('./vectorService');
const { embedQuery } = require('./embeddingService');
const Analytics = require('../models/Analytics');
const User = require('../models/User');
const Document = require('../models/Document');

const TOP_K = 8;
const SIMILARITY_THRESHOLD = 0.35; // Increased threshold to reject irrelevant chunks

/**
 * Main RAG pipeline: embed question → retrieve chunks → build prompt → LLM answer
 * Supports dual-mode: general knowledge + precise document Q&A
 *
 * @param {string} documentId
 * @param {string} userId
 * @param {string} question
 * @param {Array} chatHistory - previous messages for conversational context
 */
async function answerQuestion(documentId, userId, question, chatHistory = []) {
    const startTime = Date.now();
    const client = getChatClient();
    const model = getChatModel();

    if (!client) {
        return {
            answer: '⚠️ No AI API configured. Add GROQ_API_KEY or OPENAI_API_KEY to server/.env to enable chat.',
            sources: [],
            confidenceScore: 0,
            tokensUsed: 0,
        };
    }

    // 1. Embed the question
    const questionVector = await embedQuery(question);

    // 2. Retrieve relevant chunks from vector store
    const namespace = `doc_${documentId}`;
    let matches = vectorStore.query(namespace, questionVector, TOP_K, SIMILARITY_THRESHOLD);

    // 3. Determine if question is document-related based on match quality
    const hasStrongMatches = matches.length > 0 && matches[0].score > 0.50;
    const hasAnyMatches = matches.length > 0;

    // 4. Build document context
    let context = '';
    let mode = 'general'; // 'document' or 'general'

    if (hasStrongMatches) {
        mode = 'document';
        context = matches
            .map((m, i) => `[Source ${i + 1} | Chunk #${m.metadata.chunkIndex}]:\n${m.metadata.text}`)
            .join('\n\n---\n\n');
    } else if (hasAnyMatches) {
        // Weak matches — include them as supplementary context
        mode = 'document';
        context = matches
            .map((m, i) => `[Source ${i + 1} | Chunk #${m.metadata.chunkIndex}]:\n${m.metadata.text}`)
            .join('\n\n---\n\n');
    } else {
        // No vector matches — try document summary
        const doc = await Document.findById(documentId).select('summary originalName');
        if (doc?.summary) {
            context = `Document: "${doc.originalName}"\nSummary: ${doc.summary}`;
        }
    }

    // 5. Construct system prompt
    // ALWAYS force document strictness — remove the general knowledge fallback that causes hallucinations
    const systemPrompt = `You are DocMind, an expert AI document assistant.

CRITICAL RULES:
1. You MUST answer the user's question ONLY using the provided document context below.
2. If the answer is NOT in the context, you MUST say: "I cannot find the answer to this in the document." Do NOT make up information.
3. Quote exact text from the sources whenever possible to prove your answer.
4. Structure your answers with clear formatting (bullet points, bold text) for readability. Do NOT use markdown headers like ###.
5. If the document context partially answers the question, provide what you can and explicitly note what is missing.
6. Do NOT answer general knowledge questions using your own knowledge. Always ground your answer in the user's document.`;

    // 6. Build messages array with chat history
    const messages = [
        { role: 'system', content: systemPrompt },
    ];

    // Include last 6 messages of chat history for conversational context
    if (chatHistory.length > 0) {
        const recentHistory = chatHistory.slice(-6);
        for (const msg of recentHistory) {
            messages.push({
                role: msg.role,
                content: msg.content,
            });
        }
    }

    // Add current question with context
    const userMessage = context
        ? `Document Context:\n\n${context}\n\n---\n\nUser Question: ${question}`
        : question;

    messages.push({ role: 'user', content: userMessage });

    // 7. Call Groq (or OpenAI fallback)
    const completion = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.2, // Lower temperature for more factual, deterministic answers
        max_tokens: 3000, // Increased to allow full table extraction
    });

    const answer = completion.choices[0].message.content;
    const tokensUsed = completion.usage?.total_tokens || 0;

    // 8. Compute confidence from match scores
    const confidenceScore = matches.length > 0
        ? matches.reduce((sum, m) => sum + m.score, 0) / matches.length
        : 0.5;

    const sources = matches.map(m => ({
        text: m.metadata.text,
        chunkIndex: m.metadata.chunkIndex,
        score: parseFloat(m.score.toFixed(4)),
    }));

    // 9. Log analytics
    try {
        const responseTimeMs = Date.now() - startTime;
        await Analytics.create({ userId, documentId, event: 'query', tokensUsed, responseTimeMs });
        await User.findByIdAndUpdate(userId, {
            $inc: {
                'apiUsage.totalQueries': 1,
                'apiUsage.monthlyQueries': 1,
                'apiUsage.totalTokens': tokensUsed,
            },
        });
    } catch (err) {
        console.warn('Analytics log failed:', err.message);
    }

    return { answer, sources, confidenceScore: parseFloat(confidenceScore.toFixed(4)), tokensUsed };
}

module.exports = { answerQuestion };

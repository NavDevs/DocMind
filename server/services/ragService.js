const { getChatClient, getChatModel, callChatCompletionWithFallback } = require('../config/openai');
const vectorStore = require('./vectorService');
const { embedQuery } = require('./embeddingService');
const Analytics = require('../models/Analytics');
const User = require('../models/User');
const Document = require('../models/Document');

const TOP_K = 4;
const SIMILARITY_THRESHOLD = 0.10;
const MAX_CHUNK_CHARS = 800;

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
    console.log('[RAG] Embedding question...');
    const questionVector = await embedQuery(question);
    console.log('[RAG] Question embedded successfully. Vector length:', questionVector?.length);

    // 2. Retrieve relevant chunks from vector store
    const namespace = `doc_${documentId}`;
    let matches = vectorStore.query(namespace, questionVector, TOP_K, SIMILARITY_THRESHOLD);

    // 3. Determine if question is document-related based on match quality
    const hasStrongMatches = matches.length > 0 && matches[0].score > 0.50;
    const hasAnyMatches = matches.length > 0;

    // 4. Build document context (truncate each chunk to fit Groq free-tier limits)
    let context = '';
    let mode = 'general';

    const truncate = (text) => text.length > MAX_CHUNK_CHARS ? text.slice(0, MAX_CHUNK_CHARS) + '...' : text;

    if (hasStrongMatches || hasAnyMatches) {
        mode = 'document';
        context = matches
            .map((m, i) => `[Source ${i + 1}]: ${truncate(m.metadata.text)}`)
            .join('\n\n');
    } else {
        const doc = await Document.findById(documentId).select('summary originalName');
        if (doc?.summary) {
            context = `Document: "${doc.originalName}"\nSummary: ${truncate(doc.summary)}`;
        }
    }

    // 5. Construct system prompt
    const systemPrompt = `You are DocMind, a friendly, helpful, and expert AI assistant.

CRITICAL RULES:
1. If "Document Context" is provided and the user asks a document-related question, you MUST primarily use that context to answer, quoting exact text when possible.
2. If the user's input is a casual greeting (like "hi") or normal conversation, respond naturally and warmly like a friend. Do NOT output any notes, warnings, disclaimers, or meta-commentary about your behavior (e.g., never say "Note: Since your question is a casual greeting...").
3. If the user asks a specific question that is NOT in the document context, answer using your general knowledge. You may politely mention it's not in the document only if necessary, but keep it brief.
4. Structure complex answers with clear formatting (bullet points, bold text) for readability. Do NOT use markdown headers like ###.`;

    // 6. Build messages array with chat history
    const messages = [
        { role: 'system', content: systemPrompt },
    ];

    // Include last 3 messages of chat history for conversational context
    if (chatHistory.length > 0) {
        const recentHistory = chatHistory.slice(-3);
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

    // 7. Call Groq (or OpenAI fallback) with bulletproof retry logic
    console.log('[RAG] Calling chat completions API with fallback logic...');
    const completion = await callChatCompletionWithFallback(client, {
        model, // initial model attempt
        messages,
        temperature: 0.2,
        max_tokens: 1024,
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

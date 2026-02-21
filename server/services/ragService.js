const { getChatClient, getChatModel } = require('../config/openai');
const vectorStore = require('./vectorService');
const { embedQuery } = require('./embeddingService');
const Analytics = require('../models/Analytics');
const User = require('../models/User');
const Document = require('../models/Document');

const TOP_K = 5;
const SIMILARITY_THRESHOLD = 0.1; // Lower threshold for TF-IDF vectors

/**
 * Main RAG pipeline: embed question → retrieve chunks → build prompt → LLM answer
 */
async function answerQuestion(documentId, userId, question) {
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

    // 3. Fallback: if no chunks found (no embeddings), load raw document text
    let context = '';
    if (matches.length === 0) {
        const doc = await Document.findById(documentId).select('summary');
        if (doc?.summary) {
            context = `Document Summary:\n${doc.summary}`;
        } else {
            return {
                answer: "I couldn't find any content in this document. The document may still be processing — please wait a moment and try again.",
                sources: [],
                confidenceScore: 0,
                tokensUsed: 0,
            };
        }
    } else {
        context = matches
            .map((m, i) => `[Source ${i + 1} | Chunk #${m.metadata.chunkIndex}]:\n${m.metadata.text}`)
            .join('\n\n---\n\n');
    }

    // 4. Construct prompt
    const messages = [
        {
            role: 'system',
            content: `You are DocMind, a precise AI document assistant.
Answer the user's question using ONLY the provided document context.
If the answer is not in the context, say: "This information is not available in the document."
Do not make up information. Be concise and cite [Source N] when referencing sections.
Format your answer in clear, readable markdown.`,
        },
        {
            role: 'user',
            content: `Document Context:\n\n${context}\n\n---\n\nQuestion: ${question}`,
        },
    ];

    // 5. Call Groq (or OpenAI fallback)
    const completion = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 1024,
    });

    const answer = completion.choices[0].message.content;
    const tokensUsed = completion.usage?.total_tokens || 0;

    // 6. Compute confidence from match scores
    const confidenceScore = matches.length > 0
        ? matches.reduce((sum, m) => sum + m.score, 0) / matches.length
        : 0.5;

    const sources = matches.map(m => ({
        text: m.metadata.text,
        chunkIndex: m.metadata.chunkIndex,
        score: parseFloat(m.score.toFixed(4)),
    }));

    // 7. Log analytics
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

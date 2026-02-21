const { getChatClient, getChatModel } = require('../config/openai');

/**
 * Generates a concise document summary using Groq (or OpenAI fallback).
 */
async function generateSummary(chunks) {
    const client = getChatClient();
    if (!client) return 'Document uploaded. Add GROQ_API_KEY to server/.env to enable AI summaries.';

    const context = chunks.slice(0, 6).map(c => c.text).join('\n\n');

    try {
        const completion = await client.chat.completions.create({
            model: getChatModel(),
            messages: [
                {
                    role: 'system',
                    content: 'You are a document summarization assistant. Provide concise, accurate summaries.',
                },
                {
                    role: 'user',
                    content: `Summarize the following document excerpt in 3–5 clear sentences. Cover the main topic, key points, and purpose.\n\nDocument:\n${context}`,
                },
            ],
            temperature: 0.4,
            max_tokens: 300,
        });
        return completion.choices[0].message.content;
    } catch (err) {
        console.warn('Summary generation failed:', err.message);
        return 'Summary unavailable. You can still chat with this document.';
    }
}

module.exports = { generateSummary };

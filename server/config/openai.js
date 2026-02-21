/**
 * Returns a lightweight Groq client using the OpenAI-compatible SDK.
 * Falls back to OpenAI if Groq is not configured.
 */
const OpenAI = require('openai');

let _groq = null;
let _openai = null;

function getGroq() {
    if (_groq) return _groq;
    if (process.env.GROQ_API_KEY) {
        _groq = new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: 'https://api.groq.com/openai/v1',
        });
        return _groq;
    }
    return null;
}

function getOpenAI() {
    if (_openai) return _openai;
    if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-')) {
        _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        return _openai;
    }
    return null;
}

/**
 * Returns the best available chat client: Groq first, then OpenAI.
 */
function getChatClient() {
    return getGroq() || getOpenAI();
}

/**
 * Returns the model name to use based on which client is active.
 */
function getChatModel() {
    if (getGroq()) return process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    return 'gpt-4o-mini';
}

module.exports = { getGroq, getOpenAI, getChatClient, getChatModel };

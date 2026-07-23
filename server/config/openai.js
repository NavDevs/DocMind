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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768"
];

/**
 * Bulletproof wrapper for chat completions.
 * Handles rate limits (429) and server errors (5xx) with exponential backoff.
 * Instantly falls back on bad requests (400) or not found (404) (e.g., deprecated models).
 */
async function callChatCompletionWithFallback(client, options) {
    const isGroq = client.baseURL && client.baseURL.includes('groq.com');
    // If not Groq, just try the provided model (OpenAI)
    const models = isGroq ? GROQ_MODELS : [options.model || 'gpt-4o-mini'];

    for (let i = 0; i < models.length; i++) {
        const model = models[i];
        let retries = 0;
        const maxRetries = 3;

        while (retries <= maxRetries) {
            try {
                return await client.chat.completions.create({
                    ...options,
                    model: model
                });
            } catch (error) {
                const status = error.status || (error.response && error.response.status);

                if (status === 400 || status === 404) {
                    console.warn(`[API] Model ${model} returned ${status}. Decommissioned/Invalid. Falling back to next model immediately.`);
                    break; // Break the while loop to move to the next model in the for loop
                }

                if (status === 429 || (status >= 500 && status < 600)) {
                    if (retries < maxRetries) {
                        retries++;
                        // Exponential backoff: 2s, 4s, 8s + jitter
                        const delay = Math.pow(2, retries) * 1000 + Math.random() * 1000;
                        console.warn(`[API] Model ${model} returned ${status}. Retrying (${retries}/${maxRetries}) in ${Math.round(delay)}ms...`);
                        await sleep(delay);
                        continue;
                    } else {
                        console.warn(`[API] Model ${model} exhausted retries for ${status}. Falling back to next model.`);
                        break;
                    }
                }

                if (status === 401) {
                    throw new Error(`Authentication failed (401). Check your API keys.`);
                }

                console.warn(`[API] Model ${model} failed with status ${status}: ${error.message}. Falling back...`);
                break;
            }
        }
    }

    throw new Error('All AI models in the fallback array have been exhausted or failed.');
}

module.exports = { getGroq, getOpenAI, getChatClient, getChatModel, callChatCompletionWithFallback };

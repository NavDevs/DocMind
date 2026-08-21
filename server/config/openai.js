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
    if (getGroq()) return process.env.GROQ_MODEL || 'groq/compound-mini';
    return 'gpt-4o-mini';
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const GROQ_MODELS = [
    "groq/compound-mini",
    "groq/compound",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.6-27b",
    "allam-2-7b"
];

/**
 * Bulletproof wrapper for chat completions.
 * Handles rate limits (429) and server errors (5xx) with exponential backoff.
 * Instantly falls back on bad requests (400) or not found (404) (e.g., deprecated models).
 * If all static models fail, dynamically discovers available models from the provider.
 */
async function callChatCompletionWithFallback(client, options) {
    const isGroq = client.baseURL && client.baseURL.includes('groq.com');
    let models = isGroq ? [...GROQ_MODELS] : [options.model || 'gpt-4o-mini'];

    // If options.model is specified and not already at the front, ensure it's tried first
    if (options.model && !models.includes(options.model)) {
        models.unshift(options.model);
    } else if (options.model && models.includes(options.model) && models[0] !== options.model) {
        models = [options.model, ...models.filter(m => m !== options.model)];
    }

    let lastError = null;

    for (let i = 0; i < models.length; i++) {
        const model = models[i];
        let retries = 0;
        const maxRetries = 2;

        while (retries <= maxRetries) {
            try {
                return await client.chat.completions.create({
                    ...options,
                    model: model
                });
            } catch (error) {
                lastError = error;
                const status = error.status || (error.response && error.response.status);

                if (status === 400 || status === 404) {
                    console.warn(`[API] Model ${model} returned ${status} (decommissioned/unavailable). Falling back immediately.`);
                    break; // Break the while loop to move to the next model
                }

                if (status === 429 || (status >= 500 && status < 600)) {
                    if (retries < maxRetries) {
                        retries++;
                        const delay = Math.pow(2, retries) * 1000 + Math.random() * 500;
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

    // Dynamic auto-discovery fallback if all predefined models fail:
    if (isGroq) {
        try {
            console.log('[API] Attempting dynamic model discovery from Groq...');
            const list = await client.models.list();
            const excludePatterns = ['whisper', 'prompt-guard', 'orpheus', 'safeguard'];
            const discovered = list.data
                .map(m => m.id)
                .filter(id => !excludePatterns.some(p => id.toLowerCase().includes(p)) && !models.includes(id));

            for (const dModel of discovered) {
                try {
                    console.log(`[API] Trying dynamically discovered model: ${dModel}`);
                    return await client.chat.completions.create({
                        ...options,
                        model: dModel
                    });
                } catch (e) {
                    console.warn(`[API] Discovered model ${dModel} failed:`, e.message);
                }
            }
        } catch (discErr) {
            console.error('[API] Dynamic model discovery failed:', discErr.message);
        }
    }

    throw lastError || new Error('All AI models in the fallback array have been exhausted or failed.');
}

module.exports = { getGroq, getOpenAI, getChatClient, getChatModel, callChatCompletionWithFallback };

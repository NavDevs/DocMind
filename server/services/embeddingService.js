const { getOpenAI } = require('../config/openai');

// ── Local TF-IDF Embeddings (no API key needed) ──────────────────────────────

/**
 * Build a simple TF-IDF style sparse vector from text.
 * Returns a fixed-size dense vector suitable for cosine similarity.
 */
function localEmbed(text) {
    const tokens = tokenize(text);
    const freq = {};
    for (const t of tokens) freq[t] = (freq[t] || 0) + 1;

    // Use a 512-dim hash-based embedding
    const dim = 512;
    const vec = new Array(dim).fill(0);

    for (const [term, count] of Object.entries(freq)) {
        // Hash the term to multiple dimensions (simulated random projection)
        const tf = count / tokens.length;
        for (let i = 0; i < 3; i++) {
            const idx = Math.abs(hashCode(`${term}_${i}`)) % dim;
            vec[idx] += tf;
        }
    }

    return normalize(vec);
}

function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function normalize(vec) {
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / mag);
}

function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h;
}

const STOPWORDS = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'was',
    'that', 'this', 'with', 'have', 'from', 'they', 'will', 'one', 'had',
    'his', 'her', 'its', 'our', 'out', 'who', 'what', 'said', 'each',
    'she', 'how', 'their', 'been', 'than', 'then', 'when', 'there', 'into',
    'more', 'also', 'some', 'your', 'has', 'him', 'would', 'about', 'which',
]);

// ── OpenAI Embeddings (higher quality, used when API key is available) ───────

async function embedTexts(texts) {
    const openai = getOpenAI();
    const groq = getGroq();

    if (!openai && !groq) {
        // Fall back to local TF-IDF embeddings (poor semantic quality)
        return texts.map(localEmbed);
    }

    const batchSize = 100;
    const all = [];

    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        let res;

        // Prefer Groq's fast/free nomic model if available, else OpenAI
        if (groq) {
            res = await groq.embeddings.create({
                model: 'nomic-embed-text-v1_5',
                input: batch,
            });
        } else {
            res = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: batch,
            });
        }

        all.push(...res.data.map(d => d.embedding));
    }
    return all;
}

async function embedQuery(text) {
    const [vector] = await embedTexts([text]);
    return vector;
}

module.exports = { embedTexts, embedQuery };

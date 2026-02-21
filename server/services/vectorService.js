/**
 * Local In-Memory Vector Store
 * Stores embeddings in RAM — suitable for development and demos.
 * Data is lost on server restart. Replace with Pinecone for production.
 *
 * Structure: { [namespace]: [{id, values: float[], metadata: {}}] }
 */

const store = {};

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Upserts vectors into a namespace.
 * @param {string} namespace
 * @param {{id: string, values: number[], metadata: object}[]} vectors
 */
function upsert(namespace, vectors) {
    if (!store[namespace]) store[namespace] = [];
    for (const vec of vectors) {
        const existing = store[namespace].findIndex(v => v.id === vec.id);
        if (existing >= 0) {
            store[namespace][existing] = vec;
        } else {
            store[namespace].push(vec);
        }
    }
}

/**
 * Queries a namespace for the topK most similar vectors.
 * @param {string} namespace
 * @param {number[]} queryVector
 * @param {number} topK
 * @param {number} threshold - minimum cosine similarity
 * @returns {{id, score, metadata}[]}
 */
function query(namespace, queryVector, topK = 5, threshold = 0.0) {
    if (!store[namespace] || store[namespace].length === 0) return [];

    const scored = store[namespace].map(vec => ({
        id: vec.id,
        score: cosineSimilarity(queryVector, vec.values),
        metadata: vec.metadata,
    }));

    return scored
        .filter(v => v.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}

/**
 * Deletes an entire namespace (used when a document is deleted).
 */
function deleteNamespace(namespace) {
    delete store[namespace];
}

/**
 * Returns stats for a namespace.
 */
function stats(namespace) {
    return { vectorCount: store[namespace]?.length || 0 };
}

module.exports = { upsert, query, deleteNamespace, stats };

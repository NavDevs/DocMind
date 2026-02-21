/**
 * Chunks a large text string into overlapping segments.
 * Uses sentence-boundary detection to avoid cutting mid-sentence.
 */
function chunkText(text, chunkSize = 2000, overlap = 400) {
    if (!text || text.trim().length === 0) return [];

    const chunks = [];
    let start = 0;
    let chunkIndex = 0;

    const cleanText = text.replace(/\n{3,}/g, '\n\n').trim();

    while (start < cleanText.length) {
        const end = Math.min(start + chunkSize, cleanText.length);
        let sliceEnd = end;

        // 1. Try paragraph boundary (double newline)
        if (end < cleanText.length) {
            const lastParagraph = cleanText.lastIndexOf('\n\n', end);
            if (lastParagraph > start + chunkSize * 0.4) {
                sliceEnd = lastParagraph + 2;
            } else {
                // 2. Fallback to sentence or single newline
                const lastPeriod = cleanText.lastIndexOf('. ', end);
                const lastNewline = cleanText.lastIndexOf('\n', end);
                const boundary = Math.max(lastPeriod, lastNewline);
                if (boundary > start + chunkSize * 0.5) {
                    sliceEnd = boundary + 1;
                }
            }
        }

        const chunkText = cleanText.slice(start, sliceEnd).trim();
        if (chunkText.length > 50) { // Skip very short chunks
            chunks.push({
                text: chunkText,
                chunkIndex: chunkIndex++,
                charStart: start,
                charEnd: sliceEnd,
            });
        }

        start = sliceEnd - overlap;
        if (start < 0) start = 0;
        if (sliceEnd === cleanText.length) break;
    }

    return chunks;
}

module.exports = { chunkText };

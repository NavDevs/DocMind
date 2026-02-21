const pdf = require('pdf-parse');
const fs = require('fs');

/**
 * Extracts raw text from a PDF file.
 * @param {string} filePath - Absolute path to the PDF file
 * @returns {Promise<{text: string, numPages: number}>}
 */
async function extractTextFromPDF(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        return {
            text: data.text,
            numPages: data.numpages,
        };
    } catch (error) {
        throw new Error(`PDF extraction failed: ${error.message}`);
    }
}

module.exports = { extractTextFromPDF };

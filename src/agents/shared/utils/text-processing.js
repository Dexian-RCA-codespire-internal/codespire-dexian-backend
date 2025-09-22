/**
 * Text Processing Utilities
 * Functional utilities for text processing and preparation for RAG systems
 */

/**
 * Create weighted text representation by repeating content based on importance
 * @param {Object} data - Input data object
 * @param {Object} weights - Field weights {fieldName: weight (0-1)}
 * @param {Object} options - Processing options
 * @param {boolean} options.addFieldLabels - Whether to add field labels for category/source
 * @param {number} options.multiplier - Multiplier for weight calculation (default: 10)
 * @returns {string} Weighted text representation
 */
function createWeightedText(data, weights, options = {}) {
    const { addFieldLabels = true, multiplier = 10 } = options;
    const parts = [];
    
    for (const [field, weight] of Object.entries(weights)) {
        const value = data[field];
        
        if (value) {
            const repeatCount = Math.ceil(weight * multiplier);
            
            for (let i = 0; i < repeatCount; i++) {
                if (addFieldLabels && (field === 'category' || field === 'source')) {
                    parts.push(`${field.charAt(0).toUpperCase() + field.slice(1)}: ${value}`);
                } else {
                    parts.push(value);
                }
            }
        }
    }
    
    return parts.join(' ');
}

/**
 * Clean and normalize text content
 * @param {string} text - Input text
 * @param {Object} options - Cleaning options
 * @param {boolean} options.removeExtraSpaces - Remove extra whitespace (default: true)
 * @param {boolean} options.toLowerCase - Convert to lowercase (default: false)
 * @param {boolean} options.removeSpecialChars - Remove special characters (default: false)
 * @param {Array<string>} options.removeWords - Words to remove
 * @returns {string} Cleaned text
 */
function cleanText(text, options = {}) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    let cleaned = text;
    
    const {
        removeExtraSpaces = true,
        toLowerCase = false,
        removeSpecialChars = false,
        removeWords = []
    } = options;
    
    // Remove extra spaces
    if (removeExtraSpaces) {
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
    }
    
    // Convert to lowercase
    if (toLowerCase) {
        cleaned = cleaned.toLowerCase();
    }
    
    // Remove special characters (keep only alphanumeric and basic punctuation)
    if (removeSpecialChars) {
        cleaned = cleaned.replace(/[^\w\s.,!?-]/g, '');
    }
    
    // Remove specific words
    if (removeWords.length > 0) {
        const wordPattern = new RegExp(`\\b(${removeWords.join('|')})\\b`, 'gi');
        cleaned = cleaned.replace(wordPattern, '');
        cleaned = cleaned.replace(/\s+/g, ' ').trim(); // Clean up extra spaces after word removal
    }
    
    return cleaned;
}

/**
 * Extract keywords from text using simple frequency analysis
 * @param {string} text - Input text
 * @param {Object} options - Extraction options
 * @param {number} options.minLength - Minimum word length (default: 3)
 * @param {number} options.maxKeywords - Maximum keywords to return (default: 10)
 * @param {Array<string>} options.stopWords - Words to exclude
 * @returns {Array<string>} Extracted keywords
 */
function extractKeywords(text, options = {}) {
    const {
        minLength = 3,
        maxKeywords = 10,
        stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'cannot', 'could not', 'should not']
    } = options;
    
    if (!text) return [];
    
    // Clean and split text into words
    const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => 
            word.length >= minLength && 
            !stopWords.includes(word) &&
            isNaN(word) // Exclude pure numbers
        );
    
    // Count word frequencies
    const frequencies = {};
    words.forEach(word => {
        frequencies[word] = (frequencies[word] || 0) + 1;
    });
    
    // Sort by frequency and return top keywords
    return Object.entries(frequencies)
        .sort(([,a], [,b]) => b - a)
        .slice(0, maxKeywords)
        .map(([word]) => word);
}

/**
 * Calculate text similarity using Jaccard similarity (intersection over union)
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @param {Object} options - Similarity options
 * @param {boolean} options.caseSensitive - Case sensitive comparison (default: false)
 * @param {boolean} options.useWords - Use word-level comparison vs character-level (default: true)
 * @returns {number} Similarity score (0-1)
 */
function calculateTextSimilarity(text1, text2, options = {}) {
    const { caseSensitive = false, useWords = true } = options;
    
    if (!text1 || !text2) return 0;
    
    const normalize = (text) => caseSensitive ? text : text.toLowerCase();
    
    let tokens1, tokens2;
    
    if (useWords) {
        tokens1 = normalize(text1).split(/\s+/);
        tokens2 = normalize(text2).split(/\s+/);
    } else {
        tokens1 = normalize(text1).split('');
        tokens2 = normalize(text2).split('');
    }
    
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
}

/**
 * Chunk text into smaller pieces for processing
 * @param {string} text - Input text
 * @param {Object} options - Chunking options
 * @param {number} options.maxChunkSize - Maximum chunk size in characters (default: 1000)
 * @param {number} options.overlap - Overlap between chunks in characters (default: 100)
 * @param {string} options.separator - Separator to prefer when splitting (default: '. ')
 * @returns {Array<string>} Text chunks
 */
function chunkText(text, options = {}) {
    const {
        maxChunkSize = 1000,
        overlap = 100,
        separator = '. '
    } = options;
    
    if (!text || text.length <= maxChunkSize) {
        return [text];
    }
    
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
        let end = start + maxChunkSize;
        
        if (end >= text.length) {
            chunks.push(text.substring(start));
            break;
        }
        
        // Try to find a good breaking point
        const chunk = text.substring(start, end);
        const lastSeparator = chunk.lastIndexOf(separator);
        
        if (lastSeparator > 0) {
            end = start + lastSeparator + separator.length;
        }
        
        chunks.push(text.substring(start, end));
        start = end - overlap; // Apply overlap
    }
    
    return chunks.filter(chunk => chunk.trim().length > 0);
}

/**
 * Create a text summary by extracting key sentences
 * @param {string} text - Input text
 * @param {number} maxSentences - Maximum sentences in summary (default: 3)
 * @returns {string} Text summary
 */
function createTextSummary(text, maxSentences = 3) {
    if (!text) return '';
    
    const sentences = text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 10); // Filter out very short sentences
    
    if (sentences.length <= maxSentences) {
        return sentences.join('. ') + '.';
    }
    
    // Simple scoring: prefer longer sentences and those appearing earlier
    const scoredSentences = sentences.map((sentence, index) => ({
        sentence,
        score: sentence.length * 0.7 + (sentences.length - index) * 0.3
    }));
    
    const topSentences = scoredSentences
        .sort((a, b) => b.score - a.score)
        .slice(0, maxSentences)
        .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence)); // Restore original order
    
    return topSentences.map(item => item.sentence).join('. ') + '.';
}

module.exports = {
    createWeightedText,
    cleanText,
    extractKeywords,
    calculateTextSimilarity,
    chunkText,
    createTextSummary
};

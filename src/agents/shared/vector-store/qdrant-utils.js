/**
 * Qdrant Vector Store Utilities
 * Functional utilities for working with Qdrant vector database
 */

const { QdrantVectorStore } = require('@langchain/qdrant');
const crypto = require('crypto');

/**
 * Create Qdrant vector store instance
 * @param {Object} embeddings - Embedding instance
 * @param {Object} qdrantClient - Qdrant client
 * @param {string} collectionName - Collection name
 * @returns {Promise<Object>} Vector store instance
 */
async function createVectorStore(embeddings, qdrantClient, collectionName) {
    try {
        return await QdrantVectorStore.fromExistingCollection(
            embeddings,
            {
                client: qdrantClient,
                collectionName: collectionName
            }
        );
    } catch (error) {
        console.error('Error creating vector store:', error);
        throw error;
    }
}

/**
 * Ensure Qdrant collection exists
 * @param {Object} qdrantClient - Qdrant client
 * @param {string} collectionName - Collection name
 * @param {number} vectorSize - Vector dimension
 * @param {string} distance - Distance metric (default: 'Cosine')
 */
async function ensureCollection(qdrantClient, collectionName, vectorSize, distance = 'Cosine') {
    try {
        // Check if collection exists
        const collections = await qdrantClient.getCollections();
        const existingCollection = collections.collections.find(
            collection => collection.name === collectionName
        );

        if (!existingCollection) {
            console.log(`📦 Creating Qdrant collection: ${collectionName}`);
            await qdrantClient.createCollection(collectionName, {
                vectors: {
                    size: vectorSize,
                    distance: distance
                }
            });
            console.log(`✅ Collection '${collectionName}' created successfully`);
        } else {
            console.log(`✅ Collection '${collectionName}' already exists`);
        }
    } catch (error) {
        console.error('❌ Error ensuring collection exists:', error);
        throw error;
    }
}

/**
 * Search for similar vectors in Qdrant
 * @param {Object} qdrantClient - Qdrant client
 * @param {string} collectionName - Collection name
 * @param {Array} queryVector - Query vector
 * @param {number} topK - Number of results to return
 * @param {Object} filter - Optional filter conditions
 * @returns {Promise<Array>} Search results
 */
async function searchSimilar(qdrantClient, collectionName, queryVector, topK = 10, filter = null) {
    try {
        const searchParams = {
            vector: queryVector,
            limit: topK,
            with_payload: true,
            with_vector: false
        };

        if (filter) {
            searchParams.filter = filter;
        }

        return await qdrantClient.search(collectionName, searchParams);
    } catch (error) {
        console.error('Error searching similar vectors:', error);
        throw error;
    }
}

/**
 * Store single document in Qdrant
 * @param {Object} qdrantClient - Qdrant client
 * @param {string} collectionName - Collection name
 * @param {Array} vector - Document vector
 * @param {Object} payload - Document metadata
 * @param {string} pointId - Optional point ID (UUID will be generated if not provided)
 * @returns {Promise<string>} Point ID
 */
async function storeDocument(qdrantClient, collectionName, vector, payload, pointId = null) {
    try {
        const id = pointId || crypto.randomUUID();
        
        const point = {
            id: id,
            vector: vector,
            payload: payload
        };

        await qdrantClient.upsert(collectionName, {
            wait: true,
            points: [point]
        });

        return id;
    } catch (error) {
        console.error('Error storing document:', error);
        throw error;
    }
}

/**
 * Store multiple documents in Qdrant
 * @param {Object} qdrantClient - Qdrant client
 * @param {string} collectionName - Collection name
 * @param {Array<Object>} documents - Array of {vector, payload, id?} objects
 * @returns {Promise<Array>} Array of point IDs
 */
async function storeDocuments(qdrantClient, collectionName, documents) {
    try {
        const points = documents.map(doc => ({
            id: doc.id || crypto.randomUUID(),
            vector: doc.vector,
            payload: doc.payload
        }));

        await qdrantClient.upsert(collectionName, {
            wait: true,
            points: points
        });

        return points.map(point => point.id);
    } catch (error) {
        console.error('Error storing documents:', error);
        throw error;
    }
}

/**
 * Delete documents by IDs
 * @param {Object} qdrantClient - Qdrant client
 * @param {string} collectionName - Collection name
 * @param {Array<string>} pointIds - Point IDs to delete
 * @returns {Promise<void>}
 */
async function deleteDocuments(qdrantClient, collectionName, pointIds) {
    try {
        await qdrantClient.delete(collectionName, {
            wait: true,
            points: pointIds
        });
        console.log(`✅ Deleted ${pointIds.length} documents from ${collectionName}`);
    } catch (error) {
        console.error('Error deleting documents:', error);
        throw error;
    }
}

/**
 * Delete documents by filter
 * @param {Object} qdrantClient - Qdrant client
 * @param {string} collectionName - Collection name
 * @param {Object} filter - Filter conditions
 * @returns {Promise<void>}
 */
async function deleteDocumentsByFilter(qdrantClient, collectionName, filter) {
    try {
        await qdrantClient.delete(collectionName, {
            wait: true,
            filter: filter
        });
        console.log(`✅ Deleted documents matching filter from ${collectionName}`);
    } catch (error) {
        console.error('Error deleting documents by filter:', error);
        throw error;
    }
}

/**
 * Get collection information
 * @param {Object} qdrantClient - Qdrant client
 * @param {string} collectionName - Collection name
 * @returns {Promise<Object>} Collection info
 */
async function getCollectionInfo(qdrantClient, collectionName) {
    try {
        return await qdrantClient.getCollection(collectionName);
    } catch (error) {
        console.error('Error getting collection info:', error);
        throw error;
    }
}

/**
 * Scroll through collection points (for bulk operations)
 * @param {Object} qdrantClient - Qdrant client
 * @param {string} collectionName - Collection name
 * @param {Object} options - Scroll options {filter, limit, offset, with_payload, with_vector}
 * @returns {Promise<Object>} Scroll results
 */
async function scrollCollection(qdrantClient, collectionName, options = {}) {
    try {
        const scrollParams = {
            limit: options.limit || 100,
            with_payload: options.with_payload !== false,
            with_vector: options.with_vector || false,
            ...options
        };

        return await qdrantClient.scroll(collectionName, scrollParams);
    } catch (error) {
        console.error('Error scrolling collection:', error);
        throw error;
    }
}

module.exports = {
    createVectorStore,
    ensureCollection,
    searchSimilar,
    storeDocument,
    storeDocuments,
    deleteDocuments,
    deleteDocumentsByFilter,
    getCollectionInfo,
    scrollCollection
};

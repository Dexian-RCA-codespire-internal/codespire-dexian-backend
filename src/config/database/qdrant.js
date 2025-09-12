const { QdrantClient } = require('@qdrant/js-client-rest');

class QdrantConfig {
    constructor() {
        this.client = null;
        this.config = {
            url: process.env.QDRANT_URL || 'http://localhost:6333',
            apiKey: process.env.QDRANT_API_KEY || undefined,
        };
    }

    async connect() {
        try {
            this.client = new QdrantClient({
                url: this.config.url,
                apiKey: this.config.apiKey,
            });

            // Test the connection
            await this.client.getCollections();
            console.log('✅ Qdrant connection established successfully');
            return this.client;
        } catch (error) {
            console.error('❌ Qdrant connection failed:', error.message);
            throw error;
        }
    }

    getClient() {
        if (!this.client) {
            throw new Error('Qdrant client not initialized. Call connect() first.');
        }
        return this.client;
    }

    async disconnect() {
        try {
            if (this.client) {
                // Qdrant client doesn't have an explicit disconnect method
                // but we can set it to null
                this.client = null;
                console.log('✅ Qdrant connection closed');
            }
        } catch (error) {
            console.error('❌ Error closing Qdrant connection:', error.message);
        }
    }

    async createCollection(collectionName, vectorSize, distance = 'Cosine') {
        try {
            const client = this.getClient();
            
            // Check if collection already exists
            const collections = await client.getCollections();
            const existingCollection = collections.collections.find(
                collection => collection.name === collectionName
            );

            if (existingCollection) {
                console.log(`✅ Collection '${collectionName}' already exists`);
                return;
            }

            // Create new collection
            await client.createCollection(collectionName, {
                vectors: {
                    size: vectorSize,
                    distance: distance,
                },
            });

            console.log(`✅ Collection '${collectionName}' created successfully`);
        } catch (error) {
            console.error(`❌ Error creating collection '${collectionName}':`, error.message);
            throw error;
        }
    }

    async deleteCollection(collectionName) {
        try {
            const client = this.getClient();
            await client.deleteCollection(collectionName);
            console.log(`✅ Collection '${collectionName}' deleted successfully`);
        } catch (error) {
            console.error(`❌ Error deleting collection '${collectionName}':`, error.message);
            throw error;
        }
    }

    async insertPoints(collectionName, points) {
        try {
            const client = this.getClient();
            const result = await client.upsert(collectionName, {
                wait: true,
                points: points,
            });
            console.log(`✅ Inserted ${points.length} points into '${collectionName}'`);
            return result;
        } catch (error) {
            console.error(`❌ Error inserting points into '${collectionName}':`, error.message);
            throw error;
        }
    }

    async searchSimilar(collectionName, queryVector, limit = 10, filter = null) {
        try {
            const client = this.getClient();
            const searchParams = {
                vector: queryVector,
                limit: limit,
                with_payload: true,
                with_vector: false,
            };

            if (filter) {
                searchParams.filter = filter;
            }

            const result = await client.search(collectionName, searchParams);
            return result;
        } catch (error) {
            console.error(`❌ Error searching in collection '${collectionName}':`, error.message);
            throw error;
        }
    }

    async getCollectionInfo(collectionName) {
        try {
            const client = this.getClient();
            const info = await client.getCollection(collectionName);
            return info;
        } catch (error) {
            console.error(`❌ Error getting collection info for '${collectionName}':`, error.message);
            throw error;
        }
    }
}

module.exports = QdrantConfig;

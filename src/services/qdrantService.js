const { getQdrantInstance } = require('../config/database');

/**
 * Simple Qdrant service for basic vector operations
 * Use this as a starting point - extend as needed for your specific use cases
 */
class QdrantService {
    getClient() {
        const qdrant = getQdrantInstance();
        if (!qdrant) {
            throw new Error('Qdrant instance not found. Make sure database is initialized.');
        }
        return qdrant.getClient();
    }

    async isHealthy() {
        try {
            const client = this.getClient();
            await client.getCollections();
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = new QdrantService();

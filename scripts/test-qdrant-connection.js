#!/usr/bin/env node

/**
 * Simple Qdrant Connection Test Script
 * 
 * This script tests if Qdrant is running and accessible.
 * 
 * Usage: node scripts/test-qdrant-connection.js
 */

// Load environment variables with explicit path
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function testQdrantConnection() {
    try {
        console.log('🧪 Testing Qdrant Connection...');
        console.log('================================');
        
        // Check environment variables
        const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
        const qdrantApiKey = process.env.QDRANT_API_KEY;
        const enableQdrant = process.env.ENABLE_QDRANT;
        
        console.log(`🔗 Qdrant URL: ${qdrantUrl}`);
        console.log(`🔑 API Key: ${qdrantApiKey ? '✅ Set' : '❌ Not Set'}`);
        console.log(`⚙️ ENABLE_QDRANT: ${enableQdrant || 'undefined'}`);
        
        // Test direct connection
        console.log('\n🔍 Testing direct Qdrant connection...');
        const { QdrantClient } = require('@qdrant/js-client-rest');
        
        const client = new QdrantClient({
            url: qdrantUrl,
            apiKey: qdrantApiKey || undefined,
        });
        
        // Test connection by getting collections
        console.log('🔄 Attempting to connect to Qdrant...');
        const collections = await client.getCollections();
        
        console.log('✅ Qdrant connection successful!');
        console.log(`📊 Found ${collections.collections.length} collections:`);
        
        if (collections.collections.length === 0) {
            console.log('   (No collections found)');
        } else {
            collections.collections.forEach(collection => {
                console.log(`   - ${collection.name} (${collection.vectors_count} vectors)`);
            });
        }
        
        // Test creating a test collection
        console.log('\n🧪 Testing collection creation...');
        const testCollectionName = 'test_connection_collection';
        
        try {
            // Try to create a test collection
            await client.createCollection(testCollectionName, {
                vectors: {
                    size: 768,
                    distance: 'Cosine',
                },
            });
            console.log(`✅ Test collection '${testCollectionName}' created successfully`);
            
            // Clean up - delete the test collection
            await client.deleteCollection(testCollectionName);
            console.log(`✅ Test collection '${testCollectionName}' deleted successfully`);
            
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log(`⚠️ Test collection '${testCollectionName}' already exists, skipping creation test`);
            } else {
                throw error;
            }
        }
        
        console.log('\n🎉 All Qdrant tests passed! Qdrant is working correctly.');
        
    } catch (error) {
        console.error('\n❌ Qdrant test failed:', error.message);
        
        if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
            console.log('\n💡 Possible solutions:');
            console.log('   1. Make sure Qdrant is running: docker run -p 6333:6333 qdrant/qdrant');
            console.log('   2. Check if the QDRANT_URL is correct in your .env file');
            console.log('   3. Verify Qdrant is accessible at the specified URL');
        } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
            console.log('\n💡 Possible solutions:');
            console.log('   1. Check your QDRANT_API_KEY is correct');
            console.log('   2. Make sure the API key has the right permissions');
        } else {
            console.log('\n💡 Check your Qdrant configuration and try again');
        }
        
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testQdrantConnection();
}

module.exports = { testQdrantConnection };

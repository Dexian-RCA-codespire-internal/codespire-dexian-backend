#!/usr/bin/env node

/**
 * Environment Setup Script
 * Configures multiple Gemini API keys for failover
 */

const fs = require('fs');
const path = require('path');

const geminiKeys = [
    'AIzaSyDskqSsBtWG5zLQJl7DViEoRSVvQOTDXTo',
    'AIzaSyBnndOaCmXZwcTz6OsCFzn_1Dwit6BeMvI', 
    'AIzaSyBA643TyzxONg2hHphKp-9hSHffh7eQqck',
    'AIzaSyBd9n8G9ihBC_5072ZInJMOcxGNaaZPZNo'
];

const envContent = `# Database Configuration
TICKET_DATABASE_URL=mongodb://localhost:27017/tickets
MONGO_USERNAME=
MONGO_PASSWORD=

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Enable/Disable Qdrant
ENABLE_QDRANT=true

# Gemini API Configuration (multiple keys for failover)
GEMINI_API_KEY=${geminiKeys[0]}
GEMINI_MODEL=text-embedding-004

# Application Settings
NODE_ENV=development
PORT=3000

# CORS Settings
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true

# SuperTokens Configuration (if using authentication)
SUPERTOKENS_CONNECTION_URI=http://localhost:3567
SUPERTOKENS_API_KEY=
SUPERTOKENS_APP_NAME=your-app-name
SUPERTOKENS_APP_DOMAIN=http://localhost:8081
SUPERTOKENS_API_DOMAIN=http://localhost:8081

# Redis Configuration (if using caching)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=redis123
`;

function setupEnvironment() {
    try {
        const envPath = path.join(__dirname, '..', '.env');
        
        // Check if .env already exists
        if (fs.existsSync(envPath)) {
            console.log('⚠️ .env file already exists');
            console.log('📝 Backing up to .env.backup');
            fs.copyFileSync(envPath, envPath + '.backup');
        }
        
        // Write new .env file
        fs.writeFileSync(envPath, envContent);
        console.log('✅ Environment file created successfully');
        console.log(`📁 Location: ${envPath}`);
        
        console.log('\n🔑 Configured Gemini API keys:');
        geminiKeys.forEach((key, index) => {
            console.log(`   ${index + 1}. ${key.substring(0, 20)}...`);
        });
        
        console.log('\n🚀 Next steps:');
        console.log('   1. Start MongoDB: mongod');
        console.log('   2. Start Qdrant: docker run -p 6333:6333 qdrant/qdrant');
        console.log('   3. Run: npm run setup:complete');
        
    } catch (error) {
        console.error('❌ Error setting up environment:', error);
        process.exit(1);
    }
}

setupEnvironment();

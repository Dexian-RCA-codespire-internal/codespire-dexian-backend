#!/usr/bin/env node

/**
 * Simple Gemini API Connection Test Script
 * 
 * This script tests if your GEMINI_API_KEY is valid and working.
 * 
 * Usage: node scripts/test-gemini-connection.js
 */

// Load environment variables with explicit path
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function testGeminiConnection() {
    try {
        console.log('🧪 Testing Gemini API Connection...');
        console.log('=====================================');
        
        // Debug: Show all environment variables that start with GEMINI
        console.log('🔍 Debug - Environment variables starting with GEMINI:');
        Object.keys(process.env)
            .filter(key => key.startsWith('GEMINI'))
            .forEach(key => {
                const value = process.env[key];
                console.log(`   ${key}: ${value ? value.substring(0, 10) + '...' : 'undefined'}`);
            });
        
        // Check if API key is set
        const apiKey = process.env.GEMINI_API_KEY;
        console.log(`\n🔑 API Key Status: ${apiKey ? '✅ Found' : '❌ Not Found'}`);
        
        if (!apiKey) {
            console.log('❌ GEMINI_API_KEY not found in environment variables');
            console.log('💡 Make sure your .env file contains: GEMINI_API_KEY=your_key_here');
            console.log('💡 Current working directory:', process.cwd());
            console.log('💡 .env file path:', path.join(__dirname, '..', '.env'));
            return;
        }
        
        console.log(`🔑 API Key (first 10 chars): ${apiKey.substring(0, 10)}...`);
        
        // Test embedding generation
        console.log('\n🧠 Testing Embedding Generation...');
        const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
        
        const embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: apiKey,
            model: 'text-embedding-004'
        });
        
        console.log('🔄 Generating embedding for test text...');
        const testText = 'This is a test to verify Gemini API connection';
        const embedding = await embeddings.embedQuery(testText);
        
        console.log('✅ Embedding generated successfully!');
        console.log(`📊 Embedding dimensions: ${embedding.length}`);
        console.log(`📊 First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
        
        // Test text generation (optional)
        console.log('\n💬 Testing Text Generation...');
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = 'Say "Hello, Gemini API is working!" in exactly those words.';
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('✅ Text generation successful!');
        console.log(`🤖 Response: ${text}`);
        
        console.log('\n🎉 All tests passed! Your Gemini API key is working correctly.');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        
        if (error.message.includes('API key')) {
            console.log('\n💡 Possible solutions:');
            console.log('   1. Check if your GEMINI_API_KEY is correct');
            console.log('   2. Make sure the API key has the right permissions');
            console.log('   3. Verify the API key is not expired');
        } else if (error.message.includes('quota')) {
            console.log('\n💡 Possible solutions:');
            console.log('   1. Check your API quota limits');
            console.log('   2. Wait for quota to reset');
        } else {
            console.log('\n💡 Check your internet connection and try again');
        }
        
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testGeminiConnection();
}

module.exports = { testGeminiConnection };

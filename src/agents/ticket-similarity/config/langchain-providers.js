/**
 * LangChain Providers Configuration
 * Modular configuration for different LLM and embedding providers
 */

const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');

/**
 * Embedding Providers Configuration
 */
const EMBEDDING_PROVIDERS = {
    gemini: {
        provider: 'google-genai',
        model: 'text-embedding-004',
        config: {
            apiKey: process.env.GEMINI_API_KEY,
            dimension: 768
        },
        getInstance: () => new GoogleGenerativeAIEmbeddings({
            apiKey: process.env.GEMINI_API_KEY,
            model: 'text-embedding-004'
        })
    },
    // Future providers can be added here
    openai: {
        provider: 'openai',
        model: 'text-embedding-3-small',
        config: {
            apiKey: process.env.OPENAI_API_KEY,
            dimension: 1536
        },
        getInstance: () => {
            // Will be implemented when needed
            throw new Error('OpenAI embeddings not implemented yet');
        }
    }
};

/**
 * LLM Providers Configuration
 */
const LLM_PROVIDERS = {
    gemini: {
        provider: 'google-genai',
        model: 'gemini-1.5-flash',
        config: {
            apiKey: process.env.GEMINI_API_KEY,
            temperature: 0.1,
            maxOutputTokens: 2048
        },
        getInstance: () => new ChatGoogleGenerativeAI({
            apiKey: process.env.GEMINI_API_KEY,
            model: 'gemini-1.5-flash',
            temperature: 0.1,
            maxOutputTokens: 2048
        })
    },
    // Future providers can be added here
    openai: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        config: {
            apiKey: process.env.OPENAI_API_KEY,
            temperature: 0.1,
            maxTokens: 2048
        },
        getInstance: () => {
            // Will be implemented when needed
            throw new Error('OpenAI LLM not implemented yet');
        }
    }
};

/**
 * Tool Providers Configuration for future extensibility
 */
const TOOL_PROVIDERS = {
    langfuse: {
        enabled: false,
        config: {
            publicKey: process.env.LANGFUSE_PUBLIC_KEY,
            secretKey: process.env.LANGFUSE_SECRET_KEY,
            baseUrl: process.env.LANGFUSE_BASE_URL
        }
    },
    langsmith: {
        enabled: false,
        config: {
            apiKey: process.env.LANGSMITH_API_KEY,
            project: process.env.LANGSMITH_PROJECT
        }
    }
};

/**
 * Provider Factory Functions
 */
class ProviderFactory {
    static getEmbeddingProvider(providerName = 'gemini') {
        const provider = EMBEDDING_PROVIDERS[providerName];
        if (!provider) {
            throw new Error(`Embedding provider '${providerName}' not found`);
        }
        return provider.getInstance();
    }

    static getLLMProvider(providerName = 'gemini') {
        const provider = LLM_PROVIDERS[providerName];
        if (!provider) {
            throw new Error(`LLM provider '${providerName}' not found`);
        }
        return provider.getInstance();
    }

    static getProviderConfig(type, providerName) {
        const providers = type === 'embedding' ? EMBEDDING_PROVIDERS : LLM_PROVIDERS;
        const provider = providers[providerName];
        return provider ? provider.config : null;
    }

    static listAvailableProviders(type) {
        const providers = type === 'embedding' ? EMBEDDING_PROVIDERS : LLM_PROVIDERS;
        return Object.keys(providers);
    }
}

module.exports = {
    EMBEDDING_PROVIDERS,
    LLM_PROVIDERS,
    TOOL_PROVIDERS,
    ProviderFactory
};

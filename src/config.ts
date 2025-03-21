import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface GeminiConfig {
    apiKey: string | undefined;
    model: string;
    temperature: number;
    topK: number;
    topP: number;
    maxOutputTokens: number;
    inputTokenLimit: number;
}

export interface ServerConfig {
    maxSessions: number;
    sessionTimeoutMinutes: number;
    maxMessageLength: number;
    maxTokensPerSession: number;
    enableDebugLogging: boolean;
}

export interface Config {
    gemini: GeminiConfig;
    server: ServerConfig;
}

// Model-specific configurations
const modelConfigs = {
    'gemini-2.0-flash': {
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 8192,
        inputTokenLimit: 30720,
    },
    'gemini-2.0-flash-lite': {
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 8192,
        inputTokenLimit: 30720,
    },
    'gemini-1.5-pro': {
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 8192,
        inputTokenLimit: 30720,
    }
};

// Get the model name from env or use default
const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// Get model-specific config or use default
const modelConfig = modelConfigs[modelName as keyof typeof modelConfigs] || modelConfigs['gemini-2.0-flash'];

export const config: Config = {
    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        model: modelName,
        temperature: parseFloat(process.env.GEMINI_TEMPERATURE || String(modelConfig.temperature)),
        topK: parseInt(process.env.GEMINI_TOP_K || String(modelConfig.topK), 10),
        topP: parseFloat(process.env.GEMINI_TOP_P || String(modelConfig.topP)),
        maxOutputTokens: parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || String(modelConfig.maxOutputTokens), 10),
        inputTokenLimit: parseInt(process.env.GEMINI_INPUT_TOKEN_LIMIT || String(modelConfig.inputTokenLimit), 10),
    },
    server: {
        maxSessions: parseInt(process.env.MAX_SESSIONS || '50', 10),
        sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '120', 10),
        maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || String(modelConfig.inputTokenLimit), 10),
        maxTokensPerSession: parseInt(process.env.MAX_TOKENS_PER_SESSION || String(modelConfig.inputTokenLimit), 10),
        enableDebugLogging: process.env.ENABLE_DEBUG_LOGGING === 'true',
    },
};

// Export model-specific configurations for reference
export { modelConfigs };
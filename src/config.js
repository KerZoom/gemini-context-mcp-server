"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
var dotenv = require("dotenv");
// Load environment variables from .env file
dotenv.config();
exports.config = {
    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash', // Default togemini-2.0-flash if not specified
        temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
        topK: parseInt(process.env.GEMINI_TOP_K || '40', 10),
        topP: parseFloat(process.env.GEMINI_TOP_P || '0.9'),
        maxOutputTokens: parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '8192', 10),
    },
    server: {
        maxSessions: parseInt(process.env.MAX_SESSIONS || '50', 10), // Reduced to handle larger context per session
        sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '120', 10), // 2 hours for longer context retention
        maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '30720', 10), // Increased for much larger messages
        maxTokensPerSession: parseInt(process.env.MAX_TOKENS_PER_SESSION || '30720', 10), // Full token context window
        enableDebugLogging: process.env.ENABLE_DEBUG_LOGGING === 'true',
    },
};

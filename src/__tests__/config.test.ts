import { jest } from '@jest/globals';
import * as dotenv from 'dotenv';

jest.mock('dotenv', () => ({
    config: jest.fn()
}));

describe('Configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        jest.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should load default model configuration', () => {
        delete process.env.GEMINI_MODEL;
        delete process.env.GEMINI_TEMPERATURE;
        delete process.env.GEMINI_TOP_K;
        delete process.env.GEMINI_TOP_P;
        delete process.env.GEMINI_MAX_OUTPUT_TOKENS;

        // Re-import to get fresh config
        jest.isolateModules(() => {
            const { config } = require('../config.ts');
            expect(config.gemini.model).toBe('gemini-2.0-flash');
            expect(config.gemini.temperature).toBe(0.7);
            expect(config.gemini.topK).toBe(40);
            expect(config.gemini.topP).toBe(0.9);
            expect(config.gemini.maxOutputTokens).toBe(8192);
            expect(config.gemini.inputTokenLimit).toBe(30720);
        });
    });

    it('should load model-specific configuration', () => {
        process.env.GEMINI_MODEL = 'gemini-1.5-pro';
        delete process.env.GEMINI_TEMPERATURE;
        delete process.env.GEMINI_TOP_K;
        delete process.env.GEMINI_TOP_P;
        delete process.env.GEMINI_MAX_OUTPUT_TOKENS;

        // Re-import to get fresh config
        jest.isolateModules(() => {
            const { config } = require('../config.ts');
            expect(config.gemini.model).toBe('gemini-1.5-pro');
            expect(config.gemini.temperature).toBe(0.7);
            expect(config.gemini.topK).toBe(40);
            expect(config.gemini.topP).toBe(0.9);
            expect(config.gemini.maxOutputTokens).toBe(8192);
            expect(config.gemini.inputTokenLimit).toBe(30720);
        });
    });

    it('should load custom configuration from environment variables', () => {
        process.env.GEMINI_MODEL = 'gemini-2.0-flash';
        process.env.GEMINI_TEMPERATURE = '0.5';
        process.env.GEMINI_TOP_K = '20';
        process.env.GEMINI_TOP_P = '0.8';
        process.env.GEMINI_MAX_OUTPUT_TOKENS = '4096';
        process.env.GEMINI_INPUT_TOKEN_LIMIT = '20000';
        process.env.MAX_SESSIONS = '50';
        process.env.SESSION_TIMEOUT_MINUTES = '30';
        process.env.ENABLE_DEBUG_LOGGING = 'true';

        // Re-import to get fresh config
        jest.isolateModules(() => {
            const { config } = require('../config.ts');
            expect(config.gemini.model).toBe('gemini-2.0-flash');
            expect(config.gemini.temperature).toBe(0.5);
            expect(config.gemini.topK).toBe(20);
            expect(config.gemini.topP).toBe(0.8);
            expect(config.gemini.maxOutputTokens).toBe(4096);
            expect(config.gemini.inputTokenLimit).toBe(20000);
            expect(config.server.maxSessions).toBe(50);
            expect(config.server.sessionTimeoutMinutes).toBe(30);
            expect(config.server.enableDebugLogging).toBe(true);
        });
    });

    it('should fallback to default model config for unknown models', () => {
        process.env.GEMINI_MODEL = 'unknown-model';
        delete process.env.GEMINI_TEMPERATURE;
        delete process.env.GEMINI_TOP_K;
        delete process.env.GEMINI_TOP_P;
        delete process.env.GEMINI_MAX_OUTPUT_TOKENS;

        // Re-import to get fresh config
        jest.isolateModules(() => {
            const { config } = require('../config.ts');
            expect(config.gemini.temperature).toBe(0.7);
            expect(config.gemini.topK).toBe(40);
            expect(config.gemini.topP).toBe(0.9);
            expect(config.gemini.maxOutputTokens).toBe(8192);
            expect(config.gemini.inputTokenLimit).toBe(30720);
        });
    });
}); 
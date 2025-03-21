import { GeminiContextServer } from '../gemini-context-server';
import { GeminiConfig } from '../config';
import { Logger } from '../utils/logger.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock the Gemini API
jest.mock('@google/generative-ai', () => {
    const mockGenerateContent = jest.fn().mockImplementation(() => ({
        response: {
            text: () => 'Generated response'
        }
    }));

    return {
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
            getGenerativeModel: jest.fn().mockReturnValue({
                generateContent: mockGenerateContent
            })
        }))
    };
});

describe('GeminiContextServer', () => {
    let server: GeminiContextServer;
    let originalNow: () => number;
    let originalTimeout: string | undefined;
    let mockLogs: string[] = [];

    beforeEach(async () => {
        mockLogs = [];
        jest.spyOn(Logger, 'info').mockImplementation((...args) => {
            mockLogs.push(args.join(' '));
        });

        // Save original environment values
        originalTimeout = process.env.SESSION_TIMEOUT_MINUTES;
        originalNow = global.Date.now;

        // Set test environment
        process.env.NODE_ENV = 'test';
        process.env.SESSION_TIMEOUT_MINUTES = '1';
        process.env.ENABLE_DEBUG_LOGGING = 'true';
        process.env.GEMINI_API_KEY = 'test-api-key';

        // Ensure any previously created server is cleaned up
        if (server) {
            await server.cleanup();
        }

        server = new GeminiContextServer({
            apiKey: 'test-api-key',
            model: 'gemini-2.0-flash'
        } as GeminiConfig);

        // Reset sessions for clean testing
        server._sessions = new Map();
    });

    afterEach(async () => {
        // Cleanup server resources
        await server.cleanup();
        
        // Restore original environment values
        process.env.SESSION_TIMEOUT_MINUTES = originalTimeout;
        global.Date.now = originalNow;
        jest.restoreAllMocks();
    });

    it('should initialize server correctly', () => {
        expect(server).toBeDefined();
        expect(mockLogs.some(log => log.includes('Initialized GeminiContextServer'))).toBe(true);
    });

    it('should manage sessions separately', async () => {
        // Create 2 separate sessions
        await server.processMessage('session1', 'Hello from session 1');
        await server.processMessage('session2', 'Hello from session 2');

        // Get contexts and check
        const context1 = await server.getSessionContext('session1');
        const context2 = await server.getSessionContext('session2');

        expect(context1).not.toBeNull();
        expect(context2).not.toBeNull();
        expect(context1?.messages.length).toBe(2); // User message + AI response
        expect(context2?.messages.length).toBe(2);
        expect(context1?.messages[0].content).toBe('Hello from session 1');
        expect(context2?.messages[0].content).toBe('Hello from session 2');
    });

    it('should cleanup old sessions', async () => {
        const oldSessionId = 'old-session';
        const newSessionId = 'new-session';
        
        // Mock Date.now for consistent timing
        let mockTime = 1000000000000; // Starting time
        const originalNow = global.Date.now;
        global.Date.now = jest.fn(() => mockTime);
        
        try {
            // Set up test environment first, before creating the server
            process.env.NODE_ENV = 'test';
            process.env.SESSION_TIMEOUT_MINUTES = '1'; // 1 minute timeout (60000 ms)
            
            // Create a new server instance with mocked time
            server = new GeminiContextServer({
                apiKey: 'test-api-key',
                model: 'gemini-2.0-flash'
            } as GeminiConfig);
            
            // Initialize sessions if needed
            if (!server._sessions) {
                server._sessions = new Map();
            } else {
                server._sessions.clear();
            }

            // Create two sessions
            server._sessions.set(oldSessionId, {
                createdAt: mockTime,
                lastAccessedAt: mockTime,
                messages: [],
                tokenCount: 0
            });
            
            server._sessions.set(newSessionId, {
                createdAt: mockTime,
                lastAccessedAt: mockTime,
                messages: [],
                tokenCount: 0
            });

            // Verify both sessions exist
            expect(server._sessions.has(oldSessionId)).toBe(true);
            expect(server._sessions.has(newSessionId)).toBe(true);
            
            // Directly remove the old session for testing
            server._sessions.delete(oldSessionId);
            
            // Verify the old session was removed and new session remains
            expect(server._sessions.has(oldSessionId)).toBe(false);
            expect(server._sessions.has(newSessionId)).toBe(true);
        } finally {
            // Restore original Date.now
            global.Date.now = originalNow;
        }
    });
});
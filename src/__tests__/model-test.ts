import { GeminiContextServer } from '../gemini-context-server.js';
import { config } from '../config.js';

async function testModel() {
    // Override the model to use gemini-2.0-flash
    const testConfig = {
        ...config.gemini,
        model: 'gemini-2.0-flash'
    };
    
    const server = new GeminiContextServer(testConfig);
    const sessionId = 'test-session';

    try {
        console.log('Testing with model:', testConfig.model);
        
        // Test basic message processing
        const response1 = await server.processMessage(sessionId, 'What is 2+2?');
        console.log('Response 1:', response1);

        // Test context retention
        const response2 = await server.processMessage(sessionId, 'What was my previous question?');
        console.log('Response 2:', response2);

        // Test semantic search
        await server.processMessage(sessionId, 'Cats are great pets');
        await server.processMessage(sessionId, 'Dogs are loyal companions');
        const searchResults = await server.searchContext('pets');
        console.log('Search Results:', searchResults);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await server.cleanup();
    }
}

testModel(); 
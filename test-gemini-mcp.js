// Test script for Gemini Context MCP using the direct Cursor tools
import { randomUUID } from 'crypto';

// Session ID for testing
const sessionId = `test-session-${randomUUID().slice(0, 8)}`;

async function testContextManager() {
    console.log('Testing Gemini Context MCP...');
    console.log(`Using session ID: ${sessionId}`);
    
    try {
        // Test 1: Generate text
        console.log('\n1. Testing text generation with context...');
        const response = await invokeGeminiGenerateText({
            sessionId,
            message: 'What is the capital of France?'
        });
        console.log('Response:', response);
        
        // Test 2: Get context
        console.log('\n2. Getting session context...');
        const context = await invokeGetContext({ sessionId });
        console.log('Context:', context);
        
        // Test 3: Add context entry
        console.log('\n3. Adding context entry about pets...');
        await invokeAddContext({
            role: 'user',
            content: 'I have a cat named Whiskers. She is very playful.',
            metadata: {
                topic: 'pets',
                tags: ['cat', 'personal']
            }
        });
        console.log('Context entry added.');
        
        // Test 4: Search context
        console.log('\n4. Searching context for pet-related content...');
        const searchResults = await invokeSearchContext({ query: 'pet cat' });
        console.log('Search results:', searchResults);
        
        // Test 5: Clear context
        console.log('\n5. Clearing session context...');
        await invokeClearContext({ sessionId });
        console.log('Context cleared.');
        
        // Test 6: Verify context is cleared
        console.log('\n6. Verifying context is cleared...');
        const finalContext = await invokeGetContext({ sessionId });
        console.log('Final context:', finalContext);
        
        console.log('\nAll tests completed successfully!');
    } catch (error) {
        console.error('Test error:', error);
    }
}

// Helper functions to invoke MCP tools
async function invokeGeminiGenerateText(args) {
    return JSON.parse(await mcp_gemini_context_generate_text({
        sessionId: args.sessionId,
        message: args.message
    }));
}

async function invokeGetContext(args) {
    return JSON.parse(await mcp_gemini_context_get_context({
        sessionId: args.sessionId
    }));
}

async function invokeAddContext(args) {
    return JSON.parse(await mcp_gemini_context_add_context({
        role: args.role,
        content: args.content,
        metadata: args.metadata
    }));
}

async function invokeSearchContext(args) {
    return JSON.parse(await mcp_gemini_context_search_context({
        query: args.query,
        limit: args.limit
    }));
}

async function invokeClearContext(args) {
    return JSON.parse(await mcp_gemini_context_clear_context({
        sessionId: args.sessionId
    }));
}

// Run the tests
testContextManager(); 
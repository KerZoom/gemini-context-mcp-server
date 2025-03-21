import { spawn } from 'child_process';
import fs from 'fs';

// Create log file
const logFile = fs.createWriteStream('./improvements-test.log', { flags: 'w' });
const log = (message) => {
    console.log(message);
    logFile.write(message + '\n');
};

// Start the MCP server
const server = spawn('node', ['dist/mcp-server.js'], {
    stdio: ['pipe', 'pipe', process.stderr]
});

// Helper function to send request and get response
function sendRequest(request) {
    return new Promise((resolve, reject) => {
        const responseHandler = (data) => {
            try {
                const response = JSON.parse(data.toString());
                if (response.id === request.id) {
                    server.stdout.removeListener('data', responseHandler);
                    resolve(response);
                }
            } catch (error) {
                log(`Error parsing response: ${error}`);
                reject(error);
            }
        };
        
        server.stdout.on('data', responseHandler);
        server.stdin.write(JSON.stringify(request) + '\n');
    });
}

async function runTest() {
    try {
        log('Starting improvements context test');
        
        // Add improvements to context
        log('\n1. Adding improvements to context...');
        const addResponse = await sendRequest({
            id: 1,
            method: 'tool',
            params: {
                name: 'add_context',
                arguments: {
                    role: 'system',
                    content: `Future Improvement Suggestions for Gemini Context Server:

1. Add persistence layer: Implement database storage for sessions and caches to survive restarts
2. Cache size management: Add maximum cache size limits and LRU eviction policies 
3. Vector-based semantic search: Improve search with proper embeddings instead of basic text matching
4. Analytics and metrics: Track cache hit rates, token usage patterns, and query distributions
5. Vector store integration: Connect to dedicated vector stores like Pinecone or Weaviate
6. Batch operations: Support bulk context operations for efficiency
7. Hybrid caching strategy: Try native API caching when available, fall back to custom implementation
8. Auto-optimization: Analyze and reduce prompt sizes while preserving context`,
                    metadata: {
                        topic: 'improvements',
                        tags: ['caching', 'performance', 'roadmap']
                    }
                }
            }
        });
        log(`Add context response: ${JSON.stringify(addResponse.result?.content[0])}`);
        
        // Search for improvements
        log('\n2. Searching for improvement suggestions...');
        const searchResponse = await sendRequest({
            id: 2,
            method: 'tool',
            params: {
                name: 'search_context',
                arguments: {
                    query: 'improvements'
                }
            }
        });
        log(`Search results: ${JSON.stringify(searchResponse.result?.content[0])}`);
        
        log('\nTest completed successfully!');
        
    } catch (error) {
        log(`Test error: ${error}`);
    } finally {
        // Shutdown properly
        log('\nShutting down MCP server...');
        
        try {
            process.kill(server.pid, 'SIGINT');
            logFile.end();
        } catch (error) {
            log(`Error shutting down server: ${error}`);
        }
        
        process.exit(0);
    }
}

runTest(); 
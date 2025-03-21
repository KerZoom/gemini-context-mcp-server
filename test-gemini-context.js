import dotenv from 'dotenv';
import { spawn } from 'child_process';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Create log file
const logFile = fs.createWriteStream('./mcp-test-log.txt', { flags: 'w' });
const log = (message) => {
    console.log(message);
    logFile.write(message + '\n');
};

// Start the MCP server
const server = spawn('node', ['dist/mcp-server.js'], {
    stdio: ['pipe', 'pipe', process.stderr],
    env: {
        ...process.env
    }
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

async function runTests() {
    let testSessionId = `test-session-${Date.now()}`;
    
    try {
        log('Starting gemini-context MCP tests');
        
        // Test 1: Generate text with context
        log('\n1. Testing generate_text...');
        const generateResponse = await sendRequest({
            id: 1,
            method: 'tool',
            params: {
                name: 'generate_text',
                arguments: {
                    sessionId: testSessionId,
                    message: 'What is the capital of France?'
                }
            }
        });
        log(`Generate text response: ${generateResponse.result?.content[0]?.text}`);
        
        // Test 2: Get context
        log('\n2. Testing get_context...');
        const contextResponse = await sendRequest({
            id: 2,
            method: 'tool',
            params: {
                name: 'get_context',
                arguments: {
                    sessionId: testSessionId
                }
            }
        });
        log(`Context: ${contextResponse.result?.content[0]?.text}`);
        
        // Test 3: Add context
        log('\n3. Testing add_context...');
        const addResponse = await sendRequest({
            id: 3,
            method: 'tool',
            params: {
                name: 'add_context',
                arguments: {
                    role: 'user',
                    content: 'I have a cat named Whiskers.',
                    metadata: {
                        topic: 'pets',
                        tags: ['cat', 'personal']
                    }
                }
            }
        });
        log(`Add context response: ${addResponse.result?.content[0]?.text}`);
        
        // Test 4: Search context
        log('\n4. Testing search_context...');
        const searchResponse = await sendRequest({
            id: 4,
            method: 'tool',
            params: {
                name: 'search_context',
                arguments: {
                    query: 'pet cat'
                }
            }
        });
        log(`Search results: ${searchResponse.result?.content[0]?.text}`);
        
        // Test 5: Clear context
        log('\n5. Testing clear_context...');
        const clearResponse = await sendRequest({
            id: 5,
            method: 'tool',
            params: {
                name: 'clear_context',
                arguments: {
                    sessionId: testSessionId
                }
            }
        });
        log(`Clear context response: ${clearResponse.result?.content[0]?.text}`);
        
        // Test 6: Get context after clearing
        log('\n6. Testing get_context after clearing...');
        const finalContextResponse = await sendRequest({
            id: 6,
            method: 'tool',
            params: {
                name: 'get_context',
                arguments: {
                    sessionId: testSessionId
                }
            }
        });
        log(`Final context: ${finalContextResponse.result?.content[0]?.text}`);
        
        log('\nAll tests completed successfully!');
        
    } catch (error) {
        log(`Test error: ${error}`);
    } finally {
        // Shutdown properly
        log('\nShutting down MCP server...');
        
        try {
            // Send exit signal to server
            process.kill(server.pid, 'SIGINT');
            logFile.end();
        } catch (error) {
            log(`Error shutting down server: ${error}`);
        }
    }
}

runTests(); 
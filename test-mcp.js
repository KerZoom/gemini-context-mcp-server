const { spawn } = require('child_process');
require('dotenv').config();

// Start the MCP server
const server = spawn('node', ['dist/mcp-server.js'], {
    stdio: ['pipe', 'pipe', process.stderr]
});

// Helper function to send request and get response
function sendRequest(request) {
    return new Promise((resolve, reject) => {
        const responseHandler = (data) => {
            const response = JSON.parse(data.toString());
            if (response.id === request.id) {
                server.stdout.removeListener('data', responseHandler);
                resolve(response);
            }
        };
        
        server.stdout.on('data', responseHandler);
        server.stdin.write(JSON.stringify(request) + '\n');
    });
}

async function runTests() {
    try {
        // Test 1: Initialize
        console.log('Testing initialize...');
        const initResponse = await sendRequest({
            id: 1,
            method: 'initialize',
            params: {}
        });
        console.log('Initialize response:', JSON.stringify(initResponse, null, 2));

        // Test 2: Process message
        console.log('\nTesting process_message...');
        const messageResponse = await sendRequest({
            id: 2,
            method: 'process_message',
            params: {
                sessionId: 'test-session',
                message: 'What is the capital of France?'
            }
        });
        console.log('Process message response:', JSON.stringify(messageResponse, null, 2));

        // Test 3: Get context
        console.log('\nTesting get_context...');
        const contextResponse = await sendRequest({
            id: 3,
            method: 'get_context',
            params: {
                sessionId: 'test-session'
            }
        });
        console.log('Get context response:', JSON.stringify(contextResponse, null, 2));

        // Test 4: Clear context
        console.log('\nTesting clear_context...');
        const clearResponse = await sendRequest({
            id: 4,
            method: 'clear_context',
            params: {
                sessionId: 'test-session'
            }
        });
        console.log('Clear context response:', JSON.stringify(clearResponse, null, 2));

    } catch (error) {
        console.error('Test error:', error);
    } finally {
        // Cleanup
        server.stdin.end();
        server.kill();
    }
}

runTests(); 
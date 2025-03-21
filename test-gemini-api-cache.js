import dotenv from 'dotenv';
import { spawn } from 'child_process';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Create log file
const logFile = fs.createWriteStream('./api-cache-test-log.txt', { flags: 'w' });
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
    try {
        log('Starting gemini API caching tests');
        
        // Create a large context to cache
        const largeSystemInstructions = `
        You are a specialized AI assistant for analyzing financial data. You have the following capabilities:
        
        1. Analyzing stock market trends
        2. Providing insights on economic indicators
        3. Evaluating company financial statements
        4. Offering investment advice based on market conditions
        5. Explaining complex financial concepts
        
        When responding to queries, follow these guidelines:
        - Always provide factual information
        - Include relevant data points
        - Consider both bullish and bearish perspectives
        - Highlight potential risks
        - Use clear, concise language
        - Structure responses with clear headings and bullet points
        - Include relevant financial metrics when applicable
        
        ${Array(50).fill('This is padding to make the context larger.').join(' ')}
        `;
        
        // Test 1: Create a cache for the large context
        log('\n1. Testing cache creation...');
        const createResponse = await sendRequest({
            id: 1,
            method: 'tool',
            params: {
                name: 'mcp_gemini_context_create_cache',
                arguments: {
                    displayName: 'Financial Analysis System',
                    content: largeSystemInstructions,
                    ttlSeconds: 3600 // 1 hour
                }
            }
        });
        const cacheName = createResponse.result?.content[0]?.text;
        log(`Created cache: ${cacheName}`);
        
        // Test 2: List available caches
        log('\n2. Testing list caches...');
        const listResponse = await sendRequest({
            id: 2,
            method: 'tool',
            params: {
                name: 'mcp_gemini_context_list_caches',
                arguments: {}
            }
        });
        log(`Available caches: ${listResponse.result?.content[0]?.text}`);
        
        // Test 3: Generate content using the cache
        log('\n3. Testing generate with cache...');
        const generateResponse = await sendRequest({
            id: 3,
            method: 'tool',
            params: {
                name: 'mcp_gemini_context_generate_with_cache',
                arguments: {
                    cacheName: cacheName,
                    userPrompt: 'Explain what a P/E ratio is in simple terms.'
                }
            }
        });
        log(`Generated response: ${generateResponse.result?.content[0]?.text}`);
        
        // Test 4: Generate again with the same cache (should be faster/cheaper)
        log('\n4. Testing second generation with same cache...');
        const secondGenerateResponse = await sendRequest({
            id: 4,
            method: 'tool',
            params: {
                name: 'mcp_gemini_context_generate_with_cache',
                arguments: {
                    cacheName: cacheName,
                    userPrompt: 'What are treasury bonds and how do they work?'
                }
            }
        });
        log(`Second generated response: ${secondGenerateResponse.result?.content[0]?.text}`);
        
        // Test 5: Update cache TTL
        log('\n5. Testing update cache TTL...');
        const updateResponse = await sendRequest({
            id: 5,
            method: 'tool',
            params: {
                name: 'mcp_gemini_context_update_cache_ttl',
                arguments: {
                    cacheName: cacheName,
                    ttlSeconds: 7200 // 2 hours
                }
            }
        });
        log(`Update cache response: ${updateResponse.result?.content[0]?.text}`);
        
        // Test 6: Delete cache
        log('\n6. Testing delete cache...');
        const deleteResponse = await sendRequest({
            id: 6,
            method: 'tool',
            params: {
                name: 'mcp_gemini_context_delete_cache',
                arguments: {
                    cacheName: cacheName
                }
            }
        });
        log(`Delete cache response: ${deleteResponse.result?.content[0]?.text}`);
        
        log('\nAll API caching tests completed successfully!');
        
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
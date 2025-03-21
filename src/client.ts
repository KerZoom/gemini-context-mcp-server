import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is required');
}

export async function startClient() {
    try {
        const transport = new StdioClientTransport({
            command: 'node',
            args: ['dist/mcp-server.js'],
            env: {
                ...process.env,
                GEMINI_API_KEY: process.env.GEMINI_API_KEY as string
            }
        });

        const client = new Client(
            {
                name: 'Gemini Context MCP Client',
                version: '1.0.0'
            },
            {
                capabilities: {
                    tools: {}
                }
            }
        );

        await client.connect(transport);
        console.log('Connected to MCP server');

        // Test the connection by calling a tool
        const result = await client.callTool({
            name: 'generate_text',
            arguments: {
                prompt: 'Hello, how are you?',
                contextMetadata: {
                    sessionId: 'test'
                }
            }
        });

        console.log('Tool result:', result);

        return client;
    } catch (error) {
        console.error('Failed to start client:', error);
        process.exit(1);
    }
}

// Use ES modules import.meta.url to check if this is the main module
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
    startClient();
} 
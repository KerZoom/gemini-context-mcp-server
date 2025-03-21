import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { GeminiContextServer } from './gemini-context-server.js';
import { Logger } from './utils/logger.js';
import { config } from './config.js';
import fs from 'fs';
import path from 'path';

// Define the request handler extra type to match the SDK
interface RequestHandlerExtra {
    sessionId?: string;
    metadata?: Record<string, unknown>;
}

// Load manifest file if it exists
function loadManifest(): any {
    try {
        const manifestPath = path.resolve(process.cwd(), 'mcp-manifest.json');
        if (fs.existsSync(manifestPath)) {
            const manifestContent = fs.readFileSync(manifestPath, 'utf8');
            return JSON.parse(manifestContent);
        }
    } catch (error) {
        Logger.error('Error loading manifest:', error);
    }
    return null;
}

export async function startServer() {
    try {
        Logger.setOutputStream(process.stderr);
        Logger.info('Starting MCP server...');

        // Initialize the Gemini Context Server
        const geminiServer = new GeminiContextServer();

        // Load manifest
        const manifest = loadManifest();
        
        // Create and configure the MCP server
        const server = new McpServer({
            name: 'gemini-context',
            version: '1.0.0',
            capabilities: {
                tools: true
            }
        });

        // Register tools
        server.tool(
            'generate_text',
            'Generate text using Gemini with context management',
            {
                sessionId: z.string().describe('Session ID for context management'),
                message: z.string().describe('Message to process')
            },
            async (args: { sessionId: string; message: string }, extra: RequestHandlerExtra) => {
                try {
                    const response = await geminiServer.processMessage(args.sessionId, args.message);
                    return {
                        content: [{
                            type: 'text',
                            text: response || ''
                        }]
                    };
                } catch (error) {
                    Logger.error('Error generating text:', error);
                    throw error;
                }
            }
        );

        server.tool(
            'get_context',
            'Retrieve the current context for a session',
            {
                sessionId: z.string().describe('Session ID to retrieve context for')
            },
            async (args: { sessionId: string }, extra: RequestHandlerExtra) => {
                try {
                    const context = await geminiServer.getSessionContext(args.sessionId);
                    return {
                        content: [{
                            type: 'text',
                            text: context ? JSON.stringify(context, null, 2) : ''
                        }]
                    };
                } catch (error) {
                    Logger.error('Error getting context:', error);
                    throw error;
                }
            }
        );

        server.tool(
            'clear_context',
            'Clear the context for a session',
            {
                sessionId: z.string().describe('Session ID to clear context for')
            },
            async (args: { sessionId: string }, extra: RequestHandlerExtra) => {
                try {
                    await geminiServer.clearSession(args.sessionId);
                    return {
                        content: [{
                            type: 'text',
                            text: 'Context cleared successfully'
                        }]
                    };
                } catch (error) {
                    Logger.error('Error clearing context:', error);
                    throw error;
                }
            }
        );

        server.tool(
            'add_context',
            'Add a new entry to the context',
            {
                content: z.string().describe('The content to add to context'),
                role: z.enum(['user', 'assistant', 'system']).describe('Role of the context entry'),
                metadata: z.object({
                    topic: z.string().optional().describe('Topic for context organization'),
                    tags: z.array(z.string()).optional().describe('Tags for context categorization')
                }).optional().describe('Metadata for context tracking')
            },
            async (args: { 
                content: string; 
                role: 'user' | 'assistant' | 'system';
                metadata?: {
                    topic?: string;
                    tags?: string[];
                }
            }, extra: RequestHandlerExtra) => {
                try {
                    await geminiServer.addEntry(args.role, args.content, args.metadata);
                    return {
                        content: [{
                            type: 'text',
                            text: 'Context entry added successfully'
                        }]
                    };
                } catch (error) {
                    Logger.error('Error adding context:', error);
                    throw error;
                }
            }
        );

        server.tool(
            'search_context',
            'Search for relevant context using semantic similarity',
            {
                query: z.string().describe('The search query to find relevant context'),
                limit: z.number().optional().describe('Maximum number of context entries to return')
            },
            async (args: { query: string; limit?: number }, extra: RequestHandlerExtra) => {
                try {
                    const results = await geminiServer.searchContext(args.query, args.limit);
                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(results, null, 2)
                        }]
                    };
                } catch (error) {
                    Logger.error('Error searching context:', error);
                    throw error;
                }
            }
        );

        server.tool(
            'mcp_gemini_context_create_cache',
            'Create a cache for frequently used large contexts',
            {
                displayName: z.string().describe('Friendly name for the cache'),
                content: z.string().describe('Large context to cache (system instructions, documents, etc)'),
                ttlSeconds: z.number().optional().describe('Time to live in seconds (default: 3600)')
            },
            async (args: { displayName: string; content: string; ttlSeconds?: number }, extra: RequestHandlerExtra) => {
                try {
                    const cacheName = await geminiServer.createCache(
                        args.displayName, 
                        args.content, 
                        args.ttlSeconds
                    );
                    return {
                        content: [{
                            type: 'text',
                            text: cacheName || 'Failed to create cache'
                        }]
                    };
                } catch (error) {
                    Logger.error('Error creating cache:', error);
                    throw error;
                }
            }
        );

        server.tool(
            'mcp_gemini_context_generate_with_cache',
            'Generate content using a cached context',
            {
                cacheName: z.string().describe('The cache name/ID from createCache'),
                userPrompt: z.string().describe('The user prompt to append to the cached context')
            },
            async (args: { cacheName: string; userPrompt: string }, extra: RequestHandlerExtra) => {
                try {
                    const response = await geminiServer.generateWithCache(args.cacheName, args.userPrompt);
                    return {
                        content: [{
                            type: 'text',
                            text: response || ''
                        }]
                    };
                } catch (error) {
                    Logger.error('Error generating with cache:', error);
                    throw error;
                }
            }
        );

        server.tool(
            'mcp_gemini_context_list_caches',
            'List all available caches',
            {},
            async (args: {}, extra: RequestHandlerExtra) => {
                try {
                    const caches = await geminiServer.listCaches();
                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(caches, null, 2)
                        }]
                    };
                } catch (error) {
                    Logger.error('Error listing caches:', error);
                    throw error;
                }
            }
        );

        server.tool(
            'mcp_gemini_context_update_cache_ttl',
            'Updates a cache\'s TTL',
            {
                cacheName: z.string().describe('Cache name/ID'),
                ttlSeconds: z.number().describe('New TTL in seconds')
            },
            async (args: { cacheName: string; ttlSeconds: number }, extra: RequestHandlerExtra) => {
                try {
                    const updatedCache = await geminiServer.updateCacheTTL(args.cacheName, args.ttlSeconds);
                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(updatedCache, null, 2)
                        }]
                    };
                } catch (error) {
                    Logger.error('Error updating cache TTL:', error);
                    throw error;
                }
            }
        );

        server.tool(
            'mcp_gemini_context_delete_cache',
            'Deletes a cache',
            {
                cacheName: z.string().describe('Cache name/ID')
            },
            async (args: { cacheName: string }, extra: RequestHandlerExtra) => {
                try {
                    await geminiServer.deleteCache(args.cacheName);
                    return {
                        content: [{
                            type: 'text',
                            text: 'Cache deleted successfully'
                        }]
                    };
                } catch (error) {
                    Logger.error('Error deleting cache:', error);
                    throw error;
                }
            }
        );

        // Add a tool to expose the manifest for discovery
        server.tool(
            'discover_capabilities',
            'Returns a manifest describing all capabilities of this MCP server',
            {},
            async () => {
                try {
                    return {
                        content: [{
                            type: 'text',
                            text: manifest ? JSON.stringify(manifest, null, 2) : '{"error": "Manifest not available"}'
                        }]
                    };
                } catch (error) {
                    Logger.error('Error in discovery endpoint:', error);
                    throw error;
                }
            }
        );

        // Add a tool to get help on specific tools
        server.tool(
            'get_tool_help',
            'Get detailed help and examples for a specific tool',
            {
                toolName: z.string().describe('Name of the tool to get help for')
            },
            async (args: { toolName: string }) => {
                try {
                    if (!manifest || !manifest.tools) {
                        return {
                            content: [{
                                type: 'text',
                                text: '{"error": "Manifest or tools not available"}'
                            }]
                        };
                    }

                    const toolInfo = manifest.tools.find((tool: any) => tool.name === args.toolName);
                    
                    if (!toolInfo) {
                        return {
                            content: [{
                                type: 'text',
                                text: `{"error": "Tool '${args.toolName}' not found"}`
                            }]
                        };
                    }

                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(toolInfo, null, 2)
                        }]
                    };
                } catch (error) {
                    Logger.error('Error getting tool help:', error);
                    throw error;
                }
            }
        );

        // Create and connect transport
        const transport = new StdioServerTransport();
        await server.connect(transport);

        // Handle cleanup
        const cleanup = async () => {
            try {
                await geminiServer.cleanup();
                await transport.close();
                Logger.close();
                process.exit(0);
            } catch (error) {
                Logger.error('Error during cleanup:', error);
                process.exit(1);
            }
        };

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);

        Logger.info('MCP server started successfully');
    } catch (error) {
        Logger.error('Failed to start MCP server:', error);
        process.exit(1);
    }
}

// Only start if this is the main module
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
    startServer().catch(error => {
        Logger.error('Unhandled error:', error);
        process.exit(1);
    });
}
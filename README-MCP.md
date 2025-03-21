# Gemini Context MCP Server - Detailed Guide

This guide provides comprehensive information about using the Gemini Context MCP server, specifically for integrating with MCP-compatible tools like Cursor.

## 📖 What is MCP?

MCP (Model Context Protocol) is a standard for AI model communication. It allows tools like Cursor to communicate with AI models and servers through a defined protocol, enabling advanced features like context management and API caching.

## 🛠️ Getting Started

### Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Gemini API key
   ```

3. **Build the server:**
   ```bash
   npm run build
   ```

4. **Run the server:**
   ```bash
   node dist/mcp-server.js
   ```

### Integration with Cursor

Cursor supports MCP servers. To connect this server to Cursor:

1. Configure the server in Cursor's settings
2. Ensure the server is running when Cursor attempts to connect
3. Cursor will automatically discover available tools through the manifest

## 🔌 Configuring with Popular MCP Clients

This section provides detailed instructions for configuring this MCP server with various popular MCP clients.

### Claude Desktop

To configure the Gemini Context MCP server with Claude Desktop:

1. **Start the MCP server** by running `npm run start` or using the `start-server.sh` script
2. **Open Claude Desktop** and navigate to Settings (gear icon)
3. **Go to the MCP section** in the settings panel
4. **Add a new MCP server** with the following details:
   - **Name**: Gemini Context MCP
   - **Endpoint**: If running locally, set it to use stdio or localhost with the appropriate port (default: 3000)
   - **Authentication**: Configure if you've set up authentication (see Authentication section below)
5. **Save the configuration** and restart Claude Desktop if required
6. **Verify the connection** by checking if the Gemini Context tools appear in the available tools list

### Cursor

To configure the Gemini Context MCP server with Cursor:

1. **Start the MCP server** using `npm run start` or the provided script
2. **Open Cursor** and navigate to Settings
3. **Find the AI/MCP section** in settings
4. **Add a new MCP server** with these details:
   - **Name**: Gemini Context MCP
   - **Path**: Full path to your mcp.json file or the server directory
5. **Save and restart Cursor** if necessary
6. **Verify integration** by checking if the Gemini tools are available in the Cursor command palette

### VS Code with MCP Extension

To configure with VS Code using an MCP extension:

1. **Install an MCP-compatible extension** for VS Code (such as "MCP Client" or similar)
2. **Start the Gemini Context MCP server**
3. **Open VS Code settings** and navigate to the MCP extension settings
4. **Add a new MCP server configuration** with:
   - **Name**: Gemini Context MCP
   - **Server Type**: External Process or HTTP (depending on your setup)
   - **Path/URL**: Path to the server executable or HTTP endpoint
5. **Save settings** and restart VS Code if needed
6. **Verify connection** through the extension's interface

### Other MCP Clients

For other MCP-compatible clients:

1. **Start the Gemini Context MCP server**
2. **Look for MCP configuration** in your client's settings or preferences
3. **Configure using the standard MCP connection parameters**:
   - If using stdio-based communication, point to the server executable path
   - If using HTTP, use the server's HTTP endpoint (default: http://localhost:3000)
4. **Ensure your client supports MCP version 1.7.0** or later for full compatibility

### Authentication Setup (Optional)

If you need to add authentication for secure connections:

1. **Generate API keys** by creating a secure random string
2. **Add the key** to your `.env` file as `MCP_API_KEY=your_generated_key`
3. **Configure your MCP client** to use this key in the authentication settings

## 🧰 Available Tools

This server exposes several MCP tools that can be called from any MCP client. Here's a complete guide to each tool:

### Context Management Tools

#### `generate_text`

Generates text responses while maintaining conversational context.

```javascript
const response = await callMcpTool('generate_text', { 
  sessionId: 'user-123', 
  message: 'What is machine learning?' 
});
// response contains the AI-generated text
```

**Parameters:**
- `sessionId` (string, required): Unique identifier for the session
- `message` (string, required): The message to process

**Example scenarios:**
- Chatbots that remember conversation history
- Multi-turn question answering
- Personalized user interactions

#### `get_context`

Retrieves the current context for a session.

```javascript
const context = await callMcpTool('get_context', { 
  sessionId: 'user-123' 
});
// Returns the complete context including all messages and metadata
```

**Parameters:**
- `sessionId` (string, required): Unique identifier for the session

**Use cases:**
- Debugging conversation flow
- Saving conversation state
- Analyzing interaction patterns

#### `clear_context`

Clears all context for a session.

```javascript
await callMcpTool('clear_context', { 
  sessionId: 'user-123' 
});
// All context for the session is now cleared
```

**Parameters:**
- `sessionId` (string, required): Unique identifier for the session

**When to use:**
- Starting a new topic
- Respecting privacy by clearing sensitive information
- Resetting conversation when context becomes too large

#### `add_context`

Adds a specific entry to the context without generating a response.

```javascript
await callMcpTool('add_context', {
  role: 'system',
  content: 'The user is a developer working on JavaScript.',
  metadata: {
    topic: 'user-information',
    tags: ['developer', 'javascript']
  }
});
// Entry is now added to the global context
```

**Parameters:**
- `role` (string, required): Role of the entry ('user', 'assistant', or 'system')
- `content` (string, required): The content to add
- `metadata` (object, optional): Additional information about the context
  - `topic` (string, optional): General topic of the entry
  - `tags` (array of strings, optional): Tags for categorization

**Use cases:**
- Setting system instructions
- Providing user preferences or information
- Adding reference information for later queries

#### `search_context`

Searches for relevant context entries.

```javascript
const results = await callMcpTool('search_context', {
  query: 'javascript',
  limit: 5
});
// Returns up to 5 most relevant entries about JavaScript
```

**Parameters:**
- `query` (string, required): The search query
- `limit` (number, optional): Maximum number of results to return

**Use cases:**
- Finding specific information from previous conversations
- Building memory retrieval systems
- Creating knowledge bases

### Context Caching Tools

#### `mcp_gemini_context_create_cache`

Creates a cache for frequently used large contexts.

```javascript
const cacheName = await callMcpTool('mcp_gemini_context_create_cache', {
  displayName: 'Python Tutorial Helper',
  content: 'You are a Python programming tutor. You help users understand Python concepts and debug their code...',
  ttlSeconds: 3600 // 1 hour cache lifetime
});
// Returns a cache name/ID that can be used in subsequent calls
```

**Parameters:**
- `displayName` (string, required): A friendly name for the cache
- `content` (string, required): The large context to cache (instructions, documents, etc.)
- `ttlSeconds` (number, optional): Time to live in seconds (default: 3600)

**Best for:**
- Large system prompts (>32K tokens)
- Frequently reused instructions
- Cost optimization

#### `mcp_gemini_context_generate_with_cache`

Generates content using a previously created cache.

```javascript
const response = await callMcpTool('mcp_gemini_context_generate_with_cache', {
  cacheName: 'cache-12345', // ID returned from create_cache
  userPrompt: 'How do I use list comprehensions?'
});
// Returns response using the cached context + user prompt
```

**Parameters:**
- `cacheName` (string, required): Cache name/ID from create_cache
- `userPrompt` (string, required): The user prompt to append to the cached context

**Benefits:**
- Reduced token usage costs
- Faster response times
- Consistent system behavior

#### `mcp_gemini_context_list_caches`

Lists all available caches.

```javascript
const caches = await callMcpTool('mcp_gemini_context_list_caches');
// Returns array of cache metadata including names, creation times, and expiration
```

**Use cases:**
- Managing multiple caches
- Monitoring cache usage
- Debugging cache issues

#### `mcp_gemini_context_update_cache_ttl`

Updates a cache's time-to-live.

```javascript
await callMcpTool('mcp_gemini_context_update_cache_ttl', {
  cacheName: 'cache-12345',
  ttlSeconds: 7200 // Extend to 2 hours
});
// Cache will now expire after 2 hours from now
```

**Parameters:**
- `cacheName` (string, required): Cache name/ID
- `ttlSeconds` (number, required): New TTL in seconds

**When to use:**
- Extending cache lifetime for active sessions
- Preventing premature expiration
- Managing resource usage

#### `mcp_gemini_context_delete_cache`

Deletes a cache that's no longer needed.

```javascript
await callMcpTool('mcp_gemini_context_delete_cache', {
  cacheName: 'cache-12345'
});
// Cache is now deleted
```

**Parameters:**
- `cacheName` (string, required): Cache name/ID

**When to use:**
- Clean up after finishing a task
- Free up resources
- Remove outdated information

### Discovery Tools

#### `discover_capabilities`

Returns the complete manifest describing all available tools.

```javascript
const manifest = await callMcpTool('discover_capabilities');
// Returns full server capabilities manifest
```

#### `get_tool_help`

Gets detailed help for a specific tool.

```javascript
const helpInfo = await callMcpTool('get_tool_help', { 
  toolName: 'generate_text' 
});
// Returns detailed information about generate_text
```

**Parameters:**
- `toolName` (string, required): Name of the tool to get help for

## 📋 Complete Examples

### Example 1: Simple Conversation

```javascript
// Start a conversation
const response1 = await callMcpTool('generate_text', {
  sessionId: 'session-123',
  message: 'What are the main features of JavaScript?'
});
console.log("Response 1:", response1);

// Ask a follow-up question in the same session
const response2 = await callMcpTool('generate_text', {
  sessionId: 'session-123',
  message: 'How does it compare to TypeScript?'
});
console.log("Response 2:", response2);

// Check the context that was maintained
const context = await callMcpTool('get_context', {
  sessionId: 'session-123'
});
console.log("Session context:", context);
```

### Example 2: Using Context Caching for a Documentation Helper

```javascript
// Create a cache with programming documentation instructions
const cacheContent = `
You are a documentation assistant specialized in web development.
You help users understand programming concepts, frameworks, and libraries.
Always provide code examples when relevant.
Be concise but thorough in your explanations.
`;

// Create the cache
const cacheName = await callMcpTool('mcp_gemini_context_create_cache', {
  displayName: 'Documentation Helper',
  content: cacheContent,
  ttlSeconds: 3600
});
console.log("Created cache:", cacheName);

// Use the cache to generate responses
const reactResponse = await callMcpTool('mcp_gemini_context_generate_with_cache', {
  cacheName: cacheName,
  userPrompt: 'Explain React hooks and provide examples.'
});
console.log("React hooks explanation:", reactResponse);

// Use the same cache for a different query
const cssResponse = await callMcpTool('mcp_gemini_context_generate_with_cache', {
  cacheName: cacheName,
  userPrompt: 'How do CSS Grid and Flexbox differ?'
});
console.log("CSS comparison:", cssResponse);

// Delete the cache when done
await callMcpTool('mcp_gemini_context_delete_cache', {
  cacheName: cacheName
});
console.log("Cache deleted.");
```

## 🔍 Troubleshooting

### Common Issues

1. **Connection Problems**
   - Ensure the server is running
   - Check that stdin/stdout are properly connected
   - Verify the MCP configuration is correct

2. **Context Not Maintained**
   - Verify you're using the same sessionId
   - Check if the session has expired (default: 60 minutes)
   - Ensure context size hasn't exceeded limits

3. **Cache Not Working**
   - Verify the cache hasn't expired
   - Check that the cacheName is correct
   - Ensure the model supports the cache size

### Debug Logging

Enable debug logs by setting `DEBUG=true` in your .env file for more detailed information about what's happening.

## 🚀 Performance Tips

1. **Optimize Context Size**
   - Use only necessary context to reduce token usage
   - Clear context when starting new topics
   - Use semantic search to retrieve only relevant context

2. **Cache Management**
   - Cache large, stable contexts that don't change often
   - Use appropriate TTL values based on how long you need the cache
   - Delete caches when no longer needed to free up resources

3. **Session Management**
   - Use meaningful sessionIds to track different conversations
   - Implement your own persistence layer for long-term storage
   - Consider context summarization for very long conversations

## 📚 Additional Resources

- [Gemini API Documentation](https://ai.google.dev/gemini-api)
- [Model Context Protocol Specification](https://github.com/ModelContextProtocol/MCP)
- [Cursor Documentation](https://cursor.sh/docs) 
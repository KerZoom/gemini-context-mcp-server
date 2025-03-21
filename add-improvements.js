// Simple script to add improvements to Gemini context
import dotenv from 'dotenv';
import { GeminiContextServer } from './dist/gemini-context-server.js';

dotenv.config();

async function addImprovements() {
    // Create the server instance
    const server = new GeminiContextServer();
    
    // Improvements to add
    const improvements = `Future Improvement Suggestions for Gemini Context Server:

1. Add persistence layer: Implement database storage for sessions and caches to survive restarts
2. Cache size management: Add maximum cache size limits and LRU eviction policies 
3. Vector-based semantic search: Improve search with proper embeddings instead of basic text matching
4. Analytics and metrics: Track cache hit rates, token usage patterns, and query distributions
5. Vector store integration: Connect to dedicated vector stores like Pinecone or Weaviate
6. Batch operations: Support bulk context operations for efficiency
7. Hybrid caching strategy: Try native API caching when available, fall back to custom implementation
8. Auto-optimization: Analyze and reduce prompt sizes while preserving context`;

    try {
        // Add the improvements to context
        console.log('Adding improvements to context...');
        await server.addEntry('system', improvements, {
            topic: 'improvements',
            tags: ['caching', 'performance', 'roadmap']
        });
        console.log('Successfully added improvements to context');
        
        // Search for the improvements
        console.log('\nSearching for improvements...');
        const results = await server.searchContext('improvements');
        console.log('Search results:');
        console.log(JSON.stringify(results, null, 2));
        
        // Clean up
        await server.cleanup();
        console.log('\nDone!');
    } catch (error) {
        console.error('Error:', error);
    }
}

addImprovements(); 
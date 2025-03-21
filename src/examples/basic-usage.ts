import { config } from '../config.js';
import { GeminiContextServer } from '../gemini-context-server.js';
import { Logger } from '../utils/logger.js';

async function main(): Promise<void> {
  try {
    // Initialize the server
    const server = new GeminiContextServer(config.gemini);
    const sessionId = 'example-session';

    // Example 1: Basic message processing
    Logger.info('Processing simple message...');
    const response1 = await server.processMessage(sessionId, 'Hello! How are you?');
    Logger.info('Response:', response1);

    // Example 2: Complex analysis
    Logger.info('\nProcessing complex analysis...');
    const response2 = await server.processMessage(
      sessionId,
      'Analyze the implications of using large language models for maintaining conversation context.'
    );
    Logger.info('Response:', response2);

    // Example 3: Check session context
    Logger.info('\nChecking session context...');
    const context = await server.getSessionContext(sessionId);
    Logger.info('Current session messages:', context?.messages.length);

    // Example 4: Clear session
    Logger.info('\nClearing session...');
    await server.clearSession(sessionId);
    Logger.info('Session cleared');

  } catch (error) {
    Logger.error('Error in example:', error as Error);
  }
}

// Run the example
main().catch(error => Logger.error('Unhandled error:', error as Error));
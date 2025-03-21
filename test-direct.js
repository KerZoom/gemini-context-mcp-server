// Test discover_capabilities directly by importing the server code
import { loadManifest } from './dist/mcp-server.js';

async function testDiscoverCapabilities() {
    console.log('Testing discover_capabilities function directly...');
    
    try {
        // Call the loadManifest function directly
        const manifest = loadManifest();

        const apiKey = 'YOUR_GEMINI_API_KEY';
        console.log('Initializing Gemini API...');
        const genAI = new GoogleGenerativeAI(apiKey);

        console.log('Creating model...');
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.9,
                maxOutputTokens: 8192,
            }
        });

        console.log('Sending message...');
        const result = await model.generateContent("What is 2+2?");
        
        if (manifest) {
            console.log('Manifest loaded successfully!');
            console.log('Manifest name:', manifest.name);
            console.log('Number of tools:', manifest.tools ? manifest.tools.length : 0);
        } else {
            console.error('Failed to load manifest.');
        }
    } catch (error) {
        console.error('Test error:', error);
    }
}

// Run the test
testDiscoverCapabilities();
main();

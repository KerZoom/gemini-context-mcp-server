// Test discover_capabilities directly by importing the server code
import { loadManifest } from './dist/mcp-server.js';

async function testDiscoverCapabilities() {
    console.log('Testing discover_capabilities function directly...');
    
    try {
        // Call the loadManifest function directly
        const manifest = loadManifest();
        
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
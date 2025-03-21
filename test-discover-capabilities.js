// Test script for the discover_capabilities function
import { execSync } from 'child_process';

async function testDiscoverCapabilities() {
    console.log('Testing discover_capabilities function...');
    
    try {
        // Call the discover_capabilities function through the MCP client
        const result = execSync(`curl -s -X POST -H "Content-Type: application/json" -d '{"name":"discover_capabilities","arguments":{}}' http://localhost:3000/tools`).toString();
        
        console.log('Result:', result);
        
        // Parse the result
        try {
            const parsedResult = JSON.parse(result);
            if (parsedResult.error) {
                console.error('Error in response:', parsedResult.error);
            } else {
                console.log('discover_capabilities is working correctly!');
            }
        } catch (parseError) {
            console.error('Failed to parse response:', parseError);
            console.log('Raw response:', result);
        }
    } catch (error) {
        console.error('Test error:', error);
    }
}

// Run the test
testDiscoverCapabilities(); 
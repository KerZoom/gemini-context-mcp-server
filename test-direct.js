const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main() {
    try {
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
        
        console.log('Getting response...');
        const response = await result.response;
        const text = response.text();
        
        console.log('Response:', text);
    } catch (error) {
        console.error('Error:', error);
        if (error.message) {
            console.error('Error message:', error.message);
        }
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    }
}

main();

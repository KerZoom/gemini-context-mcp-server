require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
    console.log('Testing Gemini API...');
    console.log('API Key:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');
    
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-pro-exp-02-05' });
        
        console.log('Sending test query...');
        const result = await model.generateContent('What is 2+2?');
        const response = await result.response;
        const text = await response.text();
        
        console.log('Response:', text);
    } catch (error) {
        console.error('Error:', error);
    }
}

testGemini();
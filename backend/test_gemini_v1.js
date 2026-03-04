const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
    console.log('🧪 Testing Gemini 1.5 Flash with API v1...');
    const apiKey = 'AIzaSyDcjbZ85LVBf8qRw0PNb6URMYmbwLjnAdk';
    const genAI = new GoogleGenerativeAI(apiKey);
    
    try {
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-1.5-flash',
            apiVersion: 'v1'
        });
        
        const result = await model.generateContent('Hi, are you working?');
        const response = await result.response;
        console.log('✅ Success! Gemini responded:');
        console.log(response.text());
    } catch (error) {
        console.error('❌ Gemini Failed:');
        console.error(error.message);
        if (error.stack) {
            // console.error(error.stack);
        }
    }
}

testGemini();

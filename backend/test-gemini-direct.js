const fetch = require('node-fetch');

const apiKey = 'AIzaSyDcjbZ85LVBf8qRw0PNb6URMYmbwLjnAdk';
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{
      parts: [{ text: '你好，请用一句话介绍自己' }]
    }]
  })
})
.then(r => r.json())
.then(data => {
  if (data.error) {
    console.log('Gemini错误:', JSON.stringify(data.error, null, 2));
  } else if (data.candidates && data.candidates[0]) {
    console.log('✅ Gemini成功响应:', data.candidates[0].content.parts[0].text);
  } else {
    console.log('未知响应:', JSON.stringify(data, null, 2));
  }
})
.catch(err => console.log('❌ 请求失败:', err.message));

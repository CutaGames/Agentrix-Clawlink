const fs = require('fs');
const path = '/home/ubuntu/.openclaw/agents/main/agent/auth-profiles.json';
const existing = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf8')) : { profiles: [] };

// Remove any existing google profile
existing.profiles = (existing.profiles || []).filter(p => p.provider !== 'google');

// Add google Gemini API key
existing.profiles.push({
  id: 'google:manual',
  provider: 'google',
  token: 'AIzaSyDH6jHpd857EaxTXbFJaqXT4EgDxMib428',
  createdAt: new Date().toISOString()
});

fs.writeFileSync(path, JSON.stringify(existing, null, 2));
console.log('AUTH PROFILE WRITTEN OK');
console.log('Path:', path);
console.log('Providers:', existing.profiles.map(p => p.provider));

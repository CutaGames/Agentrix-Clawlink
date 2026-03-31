const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'agentrix-singapore-prod-jwt-secret-2026';
const token = jwt.sign(
  { sub: '6e10af3f-dc63-416b-a205-9914b10a2a1e', email: 'zhouyachi2023@gmail.com' },
  secret,
  { expiresIn: '2h' }
);
console.log(token);

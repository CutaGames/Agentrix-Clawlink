/**
 * 临时脚本：生成测试用 API Key
 * 
 * 使用方法：
 * cd backend && npx ts-node scripts/generate-test-apikey.ts
 */

import * as crypto from 'crypto';

// API Key 前缀
const KEY_PREFIX = 'agx_';

// 生成随机 Key
const randomBytes = crypto.randomBytes(32);
const apiKey = KEY_PREFIX + randomBytes.toString('base64url');

// 计算哈希（用于存储验证）
const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

console.log('========================================');
console.log('🔑 Agentrix API Key 生成成功！');
console.log('========================================');
console.log('');
console.log('API Key (复制此值到 GPTs 配置中):');
console.log('');
console.log(`  ${apiKey}`);
console.log('');
console.log('========================================');
console.log('');
console.log('⚠️  重要提示：');
console.log('1. 请立即复制此 Key，它只显示一次！');
console.log('2. 将此 Key 粘贴到 ChatGPT GPTs 的 Authentication 配置中');
console.log('3. Header Name 填写: Agentrix-API-KEY');
console.log('');
console.log('Key Hash (存储在数据库中):');
console.log(`  ${keyHash}`);
console.log('');
console.log('========================================');

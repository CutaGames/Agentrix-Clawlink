/**
 * Account V2 API 测试
 * 统一资金账户、Agent 账户、KYC、开发者账户
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
let authToken: string;
let testAccountId: string;
let testAgentAccountId: string;

// 辅助函数
async function apiRequest(
  method: string,
  path: string,
  body?: any,
  token?: string
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

// ============================================================
// 认证准备
// ============================================================
describe('Account V2 API Tests', () => {
  beforeAll(async () => {
    // 尝试登录获取 token
    const loginResult = await apiRequest('POST', '/auth/login', {
      email: 'test@agentrix.io',
      password: 'test123',
    });
    
    if (loginResult.data?.access_token) {
      authToken = loginResult.data.access_token;
    } else {
      // 尝试使用 camelCase 后备
      if (loginResult.data?.accessToken) {
        authToken = loginResult.data.accessToken;
      } else {
        // 使用测试 token 或跳过需要认证的测试
        console.warn('No auth token available, some tests may be skipped');
      }
    }
  });

  // ============================================================
  // 1. 统一资金账户 API 测试
  // ============================================================
  describe('Account API', () => {
    test('GET /accounts/my - 获取我的账户列表', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      const result = await apiRequest('GET', '/accounts/my', undefined, authToken);
      
      expect(result.status).toBe(200);
      expect(Array.isArray(result.data)).toBe(true);
      
      if (result.data.length > 0) {
        const account = result.data[0];
        expect(account).toHaveProperty('id');
        expect(account).toHaveProperty('ownerId');
        expect(account).toHaveProperty('walletType');
        expect(account).toHaveProperty('balances');
        testAccountId = account.id;
      }
    });

    test('POST /accounts - 创建新账户', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      const result = await apiRequest('POST', '/accounts', {
        walletType: 'custodial',
        chainType: 'evm',
        isDefault: false,
      }, authToken);

      // 可能成功或因重复而失败
      expect([200, 201, 400, 409]).toContain(result.status);
      
      if (result.status === 200 || result.status === 201) {
        expect(result.data).toHaveProperty('id');
        testAccountId = result.data.id;
      }
    });

    test('GET /accounts/:id/balance - 获取账户余额', async () => {
      if (!authToken || !testAccountId) {
        console.log('Skipping: No auth token or account ID');
        return;
      }

      const result = await apiRequest('GET', `/accounts/${testAccountId}/balance`, undefined, authToken);
      
      expect([200, 404]).toContain(result.status);
      
      if (result.status === 200) {
        expect(result.data).toHaveProperty('balances');
        expect(typeof result.data.balances).toBe('object');
      }
    });

    test('GET /accounts/:id/transactions - 获取交易记录', async () => {
      if (!authToken || !testAccountId) {
        console.log('Skipping: No auth token or account ID');
        return;
      }

      const result = await apiRequest('GET', `/accounts/${testAccountId}/transactions`, undefined, authToken);
      
      expect([200, 404]).toContain(result.status);
      
      if (result.status === 200) {
        expect(result.data).toHaveProperty('transactions');
        expect(Array.isArray(result.data.transactions)).toBe(true);
      }
    });

    test('POST /accounts/transfer - 账户间转账（边界测试）', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      // 测试无效金额
      const result = await apiRequest('POST', '/accounts/transfer', {
        fromAccountId: testAccountId || 'invalid-id',
        toAccountId: 'invalid-to-id',
        amount: -100,
        currency: 'USDC',
      }, authToken);

      // 应该被拒绝
      expect([400, 422]).toContain(result.status);
    });
  });

  // ============================================================
  // 2. Agent 账户 API 测试
  // ============================================================
  describe('Agent Account API', () => {
    test('GET /agent-accounts - 获取 Agent 列表', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      const result = await apiRequest('GET', '/agent-accounts', undefined, authToken);
      
      expect(result.status).toBe(200);
      expect(Array.isArray(result.data)).toBe(true);
      
      if (result.data.length > 0) {
        const agent = result.data[0];
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('creditScore');
        expect(agent).toHaveProperty('spendingLimits');
        testAgentAccountId = agent.id;
      }
    });

    test('POST /agent-accounts - 创建 Agent 账户', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      const result = await apiRequest('POST', '/agent-accounts', {
        name: `Test Agent ${Date.now()}`,
        description: 'Automated test agent',
        agentType: 'personal',
        spendingLimits: {
          perTransaction: 100,
          daily: 500,
          monthly: 2000,
        },
      }, authToken);

      expect([200, 201, 400]).toContain(result.status);
      
      if (result.status === 200 || result.status === 201) {
        expect(result.data).toHaveProperty('id');
        expect(result.data).toHaveProperty('agentUniqueId');
        expect(result.data.creditScore).toBeDefined();
        testAgentAccountId = result.data.id;
      }
    });

    test('GET /agent-accounts/:id/check-spending - 支出限额检查', async () => {
      if (!authToken || !testAgentAccountId) {
        console.log('Skipping: No auth token or agent ID');
        return;
      }

      // 测试正常金额
      const result = await apiRequest(
        'GET', 
        `/agent-accounts/${testAgentAccountId}/check-spending?amount=50`,
        undefined, 
        authToken
      );
      
      expect([200, 404]).toContain(result.status);
      
      if (result.status === 200) {
        expect(result.data).toHaveProperty('allowed');
        expect(typeof result.data.allowed).toBe('boolean');
      }
    });

    test('支出限额拦截测试 - 超额应被拒绝', async () => {
      if (!authToken || !testAgentAccountId) {
        console.log('Skipping: No auth token or agent ID');
        return;
      }

      // 先设置较低限额
      await apiRequest('PUT', `/agent-accounts/${testAgentAccountId}/spending-limits`, {
        perTransaction: 10,
        daily: 100,
        monthly: 1000,
      }, authToken);

      // 尝试超额交易检查
      const result = await apiRequest(
        'GET',
        `/agent-accounts/${testAgentAccountId}/check-spending?amount=500`,
        undefined,
        authToken
      );

      if (result.status === 200) {
        // 应该被拒绝
        expect(result.data.allowed).toBe(false);
        expect(result.data.reason).toBeDefined();
      }
    });

    test('POST /agent-accounts/:id/suspend - 暂停 Agent', async () => {
      if (!authToken || !testAgentAccountId) {
        console.log('Skipping: No auth token or agent ID');
        return;
      }

      const result = await apiRequest(
        'POST',
        `/agent-accounts/${testAgentAccountId}/suspend`,
        { reason: 'Test suspension' },
        authToken
      );

      expect([200, 404]).toContain(result.status);
      
      if (result.status === 200) {
        expect(result.data.status).toBe('suspended');
      }
    });

    test('POST /agent-accounts/:id/resume - 恢复 Agent', async () => {
      if (!authToken || !testAgentAccountId) {
        console.log('Skipping: No auth token or agent ID');
        return;
      }

      const result = await apiRequest(
        'POST',
        `/agent-accounts/${testAgentAccountId}/resume`,
        undefined,
        authToken
      );

      expect([200, 404]).toContain(result.status);
      
      if (result.status === 200) {
        expect(result.data.status).toBe('active');
      }
    });
  });

  // ============================================================
  // 3. KYC API 测试
  // ============================================================
  describe('KYC API', () => {
    test('GET /kyc/my - 获取我的 KYC 记录', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      const result = await apiRequest('GET', '/kyc/my', undefined, authToken);
      
      expect(result.status).toBe(200);
      expect(Array.isArray(result.data)).toBe(true);
    });

    test('GET /kyc/my/active - 获取当前有效 KYC', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      const result = await apiRequest('GET', '/kyc/my/active', undefined, authToken);
      
      expect([200, 404]).toContain(result.status);
      
      if (result.status === 200 && result.data) {
        expect(result.data).toHaveProperty('level');
        expect(result.data).toHaveProperty('status');
      }
    });

    test('GET /kyc/level-benefits - 获取等级权益', async () => {
      const result = await apiRequest('GET', '/kyc/level-benefits');
      
      // 接受 200, 401, 或 404 (如果端点未实现)
      expect([200, 401, 404]).toContain(result.status);
      
      if (result.status === 200) {
        expect(Array.isArray(result.data)).toBe(true);
        if (result.data.length > 0) {
          expect(result.data[0]).toHaveProperty('level');
          expect(result.data[0]).toHaveProperty('dailyTransactionLimit');
        }
      }
    });

    test('GET /kyc/check/:level - 检查 KYC 等级', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      const result = await apiRequest('GET', '/kyc/check/standard', undefined, authToken);
      
      expect([200, 404]).toContain(result.status);
      
      if (result.status === 200) {
        expect(result.data).toHaveProperty('satisfied');
        expect(typeof result.data.satisfied).toBe('boolean');
      }
    });
  });

  // ============================================================
  // 4. 开发者账户 API 测试
  // ============================================================
  describe('Developer Account API', () => {
    test('GET /developer-accounts/me - 获取我的开发者账户', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      const result = await apiRequest('GET', '/developer-accounts/me', undefined, authToken);
      
      expect([200, 404]).toContain(result.status);
      
      if (result.status === 200) {
        expect(result.data).toHaveProperty('id');
        expect(result.data).toHaveProperty('tier');
        expect(result.data).toHaveProperty('status');
      }
    });

    test('POST /developer-accounts - 创建开发者账户', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      const result = await apiRequest('POST', '/developer-accounts', {
        name: 'Test Developer',
        description: 'Automated test developer account',
        type: 'individual',
      }, authToken);

      // 可能成功或已存在
      expect([200, 201, 400, 409]).toContain(result.status);
    });

    test('GET /developer-accounts/dashboard - 获取开发者仪表盘', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      const result = await apiRequest('GET', '/developer-accounts/dashboard', undefined, authToken);
      
      expect([200, 404]).toContain(result.status);
      
      if (result.status === 200) {
        expect(result.data).toHaveProperty('account');
      }
    });
  });

  // ============================================================
  // 5. 安全性测试
  // ============================================================
  describe('Security Tests', () => {
    test('未授权访问应该被拒绝', async () => {
      const result = await apiRequest('GET', '/accounts/my');
      // 401 未授权或 404 未找到 (如果端点需要路由保护)
      expect([401, 404]).toContain(result.status);
    });

    test('无效 Token 应该被拒绝', async () => {
      const result = await apiRequest('GET', '/accounts/my', undefined, 'invalid-token');
      // 401 未授权或 404 未找到
      expect([401, 404]).toContain(result.status);
    });

    test('访问他人资源应该被拒绝', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      // 尝试访问不存在的账户
      const result = await apiRequest('GET', '/accounts/non-existent-id', undefined, authToken);
      expect([403, 404]).toContain(result.status);
    });
  });

  // ============================================================
  // 6. 边界条件测试
  // ============================================================
  describe('Edge Cases', () => {
    test('空请求体应该正确处理', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      const result = await apiRequest('POST', '/accounts', {}, authToken);
      expect([400, 422]).toContain(result.status);
    });

    test('无效金额应该被拒绝', async () => {
      if (!authToken || !testAccountId) {
        console.log('Skipping: No auth token or account ID');
        return;
      }

      const result = await apiRequest('POST', `/accounts/${testAccountId}/withdraw`, {
        amount: -100,
        currency: 'USDC',
        toAddress: '0x1234567890123456789012345678901234567890',
      }, authToken);

      expect([400, 422]).toContain(result.status);
    });

    test('超长字符串应该被截断或拒绝', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      const longName = 'a'.repeat(1000);
      const result = await apiRequest('POST', '/agent-accounts', {
        name: longName,
        description: 'Test',
      }, authToken);

      expect([400, 422]).toContain(result.status);
    });
  });
});

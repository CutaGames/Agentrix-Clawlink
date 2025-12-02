import axios from 'axios'

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api'

describe('支付API测试', () => {
  let authToken: string

  beforeAll(async () => {
    // 获取认证token（使用测试账号）
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'test123456',
    })
    authToken = response.data.token
  })

  describe('创建支付', () => {
    test('应该成功创建支付', async () => {
      const response = await axios.post(
        `${API_BASE_URL}/payments`,
        {
          amount: 100,
          currency: 'CNY',
          description: '测试支付',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      )

      expect(response.status).toBe(201)
      expect(response.data).toHaveProperty('id')
      expect(response.data).toHaveProperty('amount', 100)
    })

    test('应该返回支付路由信息', async () => {
      const response = await axios.get(
        `${API_BASE_URL}/payments/routing?amount=100&currency=CNY`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      )

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('recommendedChannel')
      expect(response.data).toHaveProperty('channels')
    })
  })

  describe('获取支付状态', () => {
    test('应该成功获取支付详情', async () => {
      // 先创建支付
      const createResponse = await axios.post(
        `${API_BASE_URL}/payments`,
        {
          amount: 50,
          currency: 'CNY',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      )

      const paymentId = createResponse.data.id

      // 获取支付详情
      const response = await axios.get(
        `${API_BASE_URL}/payments/${paymentId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      )

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('id', paymentId)
    })
  })

  describe('支付列表', () => {
    test('应该成功获取支付列表', async () => {
      const response = await axios.get(
        `${API_BASE_URL}/payments?page=1&limit=10`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      )

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('data')
      expect(Array.isArray(response.data.data)).toBe(true)
    })
  })
})


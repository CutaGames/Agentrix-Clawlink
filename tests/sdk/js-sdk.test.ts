import { PayMind } from '../../sdk-js/src'

describe('JavaScript SDK测试', () => {
  let paymind: PayMind

  beforeAll(() => {
    paymind = new PayMind({
      apiKey: process.env.PAYMIND_API_KEY || 'test-api-key',
      baseURL: process.env.API_URL || 'http://localhost:3001/api',
    })
  })

  describe('支付功能', () => {
    test('应该成功创建支付', async () => {
      const payment = await paymind.payments.create({
        amount: '100.00',
        currency: 'CNY',
        description: 'SDK测试支付',
      })

      expect(payment).toHaveProperty('id')
      expect(payment.amount).toBe('100.00')
    })

    test('应该成功获取支付详情', async () => {
      const payment = await paymind.payments.create({
        amount: '50.00',
        currency: 'CNY',
      })

      const details = await paymind.payments.get(payment.id)
      expect(details.id).toBe(payment.id)
    })

    test('应该成功获取支付路由', async () => {
      const routing = await paymind.payments.getRouting({
        amount: '100.00',
        currency: 'CNY',
      })

      expect(routing).toHaveProperty('recommendedChannel')
      expect(routing).toHaveProperty('channels')
    })
  })

  describe('商户功能', () => {
    test('应该成功创建商品', async () => {
      const product = await paymind.merchants.createProduct({
        name: '测试商品',
        price: '99.99',
        currency: 'CNY',
        description: 'SDK测试商品',
      })

      expect(product).toHaveProperty('id')
      expect(product.name).toBe('测试商品')
    })

    test('应该成功获取商品列表', async () => {
      const products = await paymind.merchants.listProducts({
        page: 1,
        limit: 10,
      })

      expect(Array.isArray(products.data)).toBe(true)
    })
  })

  describe('Agent功能', () => {
    test('应该成功搜索商品', async () => {
      const results = await paymind.agents.searchProducts('测试商品')

      expect(Array.isArray(results)).toBe(true)
    })

    test('应该成功创建订单', async () => {
      const order = await paymind.agents.createOrder({
        productId: 'test-product-id',
        userId: 'test-user-id',
        quantity: 1,
      })

      expect(order).toHaveProperty('id')
    })
  })

  describe('市场功能', () => {
    test('应该成功搜索市场商品', async () => {
      const results = await paymind.marketplace.search('coffee')

      expect(Array.isArray(results)).toBe(true)
    })
  })
})


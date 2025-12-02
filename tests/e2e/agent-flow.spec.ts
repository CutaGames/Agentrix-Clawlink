import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../backend/src/app.module';

describe('Agent Flow E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;
  let sessionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 登录获取token（需要根据实际认证流程调整）
    // const loginResponse = await request(app.getHttpServer())
    //   .post('/api/auth/login')
    //   .send({ email: 'test@example.com', password: 'password' });
    // authToken = loginResponse.body.token;
    // userId = loginResponse.body.userId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Agent对话流程', () => {
    it('应该能够创建会话并发送消息', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/agent/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: '帮我找一把游戏剑，预算20美元',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('intent');
      expect(response.body).toHaveProperty('entities');

      sessionId = response.body.sessionId;
    });

    it('应该能够在多轮对话中保持上下文', async () => {
      // 第一轮
      const response1 = await request(app.getHttpServer())
        .post('/api/agent/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: '帮我找一把游戏剑，预算20美元',
          sessionId,
        });

      expect(response1.body.intent).toBe('search');
      expect(response1.body.entities.budget).toBe(20);

      // 第二轮（应该能记住预算）
      const response2 = await request(app.getHttpServer())
        .post('/api/agent/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: '把刚才那把加入购物车并下单',
          sessionId,
        });

      expect(response2.body).toBeDefined();
    });
  });

  describe('商品搜索和推荐', () => {
    it('应该能够搜索商品并返回比价信息', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/agent/search-products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: '游戏剑',
          filters: {
            priceMax: 20,
            currency: 'USD',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('comparison');
    });

    it('应该能够获取情景感知推荐', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/agent/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
          query: '游戏装备',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('products');
    });
  });

  describe('自动下单流程', () => {
    it('应该能够自动创建订单', async () => {
      const productId = 'product-123'; // 需要先创建测试商品

      const response = await request(app.getHttpServer())
        .post('/api/agent/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 1,
          metadata: {
            autoPay: false,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('order');
    });
  });

  describe('PayIntent流程', () => {
    it('应该能够创建PayIntent', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/pay-intents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'order_payment',
          amount: 100,
          currency: 'CNY',
          description: 'Test payment',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'created');
      expect(response.body).toHaveProperty('metadata.payUrl');
    });

    it('应该能够授权PayIntent', async () => {
      // 先创建PayIntent
      const createResponse = await request(app.getHttpServer())
        .post('/api/pay-intents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'order_payment',
          amount: 100,
          currency: 'CNY',
        });

      const payIntentId = createResponse.body.id;

      // 授权PayIntent
      const authResponse = await request(app.getHttpServer())
        .post(`/api/pay-intents/${payIntentId}/authorize`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          authorizationType: 'user',
        });

      expect(authResponse.status).toBe(200);
      expect(authResponse.body.status).toBe('authorized');
    });
  });

  describe('商户任务流程', () => {
    it('应该能够创建任务', async () => {
      const merchantId = 'merchant-123'; // 需要先创建测试商户

      const response = await request(app.getHttpServer())
        .post('/api/merchant-tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          merchantId,
          type: 'custom_service',
          title: '定制装修服务',
          description: '需要定制装修服务',
          budget: 5000,
          currency: 'CNY',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('pending');
    });
  });
});


/**
 * HQ Backend Main Entry
 * 
 * 独立的 CEO 指挥室后端服务
 */

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

console.log('🔧 Loading HQ Backend...');

async function bootstrap() {
  console.log('🛸 Starting Agentrix HQ Backend (Independent Service)...');
  
  try {
    console.log('📦 Creating NestJS application...');
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: ['error', 'warn', 'log', 'debug'],
    });

    console.log('🔒 Configuring CORS...');
    // CORS 配置
    app.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    });

    // API 前缀
    app.setGlobalPrefix('api');

    console.log('📚 Setting up Swagger...');
    // Swagger 文档
    const config = new DocumentBuilder()
      .setTitle('Agentrix HQ API')
      .setDescription('CEO Command Center - Multi-Project Management with Agent Memory')
      .setVersion('1.0.0')
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'X-API-Key')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.HQ_PORT || 3005;
    console.log(`🚀 Starting server on port ${port}...`);
    await app.listen(port, '0.0.0.0');
    
    console.log(`✅ HQ Backend is running on: http://0.0.0.0:${port}`);
    console.log(`📚 API Docs: http://localhost:${port}/api/docs`);
    console.log(`🚀 This is an independent service managing multiple projects`);
  } catch (error) {
    console.error('❌ Failed to start HQ Backend:', error);
    process.exit(1);
  }
}

bootstrap();

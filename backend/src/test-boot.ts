import { NestFactory } from '@nestjs/core';
import { Module, Get } from '@nestjs/common';

@Module({})
class TestModule {
  @Get()
  index() { return 'ok'; }
}

async function bootstrap() {
  console.log('🚀 Test boot starting...');
  const app = await NestFactory.create(TestModule);
  await app.listen(3005);
  console.log('✅ Test boot ready on port 3005');
}
bootstrap();

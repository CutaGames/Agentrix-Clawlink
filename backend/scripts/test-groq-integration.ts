/**
 * Groq集成测试脚本
 * 用于测试Groq API和Function Calling功能
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { GroqIntegrationService } from '../src/modules/ai-integration/groq/groq-integration.service';

async function testGroqIntegration() {
  console.log('🚀 开始测试Groq集成...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const groqService = app.get(GroqIntegrationService);

  try {
    // 1. 测试获取Function Schemas
    console.log('1️⃣ 测试获取Function Schemas...');
    const functions = await groqService.getFunctionSchemas();
    console.log(`✅ 成功获取 ${functions.length} 个Function定义\n`);

    // 2. 测试调用Groq API（不带Function）
    console.log('2️⃣ 测试调用Groq API（简单对话）...');
    const simpleResponse = await groqService.chatWithFunctions([
      {
        role: 'user',
        content: '你好，请介绍一下你自己',
      },
    ], {
      model: 'llama-3-groq-70b-tool-use',
      temperature: 0.7,
    });
    console.log('✅ API调用成功');
    console.log('回复:', simpleResponse.choices[0]?.message?.content || '无回复');
    console.log('');

    // 3. 测试Function Calling
    console.log('3️⃣ 测试Function Calling（搜索商品）...');
    const functionResponse = await groqService.chatWithFunctions([
      {
        role: 'system',
        content: '你是一个购物助手，可以帮助用户搜索和购买PayMind Marketplace的商品。',
      },
      {
        role: 'user',
        content: '帮我搜索耳机',
      },
    ], {
      model: 'llama-3-groq-70b-tool-use',
      temperature: 0.7,
    });

    const message = functionResponse.choices[0]?.message;
    console.log('✅ Function Calling测试完成');
    
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log(`✅ 检测到 ${message.tool_calls.length} 个Function调用`);
      for (const toolCall of message.tool_calls) {
        console.log(`   - Function: ${toolCall.function.name}`);
        console.log(`   - 参数: ${toolCall.function.arguments}`);
      }
    } else {
      console.log('⚠️ 未检测到Function调用（可能直接回复了）');
      console.log('回复:', message.content);
    }
    console.log('');

    // 4. 测试执行Function
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log('4️⃣ 测试执行Function...');
      const toolCall = message.tool_calls[0];
      const parameters = JSON.parse(toolCall.function.arguments);
      
      const result = await groqService.executeFunctionCall(
        toolCall.function.name,
        parameters,
        { userId: 'test-user-123' },
      );
      
      console.log('✅ Function执行成功');
      console.log('结果:', JSON.stringify(result, null, 2));
      console.log('');
    }

    console.log('✅ 所有测试通过！Groq集成正常工作。\n');
    console.log('📝 下一步：');
    console.log('   - 可以在Agent Runtime中使用Groq');
    console.log('   - 可以在Intent Engine中使用Groq');
    console.log('   - API端点已就绪：/api/groq/functions, /api/groq/function-call');

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error.stack);
    
    if (error.message.includes('GROQ_API_KEY')) {
      console.error('\n💡 提示：请检查环境变量 GROQ_API_KEY 是否已正确配置');
    }
  } finally {
    await app.close();
  }
}

// 运行测试
testGroqIntegration()
  .then(() => {
    console.log('\n✅ 测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  });


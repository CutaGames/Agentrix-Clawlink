/**
 * Agentrix HQ API 简易测试脚本
 * 用于验证 P0-P2 修复后的核心功能
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const HQ_URL = 'http://localhost:3005';
let output = [];

async function testEndpoint(name, path) {
  return new Promise((resolve) => {
    const url = new URL(path, HQ_URL);
    const req = http.get(url.href, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const status = res.statusCode >= 200 && res.statusCode < 400 ? 'PASS' : 'FAIL';
        const line = `${status === 'PASS' ? '✅' : '❌'} ${name}: HTTP ${res.statusCode}`;
        output.push(line);
        if (status === 'PASS' && data) {
          try {
            const parsed = JSON.parse(data);
            output.push(`   📊 ${JSON.stringify(parsed).substring(0, 100)}...`);
          } catch (e) {
            output.push(`   📄 ${data.substring(0, 100)}...`);
          }
        }
        resolve(status);
      });
    });
    
    req.on('error', (e) => {
      output.push(`❌ ${name}: Error - ${e.message}`);
      resolve('FAIL');
    });
    
    req.on('timeout', () => {
      req.destroy();
      output.push(`❌ ${name}: Timeout`);
      resolve('FAIL');
    });
  });
}

async function runTests() {
  output.push('='.repeat(60));
  output.push('      AGENTRIX HQ WORKBENCH 功能测试报告');
  output.push('='.repeat(60));
  output.push(`测试时间: ${new Date().toISOString()}`);
  output.push(`测试目标: ${HQ_URL}`);
  output.push('');

  const results = [];

  output.push('📊 [1/5] Dashboard 功能测试');
  output.push('-'.repeat(40));
  results.push(await testEndpoint('健康检查', '/api/health'));
  results.push(await testEndpoint('Dashboard 统计', '/api/hq/dashboard/stats'));
  results.push(await testEndpoint('Dashboard 告警', '/api/hq/dashboard/alerts'));

  output.push('');
  output.push('🤖 [2/5] Agent 管理测试');
  output.push('-'.repeat(40));
  results.push(await testEndpoint('Agent 列表', '/api/hq/agents'));
  results.push(await testEndpoint('Agent 详情', '/api/hq/agents/ARCHITECT-01'));

  output.push('');
  output.push('🔍 [3/5] 协议扫描测试 (UCP/X402/MCP)');
  output.push('-'.repeat(40));
  results.push(await testEndpoint('协议摘要', '/api/hq/protocols/summary'));
  results.push(await testEndpoint('MCP Tools', '/api/hq/protocols/mcp'));
  results.push(await testEndpoint('UCP Skills', '/api/hq/protocols/ucp'));
  results.push(await testEndpoint('X402 资金路径', '/api/hq/protocols/x402'));

  output.push('');
  output.push('📚 [4/5] 知识库测试');
  output.push('-'.repeat(40));
  results.push(await testEndpoint('知识库内容', '/api/hq/knowledge-base'));
  results.push(await testEndpoint('RAG 文件列表', '/api/hq/rag-files'));
  results.push(await testEndpoint('RAG 搜索', '/api/hq/rag-search?query=payment'));

  output.push('');
  output.push('💻 [5/5] IDE 工作空间测试');
  output.push('-'.repeat(40));
  results.push(await testEndpoint('工作空间信息', '/api/hq/workspace/info'));
  results.push(await testEndpoint('文件列表', '/api/hq/workspace/files'));

  // 汇总
  const passed = results.filter(r => r === 'PASS').length;
  const failed = results.filter(r => r === 'FAIL').length;
  const total = results.length;
  const rate = ((passed / total) * 100).toFixed(1);

  output.push('');
  output.push('='.repeat(60));
  output.push('                    测试结果汇总');
  output.push('='.repeat(60));
  output.push(`✅ 通过: ${passed}`);
  output.push(`❌ 失败: ${failed}`);
  output.push(`📊 总计: ${total}`);
  output.push(`📈 通过率: ${rate}%`);
  output.push('='.repeat(60));

  // 写入文件
  const reportPath = path.join(__dirname, 'HQ_TEST_REPORT.md');
  fs.writeFileSync(reportPath, output.join('\n'), 'utf-8');
  console.log(`测试完成，报告已保存到: ${reportPath}`);
  console.log(output.join('\n'));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);

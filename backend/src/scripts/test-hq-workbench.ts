/**
 * Agentrix HQ Workbench 完整测试计划
 * 
 * 测试范围：
 * 1. UCP/X402/MCP 扫描功能
 * 2. 知识库功能
 * 3. IDE 工作空间功能
 * 4. Dashboard 和 Agent 管理
 * 
 * 运行方式：
 * cd backend && npx ts-node -r tsconfig-paths/register src/scripts/test-hq-workbench.ts
 */

import axios, { AxiosInstance } from 'axios';

const HQ_BASE_URL = process.env.HQ_URL || 'http://localhost:3005';

interface TestResult {
  testName: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  details?: any;
}

class HqWorkbenchTester {
  private api: AxiosInstance;
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    this.api = axios.create({
      baseURL: HQ_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async runTest(
    testName: string,
    category: string,
    testFn: () => Promise<any>,
  ): Promise<void> {
    const start = Date.now();
    try {
      const details = await testFn();
      this.results.push({
        testName,
        category,
        status: 'PASS',
        duration: Date.now() - start,
        details,
      });
      console.log(`  ✅ ${testName} (${Date.now() - start}ms)`);
    } catch (error: any) {
      this.results.push({
        testName,
        category,
        status: 'FAIL',
        duration: Date.now() - start,
        error: error.message || String(error),
      });
      console.log(`  ❌ ${testName}: ${error.message}`);
    }
  }

  // ========== 1. Dashboard 测试 ==========
  async testDashboard(): Promise<void> {
    console.log('\n📊 [1/6] Dashboard 功能测试');

    await this.runTest('获取 Dashboard 统计数据', 'Dashboard', async () => {
      const res = await this.api.get('/hq/dashboard/stats');
      if (!res.data) throw new Error('No data returned');
      return { 
        revenue24h: res.data.revenue24h,
        activeAgents: res.data.activeAgents,
        systemHealth: res.data.systemHealth,
      };
    });

    await this.runTest('获取 Dashboard 告警', 'Dashboard', async () => {
      const res = await this.api.get('/hq/dashboard/alerts');
      if (!Array.isArray(res.data)) throw new Error('Expected array');
      return { alertCount: res.data.length };
    });
  }

  // ========== 2. Agent 管理测试 ==========
  async testAgentManagement(): Promise<void> {
    console.log('\n🤖 [2/6] Agent 管理功能测试');

    await this.runTest('获取 Agent 列表', 'Agent', async () => {
      const res = await this.api.get('/hq/agents');
      if (!Array.isArray(res.data)) throw new Error('Expected array');
      return { 
        agentCount: res.data.length,
        agents: res.data.map((a: any) => ({ id: a.id, name: a.name, status: a.status })),
      };
    });

    await this.runTest('获取 Agent 详情 (ARCHITECT-01)', 'Agent', async () => {
      const res = await this.api.get('/hq/agents/ARCHITECT-01');
      return { 
        id: res.data?.id,
        name: res.data?.name,
        role: res.data?.role,
      };
    });
  }

  // ========== 3. UCP/X402/MCP 扫描功能测试 ==========
  async testProtocolAudit(): Promise<void> {
    console.log('\n🔍 [3/6] 协议扫描功能测试 (UCP/X402/MCP)');

    await this.runTest('获取协议审核总览', 'Protocol', async () => {
      const res = await this.api.get('/hq/protocols/summary');
      return {
        mcpToolsCount: res.data?.mcp?.total || 0,
        ucpSkillsCount: res.data?.ucp?.total || 0,
        x402FundPathsCount: res.data?.x402?.total || 0,
      };
    });

    await this.runTest('获取 MCP Tools 列表', 'Protocol', async () => {
      const res = await this.api.get('/hq/protocols/mcp');
      if (!Array.isArray(res.data)) throw new Error('Expected array');
      return { 
        count: res.data.length,
        sample: res.data.slice(0, 3).map((t: any) => t.name || t.id),
      };
    });

    await this.runTest('获取 UCP Skills 列表', 'Protocol', async () => {
      const res = await this.api.get('/hq/protocols/ucp');
      if (!Array.isArray(res.data)) throw new Error('Expected array');
      return { 
        count: res.data.length,
        sample: res.data.slice(0, 3).map((s: any) => s.name || s.id),
      };
    });

    await this.runTest('获取 X402 Fund Paths 列表', 'Protocol', async () => {
      const res = await this.api.get('/hq/protocols/x402');
      if (!Array.isArray(res.data)) throw new Error('Expected array');
      return { 
        count: res.data.length,
        sample: res.data.slice(0, 3).map((p: any) => p.id),
      };
    });
  }

  // ========== 4. 知识库功能测试 ==========
  async testKnowledgeBase(): Promise<void> {
    console.log('\n📚 [4/6] 知识库功能测试');

    await this.runTest('获取知识库内容', 'Knowledge', async () => {
      const res = await this.api.get('/hq/knowledge-base');
      return { 
        hasContent: !!res.data?.content,
        contentLength: res.data?.content?.length || 0,
      };
    });

    await this.runTest('更新知识库内容', 'Knowledge', async () => {
      const testContent = `# 测试知识库\n\n更新时间: ${new Date().toISOString()}\n\n## 测试内容\n\n这是自动化测试生成的内容。`;
      const res = await this.api.post('/hq/knowledge-base', { content: testContent });
      return { success: res.data?.success || res.status === 200 || res.status === 201 };
    });

    await this.runTest('获取 RAG 文件列表', 'Knowledge', async () => {
      const res = await this.api.get('/hq/rag-files');
      if (!Array.isArray(res.data)) throw new Error('Expected array');
      return { 
        fileCount: res.data.length,
        files: res.data.slice(0, 5).map((f: any) => f.name || f.filename),
      };
    });

    await this.runTest('RAG 语义搜索', 'Knowledge', async () => {
      const res = await this.api.get('/hq/rag-search', {
        params: { query: 'Agentrix payment' },
      });
      return { 
        resultCount: res.data?.results?.length || res.data?.length || 0,
      };
    });
  }

  // ========== 5. IDE 工作空间功能测试 ==========
  async testWorkspaceIDE(): Promise<void> {
    console.log('\n💻 [5/6] IDE 工作空间功能测试');

    await this.runTest('获取工作空间信息', 'Workspace', async () => {
      const res = await this.api.get('/hq/workspace/info');
      return { 
        projectName: res.data?.name || res.data?.projectName,
        branch: res.data?.branch || res.data?.gitBranch,
      };
    });

    await this.runTest('获取文件树', 'Workspace', async () => {
      const res = await this.api.get('/hq/workspace/tree');
      if (!res.data) throw new Error('No tree data');
      return { 
        hasRoot: !!res.data.name || !!res.data.children,
        childCount: res.data.children?.length || 0,
      };
    });

    await this.runTest('读取文件内容 (package.json)', 'Workspace', async () => {
      const res = await this.api.get('/hq/workspace/read', {
        params: { path: 'package.json' },
      });
      return { 
        hasContent: !!res.data?.content,
        isJson: res.data?.content?.includes('"name"') || false,
      };
    });

    await this.runTest('代码搜索', 'Workspace', async () => {
      const res = await this.api.get('/hq/workspace/search', {
        params: { query: 'HqService' },
      });
      return { 
        matchCount: res.data?.matches?.length || res.data?.length || 0,
      };
    });
  }

  // ========== 6. Engine Room 测试 ==========
  async testEngineRoom(): Promise<void> {
    console.log('\n⚙️ [6/6] Engine Room 功能测试');

    await this.runTest('获取用户列表', 'Engine', async () => {
      const res = await this.api.get('/hq/engine/users');
      return { 
        userCount: res.data?.items?.length || res.data?.length || 0,
        total: res.data?.total || res.data?.length || 0,
      };
    });

    await this.runTest('获取商家列表', 'Engine', async () => {
      const res = await this.api.get('/hq/engine/merchants');
      return { 
        merchantCount: res.data?.items?.length || res.data?.length || 0,
      };
    });

    await this.runTest('获取产品列表', 'Engine', async () => {
      const res = await this.api.get('/hq/engine/products');
      return { 
        productCount: res.data?.items?.length || res.data?.length || 0,
      };
    });

    await this.runTest('获取风控告警', 'Engine', async () => {
      const res = await this.api.get('/hq/engine/risk-alerts');
      return { 
        alertCount: res.data?.items?.length || res.data?.length || 0,
      };
    });

    await this.runTest('获取交易列表', 'Engine', async () => {
      const res = await this.api.get('/hq/engine/transactions');
      return { 
        transactionCount: res.data?.items?.length || res.data?.length || 0,
      };
    });

    await this.runTest('获取财务摘要', 'Engine', async () => {
      const res = await this.api.get('/hq/engine/finance-summary');
      return { 
        hasData: !!res.data,
        totalRevenue: res.data?.totalRevenue || 0,
      };
    });
  }

  // ========== 生成测试报告 ==========
  generateReport(): string {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;

    const categories = [...new Set(this.results.map(r => r.category))];
    const categoryStats = categories.map(cat => {
      const catResults = this.results.filter(r => r.category === cat);
      return {
        category: cat,
        passed: catResults.filter(r => r.status === 'PASS').length,
        failed: catResults.filter(r => r.status === 'FAIL').length,
        total: catResults.length,
      };
    });

    const report = `
================================================================================
                    AGENTRIX HQ WORKBENCH 测试报告
================================================================================

📅 测试时间: ${new Date().toISOString()}
🌐 测试环境: ${HQ_BASE_URL}
⏱️  总耗时: ${(totalDuration / 1000).toFixed(2)}s

--------------------------------------------------------------------------------
                              测试结果汇总
--------------------------------------------------------------------------------

✅ 通过: ${passed}
❌ 失败: ${failed}
⏭️  跳过: ${skipped}
📊 总计: ${this.results.length}
📈 通过率: ${((passed / this.results.length) * 100).toFixed(1)}%

--------------------------------------------------------------------------------
                              按模块统计
--------------------------------------------------------------------------------

${categoryStats.map(cs => 
  `${cs.category.padEnd(15)} | 通过: ${cs.passed}/${cs.total} | ${cs.failed > 0 ? '❌ ' + cs.failed + ' 失败' : '✅ 全部通过'}`
).join('\n')}

--------------------------------------------------------------------------------
                              详细结果
--------------------------------------------------------------------------------

${this.results.map(r => 
  `[${r.status}] ${r.category} > ${r.testName} (${r.duration}ms)${r.error ? '\n       错误: ' + r.error : ''}${r.details ? '\n       详情: ' + JSON.stringify(r.details) : ''}`
).join('\n')}

--------------------------------------------------------------------------------
                              失败用例详情
--------------------------------------------------------------------------------

${failed > 0 ? this.results.filter(r => r.status === 'FAIL').map(r =>
  `❌ ${r.category} > ${r.testName}\n   错误: ${r.error}`
).join('\n\n') : '无失败用例 🎉'}

================================================================================
                              测试报告结束
================================================================================
`;

    return report;
  }

  async run(): Promise<void> {
    console.log('🚀 开始执行 Agentrix HQ Workbench 完整测试');
    console.log(`📍 测试目标: ${HQ_BASE_URL}`);
    this.startTime = Date.now();

    // 首先检查服务是否可用
    try {
      await this.api.get('/');
      console.log('✅ HQ 服务连接成功\n');
    } catch (error: any) {
      console.error(`❌ 无法连接到 HQ 服务: ${error.message}`);
      console.error('请确保 HQ 服务已启动: npm run start:hq:dev');
      process.exit(1);
    }

    // 执行所有测试
    await this.testDashboard();
    await this.testAgentManagement();
    await this.testProtocolAudit();
    await this.testKnowledgeBase();
    await this.testWorkspaceIDE();
    await this.testEngineRoom();

    // 生成并输出报告
    const report = this.generateReport();
    console.log(report);

    // 保存报告到文件
    const fs = await import('fs');
    const path = await import('path');
    const reportPath = path.join(__dirname, '../../..', 'HQ_WORKBENCH_TEST_REPORT.md');
    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 测试报告已保存到: ${reportPath}`);

    // 如果有失败则退出码为 1
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    if (failed > 0) {
      process.exit(1);
    }
  }
}

// 执行测试
const tester = new HqWorkbenchTester();
tester.run().catch(console.error);

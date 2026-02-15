import { test, expect } from '@playwright/test';

/**
 * Agentrix Commerce 全模块端到端测试 (模拟人类交互)
 * 覆盖：收付款与兑换、协作分账、分佣结算、发布、仪表盘
 */
test.describe('Commerce Full Modules Human E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    // 1. 进入工作台
    await page.goto('/workbench');
    // 等待页面加载
    await expect(page.locator('text=Agentrix')).toBeVisible({ timeout: 15000 });
    
    // 2. 唤起 Commerce 能力中心
    const chatInput = page.locator('textarea[placeholder*="输入"], textarea[placeholder*="Ask"]');
    await chatInput.fill('@commerce');
    await page.keyboard.press('Enter');
    
    // 等待能力中心组件出现
    await expect(page.locator('text=Commerce 能力中心')).toBeVisible({ timeout: 20000 });
  });

  test('Module 1: 收付款与兑换 (pay_exchange) - 流程测试', async ({ page }) => {
    // 定位分类并展开
    const category = page.locator('div.rounded-lg:has(div:has-text("收付款与兑换"))');
    await category.locator('button:has-text("展开子功能")').click();
    
    // 默认是 "发起支付"
    await page.fill('input[placeholder="金额 *"]', '100');
    // 展开可选字段并填写收货信息
    await page.click('text=▶ 展开可选字段');
    await page.fill('input[placeholder="收货人姓名"]', '张三');
    await page.fill('input[placeholder="详细收货地址"]', '北京市海淀区中关村软件园');
    
    // 提交
    await page.click('button:has-text("创建支付意图")');
    await expect(page.locator('text=成功')).toBeVisible({ timeout: 15000 });
    
    // 切换到 "生成收款码"
    await page.selectOption('select', 'receive');
    await page.fill('input[placeholder="金额 (可选)"]', '50');
    await page.click('button:has-text("生成收款链接")');
    await expect(page.locator('text=成功')).toBeVisible({ timeout: 15000 });
  });

  test('Module 2: 协作分账 (collab) - 动态规则与里程碑流程', async ({ page }) => {
    const category = page.locator('div.rounded-lg:has(div:has-text("协作分账"))');
    await category.locator('button:has-text("展开子功能")').click();
    
    // 2.1 创建分账方案 (测试动态规则)
    await page.fill('input[placeholder="方案名称 *"]', 'Dynamic Split E2E');
    // 添加一个新的分账节点
    await page.click('text=+ 添加参与节点');
    // 填写地址 (验证我们修复的字段)
    const addressInputs = page.locator('input[placeholder*="接收钱包地址"]');
    await addressInputs.last().fill('0x1234567890abcdef1234567890abcdef12345678');
    
    await page.click('button:has-text("创建分账方案")');
    await expect(page.locator('text=成功')).toBeVisible({ timeout: 15000 });
    
    // 2.2 切换到里程碑管理 (测试凭证上传逻辑)
    await page.selectOption('select', 'milestone');
    await page.selectOption('select >> nth=1', 'submit');
    await page.fill('input[placeholder="里程碑ID *"]', 'ms-test-123');
    await expect(page.locator('text=交付凭证配置')).toBeVisible();
    await expect(page.locator('button:has-text("上传文件")')).toBeVisible();
    
    await page.fill('input[placeholder*="交付物 URL"]', 'ipfs://test-hash');
    await page.click('button:has-text("📤 提交")');
    await expect(page.locator('text=成功')).toBeVisible({ timeout: 15000 });
  });

  test('Module 3: 分佣结算 (commission) - 查询流水', async ({ page }) => {
    const category = page.locator('div.rounded-lg:has(div:has-text("分佣结算"))');
    await category.locator('button:has-text("展开子功能")').click();
    
    // 默认是 "查看分润记录"
    await page.click('button:has-text("查询记录")');
    await expect(page.locator('text=成功')).toBeVisible({ timeout: 15000 });
  });

  test('Module 4: 发布 (publish) - 步骤向导 (Wizard) 测试', async ({ page }) => {
    const category = page.locator('div.rounded-lg:has(div:has-text("发布"))');
    await category.locator('button:has-text("展开子功能")').click();
    
    // Step 1
    await page.selectOption('select', 'product');
    await page.fill('input[placeholder="标题 *"]', 'E2E Hardware Product');
    await page.click('button:has-text("下一步")');
    
    // Step 2
    await expect(page.locator('select >> nth=1')).toBeVisible(); // 价格类型
    await page.fill('input[placeholder*="价格"]', '299');
    await page.click('button:has-text("下一步")');
    
    // Step 3
    await expect(page.locator('text=实物属性')).toBeVisible();
    await page.fill('input[placeholder*="规格"]', 'Color: Black, Size: L');
    await page.click('button:has-text("🚀 发布商品")');
    
    await expect(page.locator('text=成功')).toBeVisible({ timeout: 15000 });
  });

  test('Module 5: 仪表盘 (dashboard) - 数据看板测试', async ({ page }) => {
    const category = page.locator('div.rounded-lg:has(div:has-text("Commerce 仪表盘"))');
    await category.locator('button:has-text("展开子功能")').click();
    
    // 验证概览数据
    await expect(page.locator('text=累计总收益')).toBeVisible();
    await expect(page.locator('text=处理中订单')).toBeVisible();
    
    // 验证待办事项
    await expect(page.locator('text=待处理里程碑')).toBeVisible();
    
    // 点击刷新
    await page.click('text=刷新数据');
    await expect(page.locator('text=🗓️ Commerce 实时概览')).toBeVisible();
  });
});

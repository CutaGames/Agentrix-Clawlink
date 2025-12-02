# PayMind Agent V3.0 UI实现指南

**快速集成新的UI组件**

---

## 🚀 快速开始

### 1. 使用新的Agent Chat组件

在Agent页面中替换原有组件：

```tsx
// 旧组件
import { AgentChat } from '../../components/agent/AgentChat';

// 新组件（V3.0优化版）
import { AgentChatV3 } from '../../components/agent/AgentChatV3';

// 使用
<AgentChatV3
  onProductSelect={(id) => handleProductSelect(id)}
  onOrderQuery={(id) => handleOrderQuery(id)}
  onCodeGenerate={(prompt) => handleCodeGenerate(prompt)}
/>
```

### 2. 使用基础UI组件

```tsx
import { GlassCard, AIButton, CodeSnippet } from '../../components/ui';

// 玻璃卡片
<GlassCard glow hover>
  <h3>标题</h3>
  <p>内容</p>
</GlassCard>

// AI按钮
<AIButton variant="primary" glow onClick={handleClick}>
  点击我
</AIButton>

// 代码片段
<CodeSnippet
  code="const payment = await paymind.payments.create({amount: 100});"
  language="typescript"
  title="支付示例"
/>
```

### 3. 使用商品卡片

```tsx
import { ProductCardV3 } from '../../components/marketplace/ProductCardV3';

<ProductCardV3
  id="prod-123"
  name="商品名称"
  price={100}
  currency="CNY"
  onSelect={(id) => console.log('选择:', id)}
  onAddToCart={(id) => console.log('加入购物车:', id)}
/>
```

---

## 🎨 样式类使用

### 背景和容器

```tsx
// 深色背景
<div className="bg-neutral-900">

// 网格背景
<div className="bg-neutral-900 grid-background">

// 玻璃拟态
<div className="glass">
<div className="glass-strong">
```

### 颜色使用

```tsx
// 主色
<div className="text-primary-blue">
<div className="text-primary-cyan">
<div className="text-primary-neon">

// 中性色
<div className="text-neutral-100">
<div className="bg-neutral-800">

// 强调色
<div className="text-accent-green">
<div className="text-accent-yellow">
<div className="text-accent-red">
```

### 渐变背景

```tsx
// AI渐变
<div className="bg-ai-gradient">

// 链上资产渐变
<div className="bg-chain-gradient">
```

### 光晕效果

```tsx
// AI光晕
<div className="ai-glow">

// 自定义光晕
<div className="shadow-glow-blue">
<div className="shadow-glow-cyan">
```

### 动画

```tsx
// 思考动画
<div className="thinking-dots">
  <span></span>
  <span></span>
  <span></span>
</div>

// 脉冲光晕
<div className="animate-pulse-glow">

// 浮动动画
<div className="animate-float">
```

---

## 📱 页面布局示例

### Agent页面布局

```tsx
<div className="h-screen bg-neutral-900 grid-background">
  <AgentChatV3
    onProductSelect={handleProductSelect}
    onOrderQuery={handleOrderQuery}
    onCodeGenerate={handleCodeGenerate}
  />
</div>
```

### 商城页面布局

```tsx
<div className="min-h-screen bg-neutral-900">
  {/* Header */}
  <header className="glass-strong border-b border-neutral-700/50">
    <div className="container mx-auto px-4 py-4">
      <h1 className="text-2xl font-bold text-neutral-100">商城</h1>
    </div>
  </header>

  {/* 商品网格 */}
  <div className="container mx-auto px-4 py-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map(product => (
        <ProductCardV3 key={product.id} {...product} />
      ))}
    </div>
  </div>
</div>
```

### 开发者控制台布局

```tsx
<div className="min-h-screen bg-neutral-900 grid-background">
  <div className="container mx-auto px-4 py-8">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* 左侧：API Explorer */}
      <div className="lg:col-span-2">
        <GlassCard>
          <h2 className="text-xl font-bold text-neutral-100 mb-4">API Explorer</h2>
          {/* API Explorer内容 */}
        </GlassCard>
      </div>

      {/* 右侧：代码生成 */}
      <div>
        <CodeSnippet
          code={generatedCode}
          language="typescript"
          title="生成的代码"
        />
      </div>
    </div>
  </div>
</div>
```

---

## 🎯 最佳实践

### 1. 颜色使用
- ✅ 使用语义化颜色类（`text-primary-neon`）
- ✅ 避免硬编码颜色值
- ✅ 保持配色一致性

### 2. 组件组合
- ✅ 使用GlassCard包裹内容
- ✅ 使用AIButton作为主要操作按钮
- ✅ 保持组件层次清晰

### 3. 动画使用
- ✅ 适度使用动画，不要过度
- ✅ 思考动画用于加载状态
- ✅ Hover效果用于交互反馈

### 4. 响应式设计
- ✅ 使用Tailwind响应式类
- ✅ 测试不同屏幕尺寸
- ✅ 移动端优化布局

---

## 🔧 自定义扩展

### 创建自定义组件

```tsx
import { GlassCard } from '../ui/GlassCard';
import { AIButton } from '../ui/AIButton';

export function CustomComponent() {
  return (
    <GlassCard glow>
      <h3 className="text-neutral-100">自定义组件</h3>
      <AIButton>操作</AIButton>
    </GlassCard>
  );
}
```

### 扩展Tailwind配置

在 `tailwind.config.js` 中添加自定义类：

```js
theme: {
  extend: {
    // 添加自定义颜色
    colors: {
      'custom-color': '#FF0000',
    },
    // 添加自定义动画
    animation: {
      'custom-animation': 'custom-animation 2s infinite',
    },
  },
}
```

---

## 📚 组件API参考

### GlassCard

```tsx
interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;      // 是否显示光晕
  hover?: boolean;     // 是否启用hover效果
}
```

### AIButton

```tsx
interface AIButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'outline';
  glow?: boolean;
  className?: string;
  // ... 其他button属性
}
```

### CodeSnippet

```tsx
interface CodeSnippetProps {
  code: string;
  language?: 'typescript' | 'javascript' | 'python' | 'curl';
  title?: string;
}
```

---

## ✅ 检查清单

使用新UI组件前，确保：

- [ ] Tailwind配置已更新
- [ ] 全局样式已导入
- [ ] 组件已正确导入
- [ ] 颜色类名正确
- [ ] 响应式设计已测试
- [ ] 动画效果正常
- [ ] 无控制台错误

---

**UI实现完成！** 🎨

现在可以使用新的UI组件构建符合Figma设计规范的界面了。


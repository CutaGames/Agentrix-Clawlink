import { useState, useEffect, useCallback } from 'react';

interface CodeExample {
  language: 'typescript' | 'javascript' | 'python';
  title: string;
  code: string;
  description: string;
}

interface CodeGeneratorProps {
  prompt?: string;
}

export function CodeGenerator({ prompt }: CodeGeneratorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<'typescript' | 'javascript' | 'python'>('typescript');
  const [codeExamples, setCodeExamples] = useState<CodeExample[]>([]);
  const [loading, setLoading] = useState(false);

  const generateCode = useCallback(async (userPrompt: string) => {
    setLoading(true);
    // 模拟AI生成代码（实际应该调用后端API）
    setTimeout(() => {
      const examples = generateCodeExamples(userPrompt, selectedLanguage);
      setCodeExamples(examples);
      setLoading(false);
    }, 1500);
  }, [selectedLanguage]);

// Functions moved to bottom of file


  useEffect(() => {
    if (prompt) {
      generateCode(prompt);
    }
  }, [prompt, generateCode]);

  return (
    <div className="space-y-4">
      {/* 语言选择 */}
      <div className="flex space-x-2">
        {(['typescript', 'javascript', 'python'] as const).map((lang) => (
          <button
            key={lang}
            onClick={() => {
              setSelectedLanguage(lang);
              if (prompt) generateCode(prompt);
            }}
            className={`px-4 py-2 rounded-lg ${
              selectedLanguage === lang
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {lang === 'typescript' ? 'TypeScript' : lang === 'javascript' ? 'JavaScript' : 'Python'}
          </button>
        ))}
      </div>

      {/* 代码示例 */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">生成代码中...</div>
      ) : codeExamples.length > 0 ? (
        <div className="space-y-4">
          {codeExamples.map((example, index) => (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h4 className="font-semibold text-gray-900">{example.title}</h4>
                <p className="text-sm text-gray-600">{example.description}</p>
              </div>
              <pre className="p-4 bg-gray-900 text-gray-100 overflow-x-auto">
                <code>{example.code}</code>
              </pre>
              <div className="bg-gray-50 px-4 py-2 flex justify-end">
                <button
                  onClick={() => navigator.clipboard.writeText(example.code)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  复制代码
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">💻</div>
          <div>输入需求，我将为您生成代码示例</div>
        </div>
      )}
    </div>
  );
}

const generateCodeExamples = (prompt: string, language: 'typescript' | 'javascript' | 'python'): CodeExample[] => {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('支付') || lowerPrompt.includes('payment') || lowerPrompt.includes('create')) {
    return [
      {
        language,
        title: '创建支付',
        description: '创建一个新的支付请求',
        code: getPaymentCode(language),
      },
      {
        language,
        title: '查询支付状态',
        description: '查询支付的状态',
        code: getPaymentStatusCode(language),
      },
    ];
  }

  if (lowerPrompt.includes('订单') || lowerPrompt.includes('order')) {
    return [
      {
        language,
        title: '创建订单',
        description: '创建一个新订单',
        code: getOrderCode(language),
      },
      {
        language,
        title: '查询订单',
        description: '查询订单详情',
        code: getOrderQueryCode(language),
      },
    ];
  }

  if (lowerPrompt.includes('商品') || lowerPrompt.includes('product')) {
    return [
      {
        language,
        title: '搜索商品',
        description: '在Marketplace中搜索商品',
        code: getProductSearchCode(language),
      },
    ];
  }

  // 默认示例
  return [
    {
      language,
      title: '初始化SDK',
      description: '初始化Agentrix SDK客户端',
      code: getInitCode(language),
    },
  ];
};

const getPaymentCode = (lang: string) => {
  const codes: Record<string, string> = {
    typescript: `import { Agentrix } from '@agentrix/sdk';

const agentrix = new Agentrix({
apiKey: process.env.AGENTRIX_API_KEY,
});

// 创建支付
const payment = await agentrix.payments.create({
amount: 100,
currency: 'CNY',
description: '商品购买',
metadata: {
  productId: 'prod_123',
},
});

console.log('支付ID:', payment.id);
console.log('支付链接:', payment.paymentUrl);`,
    javascript: `const { Agentrix } = require('@agentrix/sdk');

const agentrix = new Agentrix({
apiKey: process.env.AGENTRIX_API_KEY,
});

// 创建支付
const payment = await agentrix.payments.create({
amount: 100,
currency: 'CNY',
description: '商品购买',
metadata: {
  productId: 'prod_123',
},
});

console.log('支付ID:', payment.id);`,
    python: `from agentrix import Agentrix

agentrix = Agentrix(api_key=os.getenv('AGENTRIX_API_KEY'))

# 创建支付
payment = agentrix.payments.create(
  amount=100,
  currency='CNY',
  description='商品购买',
  metadata={
      'productId': 'prod_123'
  }
)

print(f"支付ID: {payment.id}")
print(f"支付链接: {payment.payment_url}")`,
  };
  return codes[lang] || codes.typescript;
};

const getPaymentStatusCode = (lang: string) => {
  const codes: Record<string, string> = {
    typescript: `// 查询支付状态
const payment = await agentrix.payments.get(paymentId);
console.log('状态:', payment.status);
console.log('金额:', payment.amount);`,
    javascript: `// 查询支付状态
const payment = await agentrix.payments.get(paymentId);
console.log('状态:', payment.status);`,
    python: `# 查询支付状态
payment = agentrix.payments.get(payment_id)
print(f"状态: {payment.status}")`,
  };
  return codes[lang] || codes.typescript;
};

const getOrderCode = (lang: string) => {
  const codes: Record<string, string> = {
    typescript: `// 创建订单
const order = await agentrix.orders.create({
productId: 'prod_123',
quantity: 1,
amount: 100,
});

console.log('订单ID:', order.id);`,
    javascript: `const order = await agentrix.orders.create({
productId: 'prod_123',
quantity: 1,
amount: 100,
});`,
    python: `order = agentrix.orders.create(
  product_id='prod_123',
  quantity=1,
  amount=100
)`,
  };
  return codes[lang] || codes.typescript;
};

const getOrderQueryCode = (lang: string) => {
  const codes: Record<string, string> = {
    typescript: `// 查询订单
const order = await agentrix.orders.get(orderId);
console.log('订单状态:', order.status);`,
    javascript: `const order = await agentrix.orders.get(orderId);`,
    python: `order = agentrix.orders.get(order_id)`,
  };
  return codes[lang] || codes.typescript;
};

const getProductSearchCode = (lang: string) => {
  const codes: Record<string, string> = {
    typescript: `// 搜索商品
const products = await agentrix.marketplace.searchProducts({
query: '笔记本电脑',
priceMax: 10000,
});

console.log('找到', products.length, '个商品');`,
    javascript: `const products = await agentrix.marketplace.searchProducts({
query: '笔记本电脑',
priceMax: 10000,
});`,
    python: `products = agentrix.marketplace.search_products(
  query='笔记本电脑',
  price_max=10000
)`,
  };
  return codes[lang] || codes.typescript;
};

const getInitCode = (lang: string) => {
  const codes: Record<string, string> = {
    typescript: `import { Agentrix } from '@agentrix/sdk';

const agentrix = new Agentrix({
apiKey: process.env.AGENTRIX_API_KEY,
baseUrl: 'https://api.agentrix.com',
});`,
    javascript: `const { Agentrix } = require('@agentrix/sdk');

const agentrix = new Agentrix({
apiKey: process.env.AGENTRIX_API_KEY,
});`,
    python: `from agentrix import Agentrix

agentrix = Agentrix(api_key=os.getenv('AGENTRIX_API_KEY'))`,
  };
  return codes[lang] || codes.typescript;
};


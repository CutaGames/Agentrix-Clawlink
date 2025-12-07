import { useState } from 'react';
import { useLocalization } from '../../../contexts/LocalizationContext';
import { useToast } from '../../../contexts/ToastContext';
import type { WorkflowDefinition } from './WorkflowEditor';
import { saasDeploymentApi, type DeploymentRequest } from '../../../lib/api/saas-deployment.api';

interface AgentExportPanelProps {
  agentId?: string;
  agentName: string;
  agentType: 'user' | 'merchant' | 'developer';
  workflow?: WorkflowDefinition | null;
  form: any;
  onExport?: (exportType: string, platform?: string) => void;
}

export type ExportType = 'docker' | 'serverless' | 'edge' | 'standalone';
export type ServerlessPlatform = 'aws' | 'gcp' | 'vercel' | 'cloudflare';

/**
 * Agent导出面板
 * 支持导出为Docker、Serverless、Edge Worker或独立界面
 */
export function AgentExportPanel({
  agentId,
  agentName,
  agentType,
  workflow,
  form,
  onExport,
}: AgentExportPanelProps) {
  const { t } = useLocalization();
  const { success, error } = useToast();
  const [exportType, setExportType] = useState<ExportType>('standalone'); // 默认 SaaS 托管
  const [platform, setPlatform] = useState<ServerlessPlatform>('aws');
  const [exporting, setExporting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const handleExport = async () => {
    if (!agentId) {
      error(t({ zh: '请先创建Agent实例', en: 'Please create Agent instance first' }));
      return;
    }

    setExporting(true);
    try {
      if (exportType === 'standalone') {
        // SaaS 托管：如果没有 agentId，直接生成独立应用
        if (!agentId) {
          console.warn('没有 agentId，直接生成独立HTML/JS应用');
          const exportPackage = generateExportPackage(exportType, platform);
          downloadExportPackage(exportPackage, agentName, exportType);
          success(
            t({
              zh: '已生成独立HTML/JS应用',
              en: 'Standalone HTML/JS app generated',
            })
          );
          onExport?.(exportType, platform);
          setExporting(false);
          return;
        }

        // 尝试调用部署 API
        const deploymentRequest: DeploymentRequest = {
          agentId,
          deploymentType: 'saas',
          config: {
            autoScale: true,
            resources: {
              memory: 512,
              cpu: 0.5,
            },
          },
        };

        try {
          const deployment = await saasDeploymentApi.deploy(deploymentRequest);
          success(
            t({
              zh: `🎉 Agent 已部署到云端！访问链接: ${deployment.url || '生成中...'}`,
              en: `🎉 Agent deployed to cloud! Access URL: ${deployment.url || 'Generating...'}`,
            })
          );
          onExport?.(exportType, platform);
        } catch (deployError: any) {
          // 如果部署失败，仍然生成独立HTML/JS应用
          console.warn('SaaS部署失败，生成独立应用:', deployError);
          const exportPackage = generateExportPackage(exportType, platform);
          downloadExportPackage(exportPackage, agentName, exportType);
          success(
            t({
              zh: '已生成独立HTML/JS应用（SaaS部署失败，已下载本地版本）',
              en: 'Standalone HTML/JS app generated (SaaS deployment failed, downloaded local version)',
            })
          );
          onExport?.(exportType, platform);
        }
      } else {
        // Docker/Serverless/Edge 导出：生成导出包
        const exportPackage = generateExportPackage(exportType, platform);
        downloadExportPackage(exportPackage, agentName, exportType);
        success(t({ zh: '导出成功！', en: 'Export successful!' }));
        onExport?.(exportType, platform);
      }
    } catch (err: any) {
      error(err.message || t({ zh: '导出失败', en: 'Export failed' }));
    } finally {
      setExporting(false);
    }
  };

  const generateExportPackage = (type: ExportType, platform?: ServerlessPlatform) => {
    const packageData: Record<string, string> = {};

    // 基础文件
    packageData['README.md'] = generateREADME(agentName, agentType, type, platform);
    packageData['package.json'] = generatePackageJson(agentName, type);
    packageData['.env.example'] = generateEnvExample(agentId);

    // 根据导出类型生成不同文件
    if (type === 'docker') {
      packageData['Dockerfile'] = generateDockerfile(agentType);
      packageData['docker-compose.yml'] = generateDockerCompose();
      packageData['deploy.sh'] = generateDeployScript('docker');
    } else if (type === 'serverless') {
      if (platform === 'aws') {
        packageData['serverless.yml'] = generateServerlessYml('aws');
        packageData['lambda-handler.js'] = generateLambdaHandler(agentType, workflow);
      } else if (platform === 'gcp') {
        packageData['app.yaml'] = generateAppYaml();
        packageData['main.js'] = generateCloudRunHandler(agentType, workflow);
      } else if (platform === 'vercel') {
        packageData['vercel.json'] = generateVercelJson();
        packageData['api/index.js'] = generateVercelHandler(agentType, workflow);
      }
    } else if (type === 'edge') {
      if (platform === 'cloudflare') {
        packageData['wrangler.toml'] = generateWranglerToml();
        packageData['worker.js'] = generateCloudflareWorker(agentType, workflow);
      }
    } else if (type === 'standalone') {
      packageData['index.html'] = generateStandaloneHTML(agentName, agentType, agentId);
      packageData['agent-app.js'] = generateStandaloneJS(agentType, workflow);
      packageData['agent-app.css'] = generateStandaloneCSS();
    }

    // Agent运行时
    packageData['agent.js'] = generateAgentRuntime(agentType, workflow, form);

    // 配置文件
    packageData['config/webhook.json'] = generateWebhookConfig();
    packageData['config/monitoring.json'] = generateMonitoringConfig();

    return packageData;
  };

  const loadJSZipFromCDN = async (): Promise<any | null> => {
    if (typeof window === 'undefined') {
      return null;
    }

    if ((window as any).JSZip) {
      return (window as any).JSZip;
    }

    // 如果已经在加载，等待加载完成
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-jszip]');
    if (existingScript) {
      return new Promise((resolve, reject) => {
        existingScript.addEventListener('load', () => resolve((window as any).JSZip));
        existingScript.addEventListener('error', () => reject(new Error('JSZip加载失败')));
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
      script.async = true;
      script.dataset.jszip = 'true';
      script.onload = () => resolve((window as any).JSZip);
      script.onerror = () => reject(new Error('JSZip加载失败'));
      document.body.appendChild(script);
    });
  };

  const downloadExportPackage = async (packageData: Record<string, string>, name: string, type: ExportType) => {
    try {
      // 优先使用已存在的JSZip实例，其次尝试通过CDN加载
      let JSZip: any = null;
      if (typeof window !== 'undefined' && (window as any).JSZip) {
        JSZip = (window as any).JSZip;
      } else {
        try {
          JSZip = await loadJSZipFromCDN();
        } catch (loadError) {
          console.warn('JSZip not available, using fallback download method:', loadError);
        }
      }

      if (!JSZip) {
        // Fallback方案：逐个下载文件
        const mainFiles = ['README.md', 'package.json', 'agent.js', '.env.example'];
        const downloadedFiles: string[] = [];
        
        // 延迟下载，避免浏览器阻止多个下载
        for (const [path, content] of Object.entries(packageData)) {
          const fileName = path.split('/').pop() || path;
          if (mainFiles.includes(fileName) || !downloadedFiles.includes(fileName)) {
            await new Promise(resolve => setTimeout(resolve, 100)); // 延迟100ms
            
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            downloadedFiles.push(fileName);
          }
        }
        
        // 提示用户
        success(t({ 
          zh: `已下载 ${downloadedFiles.length} 个文件。如需完整ZIP包，请运行: npm install jszip`, 
          en: `Downloaded ${downloadedFiles.length} files. To get a ZIP package, run: npm install jszip` 
        }));
        return;
      }

      // 使用JSZip创建ZIP文件
      const zip = new JSZip();
      
      Object.entries(packageData).forEach(([path, content]) => {
        zip.file(path, content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}-${type}-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      success(t({ 
        zh: '导出成功！ZIP包已下载', 
        en: 'Export successful! ZIP package downloaded' 
      }));
    } catch (error: any) {
      console.error('导出失败:', error);
      // 如果ZIP创建失败，回退到逐个下载
      error(t({ 
        zh: `ZIP创建失败: ${error.message}，已回退到逐个下载文件`, 
        en: `ZIP creation failed: ${error.message}, falling back to individual file download` 
      }));
      
      // 逐个下载文件
      for (const [path, content] of Object.entries(packageData)) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = path.split('/').pop() || 'file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t({ zh: '导出Agent', en: 'Export Agent' })}
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          {t({ 
            zh: '选择导出方式，生成可独立运行的Agent部署包', 
            en: 'Choose export method to generate standalone Agent deployment package' 
          })}
        </p>
      </div>

      {/* 导出类型选择 */}
      <div className="space-y-4">
        {/* P0: Docker 和 SaaS 托管（优先展示） */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            {t({ zh: '推荐方式', en: 'Recommended' })} ✨
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setExportType('docker')}
              className={`p-4 rounded-xl border-2 transition-all ${
                exportType === 'docker'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">🐳</div>
              <div className="font-semibold text-gray-900">Docker</div>
              <div className="text-xs text-gray-500 mt-1">
                {t({ zh: '自托管部署', en: 'Self-hosted' })}
              </div>
            </button>

            <button
              onClick={() => setExportType('standalone')}
              className={`p-4 rounded-xl border-2 transition-all ${
                exportType === 'standalone'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">☁️</div>
              <div className="font-semibold text-gray-900">
                {t({ zh: 'SaaS 托管', en: 'SaaS Hosted' })}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {t({ zh: '一键上线', en: 'One-click deploy' })}
              </div>
            </button>
          </div>
        </div>

        {/* P1: Serverless/Edge（标记为即将推出） */}
        <div>
          <h4 className="text-sm font-semibold text-gray-500 mb-3">
            {t({ zh: '即将推出', en: 'Coming Soon' })} 🚀
          </h4>
          <div className="grid grid-cols-2 gap-4 opacity-60">
            <div className="p-4 rounded-xl border-2 border-gray-200 bg-gray-50 cursor-not-allowed relative">
              <div className="absolute top-2 right-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                {t({ zh: '即将推出', en: 'Soon' })}
              </div>
              <div className="text-2xl mb-2">☁️</div>
              <div className="font-semibold text-gray-900">Serverless</div>
              <div className="text-xs text-gray-500 mt-1">
                {t({ zh: '无服务器函数', en: 'Serverless function' })}
              </div>
            </div>

            <div className="p-4 rounded-xl border-2 border-gray-200 bg-gray-50 cursor-not-allowed relative">
              <div className="absolute top-2 right-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                {t({ zh: '即将推出', en: 'Soon' })}
              </div>
              <div className="text-2xl mb-2">⚡</div>
              <div className="font-semibold text-gray-900">Edge Worker</div>
              <div className="text-xs text-gray-500 mt-1">
                {t({ zh: '边缘计算', en: 'Edge computing' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 平台选择（Serverless/Edge - 暂时隐藏） */}
      {false && (exportType === 'serverless' || exportType === 'edge') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t({ zh: '选择平台', en: 'Select Platform' })}
          </label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as ServerlessPlatform)}
            className="w-full p-3 border border-gray-300 rounded-lg"
          >
            {exportType === 'serverless' && (
              <>
                <option value="aws">AWS Lambda</option>
                <option value="gcp">Google Cloud Run</option>
                <option value="vercel">Vercel</option>
              </>
            )}
            {exportType === 'edge' && (
              <option value="cloudflare">Cloudflare Workers</option>
            )}
          </select>
        </div>
      )}

      {/* SaaS 托管说明 */}
      {exportType === 'standalone' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            {t({
              zh: '💡 SaaS 托管：您的 Agent 将直接部署到 Agentrix 云端，无需配置服务器。生成后即可获得访问链接。',
              en: '💡 SaaS Hosted: Your Agent will be deployed directly to Agentrix cloud, no server configuration needed. You will get an access link after generation.',
            })}
          </p>
        </div>
      )}

      {/* 配置选项 */}
      <div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {showConfig ? '▼' : '▶'} {t({ zh: '高级配置', en: 'Advanced Config' })}
        </button>
        {showConfig && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                {t({ zh: '内存限制 (MB)', en: 'Memory Limit (MB)' })}
              </label>
              <input
                type="number"
                defaultValue={512}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                {t({ zh: '超时时间 (秒)', en: 'Timeout (seconds)' })}
              </label>
              <input
                type="number"
                defaultValue={30}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                {t({ zh: '区域', en: 'Region' })}
              </label>
              <select className="w-full p-2 border border-gray-300 rounded text-sm">
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-west-2">US West (Oregon)</option>
                <option value="eu-west-1">EU (Ireland)</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 导出按钮 */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {exporting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {t({ zh: '正在导出...', en: 'Exporting...' })}
          </span>
        ) : (
          <span>
            {t({ zh: '📦 下载导出包', en: '📦 Download Export Package' })}
          </span>
        )}
      </button>

      {/* 导出说明 */}
      <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
        <p className="font-semibold mb-2">
          {t({ zh: '导出包包含：', en: 'Export package includes:' })}
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>{t({ zh: 'Agent运行时代码', en: 'Agent runtime code' })}</li>
          <li>{t({ zh: '配置文件（env、webhook、监控）', en: 'Config files (env, webhook, monitoring)' })}</li>
          <li>{t({ zh: '部署脚本和说明文档', en: 'Deployment scripts and documentation' })}</li>
          {exportType === 'standalone' && (
            <li>{t({ zh: '独立HTML/JS应用', en: 'Standalone HTML/JS application' })}</li>
          )}
        </ul>
      </div>
    </div>
  );
}

// ========== 生成导出文件内容 ==========

function generateREADME(
  name: string,
  type: string,
  exportType: ExportType,
  platform?: ServerlessPlatform
): string {
  return `# ${name} - Agent部署包

## 📋 概述

这是通过Agentrix Agent Builder生成的${type}类型Agent。

## 🚀 快速开始

${exportType === 'docker' ? `
### Docker部署

\`\`\`bash
# 构建镜像
docker build -t ${name.toLowerCase()}-agent .

# 运行容器
docker-compose up -d

# 查看日志
docker-compose logs -f
\`\`\`
` : exportType === 'serverless' ? `
### ${platform?.toUpperCase()}部署

\`\`\`bash
# 安装依赖
npm install

# 部署到${platform === 'aws' ? 'AWS Lambda' : platform === 'gcp' ? 'Google Cloud Run' : 'Vercel'}
${platform === 'aws' ? 'serverless deploy' : platform === 'gcp' ? 'gcloud run deploy' : 'vercel deploy'}
\`\`\`
` : exportType === 'edge' ? `
### Cloudflare Workers部署

\`\`\`bash
# 安装Wrangler CLI
npm install -g wrangler

# 部署
wrangler publish
\`\`\`
` : `
### 独立界面部署

1. 将文件上传到Web服务器
2. 配置API密钥（在.env文件中）
3. 访问index.html即可使用
`}

## ⚙️ 配置

1. 复制 \`.env.example\` 为 \`.env\`
2. 填写必要的环境变量：
   - AGENTRIX_API_KEY: 您的Agentrix API密钥
   - AGENT_ID: Agent ID
   - WEBHOOK_URL: Webhook回调地址

## 📚 更多信息

请参考Agentrix文档：https://docs.agentrix.ai
`;
}

function generatePackageJson(name: string, exportType: ExportType): string {
  const baseDeps: Record<string, string> = {
    '@agentrix/agent-sdk': '^3.0.0',
  };

  if (exportType === 'serverless') {
    return JSON.stringify({
      name: `${name.toLowerCase()}-agent`,
      version: '1.0.0',
      main: 'agent.js',
      dependencies: baseDeps,
      scripts: {
        deploy: 'serverless deploy',
      },
    }, null, 2);
  }

  return JSON.stringify({
    name: `${name.toLowerCase()}-agent`,
    version: '1.0.0',
    main: 'agent.js',
    dependencies: baseDeps,
    scripts: {
      start: 'node agent.js',
    },
  }, null, 2);
}

function generateEnvExample(agentId?: string): string {
  return `# Agentrix Agent环境变量配置

# Agentrix API密钥（必需）
AGENTRIX_API_KEY=your-api-key-here

# Agent ID（可选，如果已创建Agent实例）
AGENT_ID=${agentId || 'your-agent-id'}

# API基础URL（可选，默认使用Agentrix官方API）
AGENTRIX_API_URL=https://api.agentrix.ai

# Webhook回调地址（可选）
WEBHOOK_URL=https://your-domain.com/webhook

# 监控配置（可选）
MONITORING_ENABLED=true
LOG_LEVEL=info
`;
}

function generateDockerfile(agentType: string): string {
  return `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "agent.js"]
`;
}

function generateDockerCompose(): string {
  return `version: '3.8'

services:
  agent:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    restart: unless-stopped
`;
}

function generateDeployScript(type: string): string {
  return `#!/bin/bash
# ${type}部署脚本

set -e

echo "🚀 开始部署Agent..."

# 检查环境变量
if [ ! -f .env ]; then
  echo "⚠️  警告: .env文件不存在，请从.env.example复制并配置"
  exit 1
fi

# 部署
${type === 'docker' ? `
docker-compose up -d
echo "✅ Agent已部署到Docker"
` : ''}

echo "✅ 部署完成！"
`;
}

function generateServerlessYml(platform: string): string {
  return `service: agentrix-agent

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  memorySize: 512
  timeout: 30

functions:
  agent:
    handler: lambda-handler.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
`;
}

function generateLambdaHandler(agentType: string, workflow?: WorkflowDefinition | null): string {
  return `const { AgentrixAgent } = require('@agentrix/agent-sdk');

exports.handler = async (event) => {
  const agent = new AgentrixAgent({
    apiKey: process.env.AGENTRIX_API_KEY,
    agentType: '${agentType}',
    workflow: ${JSON.stringify(workflow || {}, null, 2)},
  });

  return {
    statusCode: 200,
    body: JSON.stringify(await agent.handle(event)),
  };
};
`;
}

function generateAppYaml(): string {
  return `runtime: nodejs18

env_variables:
  NODE_ENV: production

automatic_scaling:
  min_instances: 1
  max_instances: 10
`;
}

function generateCloudRunHandler(agentType: string, workflow?: WorkflowDefinition | null): string {
  return `const express = require('express');
const { AgentrixAgent } = require('@agentrix/agent-sdk');

const app = express();
app.use(express.json());

const agent = new AgentrixAgent({
  apiKey: process.env.AGENTRIX_API_KEY,
  agentType: '${agentType}',
  workflow: ${JSON.stringify(workflow || {}, null, 2)},
});

app.post('*', async (req, res) => {
  try {
    const result = await agent.handle(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(\`Agent running on port \${port}\`);
});
`;
}

function generateVercelJson(): string {
  return JSON.stringify({
    version: 2,
    builds: [
      {
        src: 'api/index.js',
        use: '@vercel/node',
      },
    ],
    routes: [
      {
        src: '/(.*)',
        dest: '/api/index.js',
      },
    ],
  }, null, 2);
}

function generateVercelHandler(agentType: string, workflow?: WorkflowDefinition | null): string {
  return `const { AgentrixAgent } = require('@agentrix/agent-sdk');

module.exports = async (req, res) => {
  const agent = new AgentrixAgent({
    apiKey: process.env.AGENTRIX_API_KEY,
    agentType: '${agentType}',
    workflow: ${JSON.stringify(workflow || {}, null, 2)},
  });

  try {
    const result = await agent.handle(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
`;
}

function generateWranglerToml(): string {
  return `name = "agentrix-agent"
main = "worker.js"
compatibility_date = "2024-01-01"

[env.production]
vars = { NODE_ENV = "production" }
`;
}

function generateCloudflareWorker(agentType: string, workflow?: WorkflowDefinition | null): string {
  return `import { AgentrixAgent } from '@agentrix/agent-sdk';

export default {
  async fetch(request, env) {
    const agent = new AgentrixAgent({
      apiKey: env.AGENTRIX_API_KEY,
      agentType: '${agentType}',
      workflow: ${JSON.stringify(workflow || {}, null, 2)},
    });

    const body = await request.json();
    const result = await agent.handle(body);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
`;
}

function generateStandaloneHTML(name: string, agentType: string, agentId?: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - Agentrix Agent</title>
  <link rel="stylesheet" href="agent-app.css">
</head>
<body>
  <div id="agent-app"></div>
  <script>
    window.AGENT_CONFIG = {
      agentId: '${agentId || ''}',
      agentType: '${agentType}',
      apiKey: 'YOUR_API_KEY_HERE',
    };
  </script>
  <script src="agent-app.js"></script>
</body>
</html>
`;
}

function generateStandaloneJS(agentType: string, workflow?: WorkflowDefinition | null): string {
  return `// Agentrix Agent独立应用
(function() {
  const config = window.AGENT_CONFIG || {};
  
  // 初始化Agent应用
  // 这里会加载对应的Agent界面组件
  const agentType = config.agentType || 'user';
  
  // 根据类型加载不同的界面
  if (agentType === 'user') {
    // 加载个人Agent界面
    loadPersonalAgentApp(config);
  } else if (agentType === 'merchant') {
    // 加载商家Agent界面
    loadMerchantAgentApp(config);
  } else if (agentType === 'developer') {
    // 加载开发者Agent界面
    loadDeveloperAgentApp(config);
  }
  
  function loadPersonalAgentApp(config) {
    // 个人Agent界面实现
    document.getElementById('agent-app').innerHTML = \`
      <div class="agent-container">
        <div class="agent-sidebar">
          <h3>个人助手</h3>
          <ul>
            <li>账单助手</li>
            <li>支付助手</li>
            <li>钱包管理</li>
            <li>风控提醒</li>
            <li>自动购买</li>
          </ul>
        </div>
        <div class="agent-chat">
          <!-- 对话界面 -->
        </div>
      </div>
    \`;
  }
  
  function loadMerchantAgentApp(config) {
    // 商家Agent界面实现
  }
  
  function loadDeveloperAgentApp(config) {
    // 开发者Agent界面实现
  }
})();
`;
}

function generateStandaloneCSS(): string {
  return `/* Agentrix Agent独立应用样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0a0a0a;
  color: #fff;
}

.agent-container {
  display: flex;
  height: 100vh;
}

.agent-sidebar {
  width: 250px;
  background: #1a1a1a;
  padding: 20px;
}

.agent-chat {
  flex: 1;
  background: #0a0a0a;
}
`;
}

function generateAgentRuntime(
  agentType: string,
  workflow?: WorkflowDefinition | null,
  form?: any
): string {
  return `const { AgentrixAgent } = require('@agentrix/agent-sdk');

const agent = new AgentrixAgent({
  apiKey: process.env.AGENTRIX_API_KEY,
  agentId: process.env.AGENT_ID,
  agentType: '${agentType}',
  capabilities: ${JSON.stringify(form?.capabilities || [], null, 2)},
  workflow: ${JSON.stringify(workflow || {}, null, 2)},
  settings: {
    quickPayLimit: ${form?.quickPayLimit || 20},
    quickPayDaily: ${form?.quickPayDaily || 200},
    autoEarnEnabled: ${form?.autoEarnEnabled || false},
  },
});

// 启动Agent
agent.start().then(() => {
  console.log('Agent started successfully');
}).catch((error) => {
  console.error('Failed to start agent:', error);
  process.exit(1);
});
`;
}

function generateWebhookConfig(): string {
  return JSON.stringify({
    events: ['payment.completed', 'payment.failed', 'order.created'],
    url: '${WEBHOOK_URL}',
    secret: '${WEBHOOK_SECRET}',
  }, null, 2);
}

function generateMonitoringConfig(): string {
  return JSON.stringify({
    enabled: true,
    logLevel: 'info',
    metrics: {
      enabled: true,
      interval: 60,
    },
  }, null, 2);
}



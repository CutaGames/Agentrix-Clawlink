import { useRouter } from 'next/router';
import Link from 'next/link';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

const menuItems = [
  { name: '仪表盘', path: '/admin', icon: '📊' },
  { name: '用户管理', path: '/admin/users', icon: '👤' },
  { name: '商户管理', path: '/admin/merchants', icon: '🏪' },
  { name: '开发者管理', path: '/admin/developers', icon: '👨‍💻' },
  { name: '推广者管理', path: '/admin/promoters', icon: '📢' },
  { name: '资金路径', path: '/admin/fund-paths', icon: '💰' },
  { name: '工单管理', path: '/admin/tickets', icon: '🎫' },
  { name: '营销管理', path: '/admin/marketing', icon: '📢' },
  { name: '风控管理', path: '/admin/risk', icon: '🛡️' },
  { name: '系统管理', path: '/admin/system', icon: '⚙️' },
];

export default function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 侧边栏 */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-10">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-indigo-600">Agentrix 管理后台</h1>
        </div>
        
        {/* 返回主页链接 */}
        <div className="p-4 border-b">
          <Link
            href="/"
            className="flex items-center text-gray-700 hover:text-indigo-600 hover:bg-gray-50 px-3 py-2 rounded transition-colors"
          >
            <span className="mr-2">🏠</span>
            <span>返回主页</span>
          </Link>
        </div>

        <nav className="mt-2">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center px-6 py-3 text-left hover:bg-gray-100 transition-colors ${
                router.pathname === item.path
                  ? 'bg-indigo-50 text-indigo-600 border-r-2 border-indigo-600'
                  : 'text-gray-700'
              }`}
            >
              <span className="mr-3 text-xl">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 主内容区 */}
      <div className="ml-64 p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
          {description && <p className="text-gray-600 mt-2">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}


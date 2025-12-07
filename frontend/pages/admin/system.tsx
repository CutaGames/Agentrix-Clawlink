import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  status: string;
  role?: {
    name: string;
  };
  createdAt: string;
}

interface AdminRole {
  id: string;
  name: string;
  description: string;
  type: string;
  permissions: string[];
  createdAt: string;
}

interface AdminConfig {
  key: string;
  category: string;
  value: string;
  description: string;
  isPublic: boolean;
}

export default function AdminSystem() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'admins' | 'roles' | 'configs' | 'logs'>('admins');
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [configs, setConfigs] = useState<AdminConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'admins') {
      fetchAdmins();
    } else if (activeTab === 'roles') {
      fetchRoles();
    } else if (activeTab === 'configs') {
      fetchConfigs();
    }
  }, [activeTab]);

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:3002/api/admin/system/admins?limit=20', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAdmins(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:3002/api/admin/system/roles', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigs = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:3002/api/admin/system/configs', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setConfigs(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Head>
        <title>系统管理 - Agentrix 管理后台</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="ml-64 p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">系统管理</h2>
            <p className="text-gray-600 mt-2">管理系统配置、管理员和角色</p>
          </div>

          {/* 标签页 */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('admins')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'admins'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                管理员
              </button>
              <button
                onClick={() => setActiveTab('roles')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'roles'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                角色权限
              </button>
              <button
                onClick={() => setActiveTab('configs')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'configs'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                系统配置
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'logs'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                操作日志
              </button>
            </nav>
          </div>

          {loading ? (
            <div className="text-center py-12">加载中...</div>
          ) : activeTab === 'admins' ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-end">
                <button
                  onClick={() => {
                    const username = prompt('用户名:');
                    const email = prompt('邮箱:');
                    const password = prompt('密码:');
                    if (username && email && password) {
                      const token = localStorage.getItem('admin_token');
                      fetch('http://localhost:3002/api/admin/system/admins', {
                        method: 'POST',
                        headers: {
                          Authorization: `Bearer ${token}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ username, email, password }),
                      }).then(() => fetchAdmins());
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  创建管理员
                </button>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      用户名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      邮箱
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      角色
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      创建时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {admins.map((admin) => (
                    <tr key={admin.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {admin.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {admin.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {admin.role?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(admin.status)}`}>
                          {admin.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => router.push(`/admin/system/admins/${admin.id}`)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          查看
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'roles' ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-end">
                <button
                  onClick={() => {
                    const name = prompt('角色名称:');
                    const description = prompt('角色描述:');
                    if (name && description) {
                      const token = localStorage.getItem('admin_token');
                      fetch('http://localhost:3002/api/admin/system/roles', {
                        method: 'POST',
                        headers: {
                          Authorization: `Bearer ${token}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          name,
                          description,
                          type: 'custom',
                          permissions: [],
                        }),
                      }).then(() => fetchRoles());
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  创建角色
                </button>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      角色名称
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      类型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      描述
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      权限数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      创建时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {roles.map((role) => (
                    <tr key={role.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {role.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {role.type}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {role.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {role.permissions?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(role.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => router.push(`/admin/system/roles/${role.id}`)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          查看
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'configs' ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      配置键
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      分类
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      值
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      描述
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      公开
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {configs.map((config) => (
                    <tr key={config.key}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {config.key}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {config.category}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs">
                        {config.value}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {config.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          config.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {config.isPublic ? '是' : '否'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => {
                            const newValue = prompt('新值:', config.value);
                            if (newValue !== null) {
                              const token = localStorage.getItem('admin_token');
                              fetch(`http://localhost:3002/api/admin/system/configs/${config.key}`, {
                                method: 'PUT',
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ value: newValue }),
                              }).then(() => fetchConfigs());
                            }
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          编辑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">操作日志功能开发中...</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}


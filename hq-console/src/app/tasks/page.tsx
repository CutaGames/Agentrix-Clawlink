'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

interface AgentTask {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: string;
}

interface Agent {
  code: string;
  name: string;
  role: string;
  isActive: boolean;
}

interface AgentBoard {
  agent: Agent;
  tasks: AgentTask[];
  stats: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_HQ_API_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8080/api` : 'http://localhost:8080/api');

export default function TaskManagementPage() {
  const [board, setBoard] = useState<AgentBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('');

  // 新建任务表单
  const [newTask, setNewTask] = useState({
    agentCode: '',
    title: '',
    description: '',
    priority: 5,
    scheduledAt: new Date().toISOString().slice(0, 16),
  });

  // 加载任务看板
  const loadBoard = async () => {
    try {
      const response = await fetch(`${API_BASE}/hq/tasks/board/overview`);
      const data = await response.json();
      setBoard(data.board || []);
    } catch (error) {
      console.error('Failed to load board:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard();
    const interval = setInterval(loadBoard, 30000); // 每 30 秒刷新
    return () => clearInterval(interval);
  }, []);

  // 查看任务详情
  const viewTaskDetail = async (taskId: string) => {
    try {
      const response = await fetch(`${API_BASE}/hq/tasks/${taskId}`);
      const data = await response.json();
      setSelectedTask(data.task);
      setShowTaskDetail(true);
    } catch (error) {
      console.error('Failed to load task detail:', error);
    }
  };

  // 创建新任务
  const createTask = async () => {
    try {
      const response = await fetch(`${API_BASE}/hq/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });

      if (response.ok) {
        alert('任务创建成功！');
        setShowCreateModal(false);
        setNewTask({
          agentCode: '',
          title: '',
          description: '',
          priority: 5,
          scheduledAt: new Date().toISOString().slice(0, 16),
        });
        loadBoard();
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  // 删除任务
  const deleteTask = async (taskId: string) => {
    if (!confirm("确定要删除这个任务吗？")) return;

    try {
      await fetch(`${API_BASE}/hq/tasks/${taskId}`, { method: 'DELETE' });
      loadBoard();
      setShowTaskDetail(false);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  // 立即执行任务
  const executeTaskNow = async (taskId: string) => {
    try {
      const response = await fetch(`${API_BASE}/hq/tasks/${taskId}/execute`, {
        method: 'POST',
      });
      const data = await response.json();
      alert(data.message || '任务已标记为立即执行');
      loadBoard();
    } catch (error) {
      console.error('Failed to execute task:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'running': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'text-red-400';
    if (priority >= 5) return 'text-yellow-400';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-100">
        <div className="text-center">
          <div className="text-2xl">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Agent 任务管理中心</h1>
          <p className="text-slate-400 mt-2">
            管理 {board.length} 个 Agent 的任务安排
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg"
        >
          ➕ 创建新任务
        </button>
      </div>

      {/* 任务看板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {board.map((agentBoard) => (
          <Card key={agentBoard.agent.code} className="bg-slate-900 border-slate-800 p-4">
            {/* Agent 头部 */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">{agentBoard.agent.name}</h3>
                <p className="text-sm text-slate-400">{agentBoard.agent.code}</p>
              </div>
              <div className={`px-2 py-1 rounded text-xs ${
                agentBoard.agent.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
              }`}>
                {agentBoard.agent.isActive ? '在线' : '离线'}
              </div>
            </div>

            {/* 统计 */}
            <div className="grid grid-cols-4 gap-2 mb-4 text-xs">
              <div className="text-center">
                <div className="text-yellow-400 font-bold">{agentBoard.stats.pending}</div>
                <div className="text-slate-500">待执行</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 font-bold">{agentBoard.stats.running}</div>
                <div className="text-slate-500">执行中</div>
              </div>
              <div className="text-center">
                <div className="text-green-400 font-bold">{agentBoard.stats.completed}</div>
                <div className="text-slate-500">已完成</div>
              </div>
              <div className="text-center">
                <div className="text-red-400 font-bold">{agentBoard.stats.failed}</div>
                <div className="text-slate-500">失败</div>
              </div>
            </div>

            {/* 任务列表 */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {agentBoard.tasks.length === 0 ? (
                <div className="text-center text-slate-500 py-4">暂无任务</div>
              ) : (
                agentBoard.tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => viewTaskDetail(task.id)}
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded cursor-pointer border border-slate-700"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 mr-2">
                        <div className="font-medium text-sm line-clamp-1">{task.title}</div>
                        <div className="text-xs text-slate-400 line-clamp-1">{task.description}</div>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-xs ${getStatusColor(task.status)}`}>
                        {task.status}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{new Date(task.scheduledAt).toLocaleString('zh-CN')}</span>
                      <span className={getPriorityColor(task.priority)}>P{task.priority}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 添加任务按钮 */}
            <button
              onClick={() => {
                setSelectedAgent(agentBoard.agent.code);
                setNewTask({ ...newTask, agentCode: agentBoard.agent.code });
                setShowCreateModal(true);
              }}
              className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm border border-slate-700"
            >
              + 添加任务
            </button>
          </Card>
        ))}
      </div>

      {/* 任务详情弹窗 */}
      {showTaskDetail && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">{selectedTask.title}</h2>
                <button onClick={() => setShowTaskDetail(false)} className="text-2xl">&times;</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400">描述</label>
                  <p>{selectedTask.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400">状态</label>
                    <div className={`inline-block px-3 py-1 rounded mt-1 ${getStatusColor(selectedTask.status)}`}>
                      {selectedTask.status}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">优先级</label>
                    <p className={getPriorityColor(selectedTask.priority)}>P{selectedTask.priority}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-400">计划执行时间</label>
                  <p>{new Date(selectedTask.scheduledAt).toLocaleString('zh-CN')}</p>
                </div>

                {selectedTask.completedAt && (
                  <div>
                    <label className="text-sm text-slate-400">完成时间</label>
                    <p>{new Date(selectedTask.completedAt).toLocaleString('zh-CN')}</p>
                  </div>
                )}

                {selectedTask.result && (
                  <div>
                    <label className="text-sm text-slate-400">执行结果</label>
                    <pre className="bg-slate-800 p-4 rounded mt-2 text-xs overflow-x-auto">
                      {selectedTask.result}
                    </pre>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  {selectedTask.status === 'pending' && (
                    <button
                      onClick={() => executeTaskNow(selectedTask.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                    >
                      立即执行
                    </button>
                  )}
                  <button
                    onClick={() => deleteTask(selectedTask.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                  >
                    删除任务
                  </button>
                  <button
                    onClick={() => setShowTaskDetail(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 创建任务弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">创建新任务</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-2xl">&times;</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Agent</label>
                  <select
                    value={newTask.agentCode}
                    onChange={(e) => setNewTask({ ...newTask, agentCode: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
                  >
                    <option value="">选择 Agent</option>
                    {board.map((ab) => (
                      <option key={ab.agent.code} value={ab.agent.code}>
                        {ab.agent.name} ({ab.agent.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">任务标题</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
                    placeholder="例如：发布每日市场分析"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">任务描述</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
                    rows={4}
                    placeholder="详细描述任务内容..."
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">优先级 (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: parseInt(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">计划执行时间</label>
                  <input
                    type="datetime-local"
                    value={newTask.scheduledAt}
                    onChange={(e) => setNewTask({ ...newTask, scheduledAt: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={createTask}
                    disabled={!newTask.agentCode || !newTask.title}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded disabled:opacity-50"
                  >
                    创建任务
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

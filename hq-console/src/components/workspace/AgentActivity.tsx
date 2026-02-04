/**
 * Agent Activity Component
 * 
 * 实时显示 Agent 的工作状态：思考中、读取文件、写入文件、执行命令等
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Loader2, 
  FileText, 
  FolderOpen, 
  Edit3, 
  Terminal, 
  Globe, 
  Search, 
  CheckCircle, 
  XCircle,
  Clock,
  Brain
} from 'lucide-react';

export type ActivityType = 
  | 'thinking' 
  | 'reading_file' 
  | 'writing_file' 
  | 'editing_file' 
  | 'listing_dir' 
  | 'running_command' 
  | 'fetching_url'
  | 'searching'
  | 'idle'
  | 'completed'
  | 'error';

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  detail?: string;
  status: 'running' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
}

interface AgentActivityProps {
  activities: Activity[];
  isThinking: boolean;
  thinkingDuration?: number;
}

const activityIcons: Record<ActivityType, React.ReactNode> = {
  thinking: <Brain className="w-4 h-4 text-purple-400" />,
  reading_file: <FileText className="w-4 h-4 text-blue-400" />,
  writing_file: <Edit3 className="w-4 h-4 text-green-400" />,
  editing_file: <Edit3 className="w-4 h-4 text-yellow-400" />,
  listing_dir: <FolderOpen className="w-4 h-4 text-cyan-400" />,
  running_command: <Terminal className="w-4 h-4 text-orange-400" />,
  fetching_url: <Globe className="w-4 h-4 text-pink-400" />,
  searching: <Search className="w-4 h-4 text-indigo-400" />,
  idle: <Clock className="w-4 h-4 text-gray-400" />,
  completed: <CheckCircle className="w-4 h-4 text-green-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
};

const activityLabels: Record<ActivityType, string> = {
  thinking: '思考中',
  reading_file: '读取文件',
  writing_file: '写入文件',
  editing_file: '编辑文件',
  listing_dir: '浏览目录',
  running_command: '执行命令',
  fetching_url: '获取网页',
  searching: '搜索知识库',
  idle: '空闲',
  completed: '完成',
  error: '错误',
};

export function AgentActivity({ activities, isThinking, thinkingDuration = 0 }: AgentActivityProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // 更新思考时间
  useEffect(() => {
    if (!isThinking) {
      setElapsedTime(0);
      return;
    }

    const startTime = Date.now() - thinkingDuration * 1000;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 100);

    return () => clearInterval(interval);
  }, [isThinking, thinkingDuration]);

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}分${secs}秒`;
  };

  // 获取当前活动
  const currentActivity = activities.find(a => a.status === 'running');
  const recentActivities = activities.slice(-5).reverse();

  return (
    <div className="space-y-2">
      {/* 当前状态 */}
      {isThinking && (
        <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
            <span className="text-purple-300 text-sm font-medium">
              {currentActivity ? activityLabels[currentActivity.type] : 'Agent 思考中'}
            </span>
            <span className="text-purple-400/70 text-xs ml-auto">
              {formatDuration(elapsedTime)}
            </span>
          </div>
          {currentActivity?.detail && (
            <p className="text-purple-300/70 text-xs mt-1 truncate">
              {currentActivity.detail}
            </p>
          )}
        </div>
      )}

      {/* 活动历史 */}
      {recentActivities.length > 0 && (
        <div className="space-y-1">
          {recentActivities.map((activity) => (
            <div 
              key={activity.id}
              className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
                activity.status === 'completed' 
                  ? 'text-gray-400' 
                  : activity.status === 'error' 
                    ? 'text-red-400' 
                    : 'text-gray-300'
              }`}
            >
              {activity.status === 'running' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                activityIcons[activity.type]
              )}
              <span className="truncate flex-1">{activity.description}</span>
              {activity.endTime && (
                <span className="text-gray-500">
                  {formatDuration(Math.floor((activity.endTime.getTime() - activity.startTime.getTime()) / 1000))}
                </span>
              )}
              {activity.status === 'completed' && (
                <CheckCircle className="w-3 h-3 text-green-500" />
              )}
              {activity.status === 'error' && (
                <XCircle className="w-3 h-3 text-red-500" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 创建活动管理器 Hook
export function useAgentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStart, setThinkingStart] = useState<Date | null>(null);

  const startThinking = () => {
    setIsThinking(true);
    setThinkingStart(new Date());
  };

  const stopThinking = () => {
    setIsThinking(false);
    setThinkingStart(null);
  };

  const addActivity = (type: ActivityType, description: string, detail?: string): string => {
    const id = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const activity: Activity = {
      id,
      type,
      description,
      detail,
      status: 'running',
      startTime: new Date(),
    };
    setActivities(prev => [...prev, activity]);
    return id;
  };

  const completeActivity = (id: string, success: boolean = true) => {
    setActivities(prev => prev.map(a => 
      a.id === id 
        ? { ...a, status: success ? 'completed' : 'error', endTime: new Date() }
        : a
    ));
  };

  const clearActivities = () => {
    setActivities([]);
  };

  const thinkingDuration = thinkingStart 
    ? Math.floor((Date.now() - thinkingStart.getTime()) / 1000) 
    : 0;

  return {
    activities,
    isThinking,
    thinkingDuration,
    startThinking,
    stopThinking,
    addActivity,
    completeActivity,
    clearActivities,
  };
}

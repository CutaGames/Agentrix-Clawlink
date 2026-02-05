"use client";

import React from 'react';
import { StrategicGoal, initialStrategicPlan } from '@/lib/strategic-plan';

const priorityColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

const categoryIcons = {
  revenue: '💰',
  growth: '📈',
  product: '🚀',
  operations: '⚙️',
};

const statusColors = {
  pending: 'bg-gray-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  blocked: 'bg-red-500',
};

interface StrategicPlanBoardProps {
  goals?: StrategicGoal[];
  compact?: boolean;
}

export function StrategicPlanBoard({ goals = initialStrategicPlan, compact = false }: StrategicPlanBoardProps) {
  // Calculate overall progress
  const overallProgress = Math.round(
    goals.reduce((acc, goal) => {
      const goalProgress = goal.milestones.reduce((m, ms) => m + ms.progress, 0) / goal.milestones.length;
      return acc + goalProgress;
    }, 0) / goals.length
  );

  if (compact) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white">📋 战略计划</h3>
          <span className="text-sm text-gray-400">总进度: {overallProgress}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="space-y-2">
          {goals.map(goal => (
            <div key={goal.id} className="flex items-center gap-2">
              <span>{categoryIcons[goal.category]}</span>
              <span className="text-sm text-gray-300 flex-1 truncate">{goal.title}</span>
              <span className={`w-2 h-2 rounded-full ${priorityColors[goal.priority]}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">📋 战略计划总览</h2>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-400">{overallProgress}%</div>
            <div className="text-xs text-gray-500">总体进度</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-3 mb-6">
        <div 
          className="bg-gradient-to-r from-blue-500 to-cyan-400 h-3 rounded-full transition-all duration-500" 
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {goals.map(goal => {
          const goalProgress = Math.round(
            goal.milestones.reduce((m, ms) => m + ms.progress, 0) / goal.milestones.length
          );
          
          return (
            <div key={goal.id} className="bg-gray-800 rounded-lg p-4 border border-gray-600">
              {/* Goal Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{categoryIcons[goal.category]}</span>
                  <div>
                    <h3 className="font-semibold text-white">{goal.title}</h3>
                    <p className="text-xs text-gray-400">{goal.description}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs text-white ${priorityColors[goal.priority]}`}>
                  {goal.priority}
                </span>
              </div>

              {/* Goal Progress */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>进度</span>
                  <span>{goalProgress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${goalProgress}%` }}
                  />
                </div>
              </div>

              {/* Milestones */}
              <div className="space-y-2 mb-3">
                {goal.milestones.map(ms => (
                  <div key={ms.id} className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full ${statusColors[ms.status]}`} />
                    <span className="text-gray-300 flex-1 truncate">{ms.title}</span>
                    <span className="text-gray-500 text-xs">{ms.progress}%</span>
                  </div>
                ))}
              </div>

              {/* KPIs */}
              <div className="border-t border-gray-700 pt-3">
                <div className="text-xs text-gray-500 mb-2">关键指标</div>
                <div className="grid grid-cols-2 gap-2">
                  {goal.kpis.map(kpi => (
                    <div key={kpi.id} className="text-center">
                      <div className="text-lg font-bold text-white">
                        {kpi.current}
                        <span className="text-xs text-gray-500">/{kpi.target}</span>
                      </div>
                      <div className="text-xs text-gray-400">{kpi.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

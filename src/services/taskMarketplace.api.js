// 任务集市 API — 对接后端 /merchant-tasks/marketplace/*
import { apiFetch } from './api';
// ========== 任务类型配置 ==========
export const TASK_TYPE_CONFIG = {
    development: { label: 'Dev', icon: '💻', color: '#3B82F6' },
    design: { label: 'Design', icon: '🎨', color: '#8B5CF6' },
    content: { label: 'Content', icon: '✍️', color: '#F59E0B' },
    consultation: { label: 'Consult', icon: '💡', color: '#10B981' },
    custom_service: { label: 'Custom', icon: '⚙️', color: '#EC4899' },
    other: { label: 'Other', icon: '📦', color: '#6B7280' },
};
export const TASK_STATUS_CONFIG = {
    pending: { label: 'Open', color: '#3B82F6' },
    accepted: { label: 'Accepted', color: '#8B5CF6' },
    in_progress: { label: 'In Progress', color: '#F59E0B' },
    delivered: { label: 'Delivered', color: '#06B6D4' },
    completed: { label: 'Completed', color: '#10B981' },
    cancelled: { label: 'Cancelled', color: '#6B7280' },
    disputed: { label: 'Disputed', color: '#EF4444' },
};
// ========== API 方法 ==========
export const taskMarketplaceApi = {
    // 搜索公开任务
    async searchTasks(params = {}) {
        const query = new URLSearchParams();
        if (params.query)
            query.set('query', params.query);
        if (params.type?.length)
            params.type.forEach(t => query.append('type', t));
        if (params.budgetMin !== undefined)
            query.set('budgetMin', String(params.budgetMin));
        if (params.budgetMax !== undefined)
            query.set('budgetMax', String(params.budgetMax));
        if (params.tags?.length)
            params.tags.forEach(t => query.append('tags', t));
        if (params.status)
            query.set('status', params.status);
        if (params.page)
            query.set('page', String(params.page));
        if (params.limit)
            query.set('limit', String(params.limit));
        if (params.sortBy)
            query.set('sortBy', params.sortBy);
        if (params.sortOrder)
            query.set('sortOrder', params.sortOrder);
        return apiFetch(`/merchant-tasks/marketplace/search?${query.toString()}`);
    },
    // 获取任务详情
    async getTaskDetail(taskId) {
        return apiFetch(`/merchant-tasks/marketplace/tasks/${taskId}`);
    },
    // 发布任务
    async publishTask(dto) {
        return apiFetch('/merchant-tasks/marketplace/publish', {
            method: 'POST',
            body: JSON.stringify(dto),
        });
    },
    // 提交竞标
    async submitBid(taskId, dto) {
        return apiFetch(`/merchant-tasks/marketplace/tasks/${taskId}/bid`, {
            method: 'POST',
            body: JSON.stringify(dto),
        });
    },
    // 获取任务的所有竞标（任务发布者）
    async getTaskBids(taskId) {
        return apiFetch(`/merchant-tasks/marketplace/tasks/${taskId}/bids`);
    },
    // 接受竞标
    async acceptBid(taskId, bidId) {
        return apiFetch(`/merchant-tasks/marketplace/tasks/${taskId}/bids/${bidId}/accept`, {
            method: 'PUT',
        });
    },
    // 拒绝竞标
    async rejectBid(taskId, bidId) {
        return apiFetch(`/merchant-tasks/marketplace/tasks/${taskId}/bids/${bidId}/reject`, {
            method: 'PUT',
        });
    },
    // 获取我的竞标列表
    async getMyBids(status) {
        const query = status ? `?status=${status}` : '';
        return apiFetch(`/merchant-tasks/marketplace/my-bids${query}`);
    },
    // 获取我发布的任务
    async getMyTasks(status) {
        return apiFetch(`/merchant-tasks/marketplace/my-tasks${status ? `?status=${status}` : ''}`);
    },
};

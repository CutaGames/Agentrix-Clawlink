import { apiFetch } from './api';
export const commerceApi = {
    getSplitPlans: () => apiFetch('/commerce/split-plans'),
    createSplitPlan: (body) => apiFetch('/commerce/split-plans', {
        method: 'POST',
        body: JSON.stringify(body),
    }),
    previewAllocation: (body) => apiFetch('/commerce/split-plans/preview', {
        method: 'POST',
        body: JSON.stringify(body),
    }),
    getBudgetPools: () => apiFetch('/commerce/budget-pools'),
    createBudgetPool: (body) => apiFetch('/commerce/budget-pools', {
        method: 'POST',
        body: JSON.stringify(body),
    }),
    getSettlements: () => apiFetch('/commerce/settlements'),
};

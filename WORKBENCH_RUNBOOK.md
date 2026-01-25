# Agentrix Workbench Runbook

This document describes how to start the Agent Workbench, run integration tests, and verify the three core user paths (User, Merchant, Developer).

## 1. System Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL (running and configured)
- Redis (optional, for some features)

### Backend Setup
```bash
cd backend
npm install
npm run build
npm run start:dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The workbench will be available at `http://localhost:3000/agent-enhanced`.

## 2. Running Integration Tests

We use Playwright for end-to-end integration testing of the workbench paths.

### Install Test Dependencies
```bash
npm install
npx playwright install
```

### Run Workbench Path Tests
```bash
npm run test:e2e tests/e2e/workbench-paths.spec.ts
```

## 3. Manual Verification Steps

### Path A: User (Personal)
1. Navigate to `http://localhost:3000/agent-enhanced`.
2. Ensure "Personal" mode is active.
3. Go to **User Center** -> **Auth Guide**.
4. Click **立即开始** on the first step "选择 Agent/Skill".
5. **Verify**: The view switches to the **Marketplace**.

### Path B: Merchant
1. Switch to **Merchant** mode.
2. If not registered, complete the registration form.
3. Once in the **Merchant Backend**, go to **Checklist**.
4. Click **立即处理** on "上传/导入 Catalog".
5. **Verify**: The view switches to the **Products** tab.

### Path C: Developer
1. Switch to **Developer** mode.
2. If not registered, complete the registration.
3. Once in **Developer Tools**, go to **Skill Lifecycle**.
4. Click **启动** on "创建 Skill (commerce-min)".
5. **Verify**: The view switches to the **Skill Registry** tab.

## 4. Troubleshooting
- **"Switching view..." stuck**: Check if the view is correctly mapped in `UnifiedWorkspace.tsx`.
- **Role not updating**: Ensure `localStorage` is cleared or refresh the page. The fix includes a `window.location.reload()` after registration to ensure state synchronization.

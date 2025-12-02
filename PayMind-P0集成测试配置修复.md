# PayMind P0集成测试配置修复

**修复日期**: 2025-01-XX  
**问题**: Jest配置冲突  
**状态**: ✅ **已修复**

---

## 🐛 问题描述

运行 `npm run test:integration` 时出现错误：
```
● Multiple configurations found:
  * /path/to/backend/jest.config.js
  * `jest` key in /path/to/backend/package.json

Implicit config resolution does not allow multiple configuration files.
```

---

## ✅ 解决方案

### 1. 删除重复的配置文件
- ✅ 删除了 `backend/jest.config.js`
- ✅ 保留 `package.json` 中的 `jest` 配置

### 2. 完善 package.json 中的 Jest 配置
在 `package.json` 的 `jest` 配置中添加了：
- ✅ `testTimeout: 30000` - 测试超时时间
- ✅ `moduleNameMapper` - 模块路径映射
- ✅ 完善了 `collectCoverageFrom` - 排除测试文件和node_modules

---

## 📝 最终配置

```json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s",
      "!**/*.spec.ts",
      "!**/node_modules/**",
      "!**/dist/**"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node",
    "testTimeout": 30000,
    "moduleNameMapper": {
      "^src/(.*)$": "<rootDir>/$1"
    }
  }
}
```

---

## 🚀 现在可以运行测试

```bash
cd backend
npm run test:integration
```

---

## ✅ 修复完成

- ✅ 配置冲突已解决
- ✅ Jest配置已完善
- ✅ 可以正常运行测试

---

**修复日期**: 2025-01-XX


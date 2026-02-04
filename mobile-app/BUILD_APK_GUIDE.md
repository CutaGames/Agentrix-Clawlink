# Agentrix Mobile App APK 构建指南

## 📱 快速开始

### 方法 1: 使用 Expo Go 测试（推荐）

1. 在手机上安装 **Expo Go** 应用
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. 启动开发服务器:
   ```bash
   cd mobile-app
   ./start-expo.sh
   # 或者直接运行:
   npx expo start --offline
   ```

3. 扫描终端中显示的 QR 码即可在手机上预览应用

### 方法 2: 使用 EAS Build 构建 APK（需要 Expo 账号）

1. **登录 Expo 账号**:
   ```bash
   npx eas login
   ```

2. **构建预览版 APK**:
   ```bash
   npx eas build --platform android --profile preview
   ```

3. 构建完成后，会生成一个下载链接，可以直接下载 APK 安装到手机

### 方法 3: 本地构建 APK（需要 Android SDK）

1. **预备工作**:
   ```bash
   # 安装 Android SDK (如果没有)
   sudo apt install android-sdk
   
   # 或者设置 ANDROID_HOME 环境变量
   export ANDROID_HOME=$HOME/Android/Sdk
   ```

2. **生成原生项目**:
   ```bash
   npx expo prebuild --platform android
   ```

3. **构建 APK**:
   ```bash
   cd android
   ./gradlew assembleRelease
   # APK 位置: android/app/build/outputs/apk/release/app-release.apk
   ```

## ⚙️ 构建配置

### eas.json 配置说明

```json
{
  "build": {
    "preview": {
      "distribution": "internal",  // 内部分发
      "android": {
        "buildType": "apk"         // 生成 APK 而非 AAB
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"  // Google Play 使用 AAB
      }
    }
  }
}
```

## 🔧 常见问题

### WSL 代理问题
如果遇到代理错误，请运行:
```bash
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY
```

### 端口占用
```bash
# 查找占用端口的进程
lsof -i :8081
# 终止进程
kill -9 <PID>
```

### 网络问题
使用 `--offline` 模式:
```bash
npx expo start --offline
```

## 📦 依赖版本

- Expo SDK: 52
- React Native: 0.77
- Node.js: 22+

## 🚀 下一步

1. 注册 [Expo 账号](https://expo.dev/signup)
2. 配置签名密钥（生产环境）
3. 集成 CI/CD 自动构建

## 📞 支持

如有问题，请参考 [Expo 官方文档](https://docs.expo.dev/)

# 🔐 安全配置指南

本文档说明如何安全地配置应用的敏感信息，确保在提交代码到Git仓库时不会泄露重要数据。

## 📋 快速开始

### 1. 复制模板文件

```bash
# 复制环境变量模板
cp .env.example .env

# 复制应用配置模板
cp app.json.example app.json
```

### 2. 配置环境变量

编辑 `.env` 文件，填入您的实际配置：

```bash
# Supabase 配置
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# 可选：应用配置
APP_NAME=您的应用名称
APP_SLUG=您的应用标识
IOS_BUNDLE_ID=com.yourcompany.appname
ANDROID_PACKAGE=com.yourcompany.appname
EAS_PROJECT_ID=your-eas-project-id
```

### 3. 配置 app.json

编辑 `app.json` 文件，替换以下占位符：

```json
{
  "expo": {
    "name": "您的应用名称",
    "slug": "您的应用标识",
    "ios": {
      "bundleIdentifier": "com.yourcompany.appname"
    },
    "android": {
      "package": "com.yourcompany.appname"
    },
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

## 🔒 安全最佳实践

### 1. 永远不要提交的文件

以下文件已经添加到 `.gitignore`，不会被提交到Git仓库：

- `.env` - 包含敏感的环境变量
- `app.config.js` / `app.config.ts` - 动态配置文件
- `*.apk`, `*.ipa`, `*.aab` - 构建产物
- `.vscode/`, `.idea/` - IDE配置文件

### 2. 使用环境变量

推荐使用环境变量来管理敏感信息：

```typescript
// app.config.ts 示例
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: process.env.APP_NAME || '默认应用名称',
  ios: {
    ...config.ios,
    bundleIdentifier: process.env.IOS_BUNDLE_ID || 'com.default.app',
  },
});
```

### 3. 模板文件说明

#### `.env.example`
包含所有需要的环境变量模板，复制为 `.env` 后填入实际值。

#### `app.json.example`
包含应用配置的模板，复制为 `app.json` 后填入实际值。

#### `app.config.ts`（可选）
动态配置文件，可以从环境变量读取配置，避免硬编码敏感信息。

## 🚀 高级配置

### 使用 app.config.ts

如果您希望更灵活的配置管理，可以使用 `app.config.ts`：

```typescript
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: process.env.APP_NAME || '遥遥的成长记',
  slug: process.env.APP_SLUG || 'babylog',
  version: process.env.APP_VERSION || '1.0.0',
  ios: {
    ...config.ios,
    bundleIdentifier: process.env.IOS_BUNDLE_ID || 'com.jinhonglee.babylog',
  },
  android: {
    ...config.android,
    package: process.env.ANDROID_PACKAGE || 'com.jinhonglee.babylog',
  },
  extra: {
    ...config.extra,
    eas: {
      ...config.extra?.eas,
      projectId: process.env.EAS_PROJECT_ID || 'your-eas-project-id',
    },
    // 可以添加自定义配置
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});
```

### 多环境配置

您可以为不同环境创建不同的配置文件：

```bash
# 开发环境
.env.development

# 生产环境
.env.production

# 预览环境
.env.preview
```

## ⚠️ 注意事项

1. **不要**将 `.env` 文件分享给他人
2. **不要**在代码中硬编码敏感信息
3. **定期**轮换API密钥和敏感数据
4. **使用**强密码和安全的密钥管理方案
5. **考虑**使用专业的密钥管理服务（如AWS Secrets Manager、Azure Key Vault等）

## 🔧 故障排除

### 环境变量未生效

确保：
- 文件名为 `.env`（不是 `.env.local` 或其他）
- 变量名以 `EXPO_PUBLIC_` 开头（Expo要求）
- 重启开发服务器

### 构建失败

检查：
- `app.json` 中的占位符是否已替换
- 环境变量是否正确设置
- EAS项目ID是否正确配置

## 📚 相关链接

- [Expo 环境变量文档](https://docs.expo.dev/guides/environment-variables/)
- [EAS 构建配置](https://docs.expo.dev/build/introduction/)
- [React Native 安全配置最佳实践](https://reactnative.dev/docs/security)

## 🤝 贡献

如果您发现了安全问题或有改进建议，请通过以下方式联系我们：
- 创建 GitHub Issue
- 发送邮件到：leejinhog611@gmail.com

感谢您帮助提升项目的安全性！
# 🍼 宝宝喂养追踪器 (Baby Feeding Tracker)

一个功能完整的跨平台宝宝护理追踪应用，专为新手父母设计。支持喂养、尿布、睡眠记录，提供详细的数据分析和可视化图表，帮助父母更好地了解宝宝的成长规律。

## ✨ 核心功能

### 🍼 喂养管理
- **多种喂养方式**：支持母乳喂养、奶瓶喂养、双侧计时
- **智能计时器**：精确记录喂养时长，支持暂停和恢复
- **左右侧统计**：分别记录母乳左右侧喂养时间
- **奶量记录**：奶瓶喂养时记录精确奶量（毫升）
- **喂养历史**：查看详细的喂养记录和时间分布

### 🚼 尿布追踪
- **快速记录**：一键记录尿布更换
- **类型分类**：尿湿、便便、两者都有
- **更换频率**：分析尿布更换规律
- **历史查询**：按时间查看尿布记录

### 😴 睡眠监测
- **睡眠计时**：记录入睡和醒来时间
- **持续时长**：自动计算睡眠时长
- **当前状态**：支持记录正在进行的睡眠
- **睡眠质量**：分析睡眠模式和趋势

### 📊 数据分析
- **可视化图表**：使用 Victory Native 展示数据趋势
- **统计分析**：喂养、尿布、睡眠数据统计
- **时间分布**：查看24小时内各项活动分布
- **趋势分析**：了解宝宝成长规律
- **数据导出**：支持数据导出功能

### 👶 宝宝管理
- **多宝宝支持**：一个家庭可管理多个宝宝
- **宝宝档案**：记录宝宝基本信息
- **家庭共享**：家庭成员共同记录和查看
- **权限管理**：不同成员的操作权限

### 🔐 用户系统
- **用户认证**：完整的注册登录系统
- **密码重置**：支持忘记密码功能
- **个人资料**：用户个人信息管理
- **家庭管理**：创建和管理家庭组

### 📱 用户体验
- **响应式设计**：适配各种屏幕尺寸
- **骨架屏加载**：优雅的加载体验
- **离线支持**：本地数据缓存
- **多语言支持**：中文界面
- **深色模式**：支持深色主题

## 🛠️ 技术架构

### 前端技术
- **React Native + Expo**：跨平台移动应用开发
- **React Navigation**：底部标签导航和栈导航
- **Victory Native**：数据可视化图表库
- **React Hooks + Context**：状态管理
- **TypeScript**：类型安全的JavaScript
- **Expo CLI**：开发构建工具

### 后端服务
- **Supabase**：开源Firebase替代方案
- **PostgreSQL**：关系型数据库
- **Row Level Security**：行级安全策略
- **Real-time Subscriptions**：实时数据同步
- **Authentication**：用户认证服务

### 开发工具
- **ESLint**：代码质量检查
- **Prettier**：代码格式化
- **Expo Dev Client**：开发客户端
- **React Native Debugger**：调试工具

## 📱 支持的设备

- iOS 设备 (iPhone, iPad)
- Android 设备
- Web 浏览器

## 🚀 快速开始

### 前置要求

- Node.js (推荐 v16 或更高版本)
- npm 或 yarn 包管理器
- Expo CLI

### 1. 安装依赖

```bash
# 克隆项目
git clone <your-repo-url>
cd BabyFeedingTracker

# 安装依赖
npm install

# 安装 Expo CLI (如果尚未安装)
npm install -g expo-cli
```

### 2. 配置 Supabase

1. 访问 [Supabase](https://supabase.com) 创建免费账户
2. 创建新项目并获取 API 密钥
3. 在项目根目录创建 `.env` 文件：

```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. 在 Supabase SQL Editor 中执行 `supabase_schema.sql` 创建数据库表

### 3. 运行应用

```bash
# 启动开发服务器
npm start

# 在 iOS 模拟器运行
npm run ios

# 在 Android 模拟器运行
npm run android

# 在 Web 浏览器运行
npm run web
```

## 📁 项目结构

```
BabyFeedingTracker/
├── src/
│   ├── components/          # 可复用UI组件
│   │   ├── BabySelector.tsx      # 宝宝选择器
│   │   ├── NumberPicker.tsx      # 数字选择器
│   │   ├── SideSelector.tsx      # 左右侧选择器
│   │   ├── SwipeableRow.tsx      # 滑动删除组件
│   │   ├── Timer.tsx             # 计时器组件
│   │   └── SkeletonLoader.tsx    # 骨架屏组件
│   ├── navigation/          # 导航配置
│   │   └── AppNavigator.tsx      # 主导航器
│   ├── screens/            # 页面组件
│   │   ├── HomeScreen.tsx        # 主页面
│   │   ├── TimerScreen.tsx       # 喂养计时器
│   │   ├── BottleFeedingScreen.tsx # 奶瓶喂养
│   │   ├── DiaperScreen.tsx      # 尿布记录
│   │   ├── SleepScreen.tsx       # 睡眠记录
│   │   ├── HistoryScreen.tsx     # 历史记录
│   │   ├── AnalyticsScreen.tsx   # 数据分析
│   │   ├── BabyManagementScreen.tsx # 宝宝管理
│   │   ├── LoginScreen.tsx       # 登录页面
│   │   ├── RegisterScreen.tsx    # 注册页面
│   │   └── ProfileScreen.tsx     # 个人资料
│   ├── services/           # API服务
│   │   ├── supabaseService.ts    # Supabase服务
│   │   └── databaseService.ts    # 数据库操作
│   ├── types/              # TypeScript类型定义
│   │   └── index.ts        # 所有类型定义
│   ├── utils/              # 工具函数
│   │   └── timeFormat.ts   # 时间格式化工具
│   └── config/             # 配置文件
│       └── supabase.ts     # Supabase配置
├── assets/                  # 静态资源
│   ├── fonts/              # 字体文件
│   └── images/             # 图片资源
├── database/               # 数据库相关
│   ├── supabase_schema.sql # 数据库架构
│   └── fix-database-schema.sql # 数据库修复脚本
└── docs/                   # 文档
    └── SUPABASE_SETUP_GUIDE.md # Supabase设置指南
```

## 🔧 核心功能详解

### 智能喂养系统
- **双侧计时**：支持左右侧独立计时，精确记录每侧喂养时间
- **自动计算**：智能计算总喂养时长和平均时长
- **喂养类型**：自动区分母乳亲喂、母乳瓶喂、配方奶瓶喂
- **奶量统计**：详细记录每次瓶喂的奶量数据
- **喂养提醒**：基于历史数据提供喂养建议

### 全面尿布管理
- **快速记录**：3秒完成尿布更换记录
- **类型细分**：精确区分尿湿、便便、混合情况
- **更换频率**：智能分析尿布更换规律
- **健康监测**：通过尿布数据监测宝宝健康状况

### 专业睡眠追踪
- **睡眠计时**：精确记录入睡和醒来时间
- **持续监测**：支持记录正在进行的睡眠
- **质量分析**：分析睡眠时长、频率和质量
- **作息规律**：帮助建立良好的睡眠习惯

### 深度数据分析
- **趋势图表**：30天数据趋势可视化展示
- **统计报表**：详细的日、周、月度统计
- **对比分析**：不同时间段数据对比
- **成长曲线**：追踪宝宝成长关键指标
- **数据导出**：支持CSV格式数据导出

### 家庭协作功能
- **多宝宝管理**：一个家庭可管理多个宝宝
- **成员邀请**：邀请家庭成员共同记录
- **权限控制**：管理员、普通成员权限区分
- **实时同步**：多设备间数据实时同步
- **数据共享**：家庭成员共享查看所有数据

### 用户体验优化
- **骨架屏加载**：优雅的加载动画体验
- **响应式布局**：完美适配各种屏幕尺寸
- **手势操作**：滑动删除、长按编辑等便捷操作
- **离线缓存**：网络不佳时也能正常使用
- **数据安全**：银行级数据加密保护

## 🚀 部署

### Web 部署

```bash
# 构建 Web 版本
expo build:web

# 输出目录：web-build/
```

### 移动应用部署

```bash
# 构建 APK (Android)
expo build:android

# 构建 IPA (iOS)
expo build:ios
```

## 📝 开发指南

### 添加新功能

1. **创建新页面**：在 `src/screens/` 添加新组件
2. **配置导航**：更新 `src/navigation/AppNavigator.tsx`
3. **添加数据模型**：更新 `src/types/` 和数据库架构
4. **实现服务**：在 `src/services/supabaseService.ts` 添加 API 方法

### 数据库修改

1. 更新 `supabase_schema.sql` 文件
2. 在 Supabase 控制台执行修改
3. 更新 `src/services/supabaseService.ts` 中的类型定义

## 🔍 故障排除

### 常见问题解决方案

#### 数据库连接问题
**症状**：应用无法连接到数据库
**解决**：
- 检查 `.env` 文件中的 Supabase URL 和密钥
- 确认网络连接正常，防火墙未阻止连接
- 验证 Supabase 项目状态是否活跃
- 执行 `fix-database-schema.sql` 修复数据库结构

#### 数据加载失败
**症状**：页面显示空白或加载动画一直转圈
**解决**：
- 检查数据库中是否存在测试数据
- 验证时间筛选条件是否过于严格
- 查看浏览器/设备控制台错误日志
- 确认用户权限和家庭组设置正确

#### 构建和运行错误
**症状**：应用无法启动或构建失败
**解决**：
- 清除 Expo 缓存：`expo start -c`
- 删除 `node_modules` 和 `package-lock.json` 重新安装
- 检查 Node.js 版本是否符合要求（v16+）
- 验证所有依赖版本兼容性

#### 移动端兼容性问题
**症状**：在某些设备上UI显示异常
**解决**：
- 使用 React Native 的 Platform API 做平台适配
- 测试不同屏幕尺寸和分辨率
- 检查字体和图标在不同平台的显示效果
- 使用 SafeAreaView 处理全面屏设备

### 性能优化建议

#### 数据查询优化
- 使用数据库索引提高查询速度
- 实现分页加载避免一次加载过多数据
- 使用 React.memo 和 useMemo 优化组件重渲染
- 合理使用 useEffect 依赖数组

#### 内存使用优化
- 及时清理定时器和事件监听
- 使用 FlatList 替代 ScrollView 展示长列表
- 优化图片资源大小和格式
- 实现组件懒加载机制

## 🤝 贡献指南

我们欢迎所有形式的贡献，包括代码、文档、测试和反馈！

### 如何贡献

1. **Fork 项目**到您的GitHub账户
2. **创建功能分支**：`git checkout -b feature/amazing-feature`
3. **编写代码**：遵循现有代码风格和规范
4. **添加测试**：为新功能编写测试用例
5. **提交更改**：`git commit -m 'Add some amazing feature'`
6. **推送到分支**：`git push origin feature/amazing-feature`
7. **创建 Pull Request**：描述您的更改和动机

### 开发规范

- **代码风格**：遵循项目现有的ESLint配置
- **提交信息**：使用清晰的提交信息，遵循约定式提交规范
- **代码注释**：为复杂逻辑添加详细注释
- **类型安全**：所有新代码必须使用TypeScript
- **性能考虑**：避免不必要的重渲染和内存泄漏

### 可以贡献的内容

- 🐛 **Bug修复**：发现并修复应用中的问题
- ✨ **新功能**：添加有价值的新功能
- 📚 **文档改进**：改进README、注释或添加教程
- 🎨 **UI/UX优化**：改进用户界面和体验
- 🧪 **测试覆盖**：添加单元测试和集成测试
- 🌍 **国际化**：添加多语言支持
- 📱 **平台适配**：优化特定平台的体验

### 报告问题

如果您发现了bug或有功能建议，请通过GitHub Issues报告：
- 使用清晰的标题和详细描述
- 提供复现步骤和环境信息
- 添加相关截图或错误日志

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢以下优秀的开源项目和技术社区，让这个项目成为可能：

### 核心技术
- **[Expo](https://expo.dev)** - 让React Native开发变得简单高效
- **[Supabase](https://supabase.com)** - 提供强大的开源后端服务
- **[React Native](https://reactnative.dev)** - 跨平台移动开发框架
- **[React Navigation](https://reactnavigation.org)** - 流畅的导航解决方案
- **[Victory Native](https://formidable.com/open-source/victory/)** - 美观的数据可视化

### 开发工具
- **[TypeScript](https://www.typescriptlang.org)** - 类型安全的JavaScript
- **[ESLint](https://eslint.org)** - 代码质量保证
- **[Prettier](https://prettier.io)** - 代码格式化工具

### 社区支持
感谢所有为开源社区贡献代码、文档和想法的开发者们。特别感谢那些回答Stack Overflow问题、编写技术博客和创建教学视频的开发者们。

### 特别鸣谢
- 项目灵感来源于新手父母的真实需求
- 感谢测试用户提供的宝贵反馈和建议
- 感谢家人和朋友们的支持和鼓励

## 📞 联系我们

如果您有任何问题、建议或想要合作，欢迎通过以下方式联系我们：

- **📧 邮箱**：leejinhog611@gmail.com
- **🐛 Issues**：通过GitHub Issues报告问题
- **⭐ Star**：给项目点个Star支持我们
- **🔄 Fork**：Fork项目并贡献您的代码

## 📈 项目统计

- **👨‍💻 技术栈**：React Native + TypeScript + Supabase
- **📱 平台**：iOS、Android、Web
- **🔧 功能模块**：7个主要功能模块
- **📊 数据可视化**：多维度数据分析和图表展示
- **👶 用户群体**：新手父母和家庭用户

## 🎯 未来规划

- **AI智能分析**：基于数据的智能育儿建议
- **成长里程碑**：记录宝宝重要成长节点
- **健康提醒**：疫苗接种和健康检查提醒
- **社区功能**：父母交流和经验分享
- **多语言支持**：支持更多语言版本
- **穿戴设备集成**：与智能手表和健康设备连接

---

**⭐ 如果这个项目对您有帮助，请给个Star支持我们！**

## 🏆 项目亮点

### 🌟 技术创新
- **跨平台开发**：一套代码同时支持iOS、Android和Web
- **实时数据同步**：基于Supabase的实时数据同步
- **类型安全**：全程TypeScript开发，编译时错误检查
- **现代化架构**：组件化、模块化设计，易于维护和扩展

### 🎯 用户价值
- **科学育儿**：基于数据的科学育儿指导
- **家庭协作**：支持多成员协作记录和查看
- **成长记录**：完整记录宝宝成长过程中的重要数据
- **趋势分析**：通过数据分析了解宝宝成长规律

### 💪 技术实力
- **企业级架构**：采用企业级开发标准和最佳实践
- **高性能优化**：骨架屏、懒加载、缓存优化等性能优化
- **安全可靠**：数据加密、权限控制、错误处理等安全保障
- **可扩展性**：模块化设计，支持功能扩展和定制开发

### 📊 数据驱动
- **可视化展示**：丰富的图表和数据分析功能
- **智能统计**：自动计算各项统计指标
- **趋势预测**：基于历史数据预测未来趋势
- **导出功能**：支持数据导出，方便进一步分析
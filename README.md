# 观测即意义（Shiyun Observer）

一个基于 React、Three.js 和 LLM 的交互式诗性观测实验。

你进入一片持续生成的“诗云”，通过 hover 阅读、通过双击确认喜欢。系统会记住你整轮会话中的选择，并在结束观测后生成一份面向“你”的意义洞察。

## 当前能力

- Three.js 宇宙场景：背景星场、星云、漂浮诗云节点
- 节点交互：hover 显示中央诗句，双击触发赋义反馈
- 双来源生成：LLM 生成 + 古典诗库回响
- 会话级偏好历史：喜欢过的诗句会累计保留到本轮结束
- 洞察页：左侧回看喜欢诗句，右侧流式输出意义洞察
- 古典诗库构建：缺少 `chinese-poetry` 时可自动 clone 并提取轻量诗句池

## 技术栈

- React 18
- Three.js
- Zustand
- TypeScript
- Vite

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发环境

```bash
npm run dev
```

默认访问：

```txt
http://localhost:5173
```

### 3. 配置 LLM

启动页支持：

- OpenAI
- Anthropic
- 自定义 `model`
- 自定义 `baseUrl`

说明：

- `API Key` 当前为必填
- 勾选“记住配置”后，配置会保存在浏览器 `localStorage`
- 不勾选时，本次会话结束后不会主动持久保存

### 4. 进入观测

当前正确交互方式是：

1. 移动鼠标，在场景中寻找诗云节点
2. 将鼠标 hover 到节点上，中央会显示对应诗句
3. 双击节点，确认“喜欢”并触发赋义反馈
4. 继续观测，系统会逐步根据你的累计选择偏移
5. 点击“结束观测”，进入意义洞察页

## 开发命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 本地预览
npm run preview

# ESLint
npm run lint

# Prettier
npm run format

# 从 chinese-poetry 构建轻量诗句池
npm run build:poetry
```

## 古典诗库构建

项目中的“诗库回响”来自 `chinese-poetry` 仓库。

运行：

```bash
npm run build:poetry
```

脚本会执行以下流程：

1. 检查项目根目录是否存在 `chinese-poetry`
2. 若不存在，自动执行：

```bash
git clone https://github.com/chinese-poetry/chinese-poetry
```

3. 从指定目录抽取合格古典短句
4. 生成前端使用的 `src/lib/generatedClassicalPoems.ts`

## 当前交互说明

### 观测页

- 顶部：观测状态、动态叙事文案、重置、结束观测
- 中上：`AI 漂移` 进度条
- 左下：`Meaning Field` 状态卡

`AI 漂移` 当前不是模型内部真实指标，而是一个 UI 层估算值，主要由两部分决定：

- 喜欢诗句的累计数量
- 喜欢诗句占总生成数的比例

### 诗云节点

- 节点会生成、漂浮、渐退并小爆炸退场
- 当前基础寿命较长，并带有 hover 阅读保护
- 如果你正在 hover 某句，它会延长退场时间，避免“没看完就消失”

### 意义洞察页

- 左栏：本轮喜欢过的全部诗句
- 右栏：流式生成的深度洞察
- 洞察会直接对“你”说话，而不是旁观式报告

## 项目结构

```txt
src/
├── components/
│   ├── WelcomePage.tsx
│   ├── GameScene.tsx
│   ├── GameUI.tsx
│   └── AnalysisPage.tsx
├── stores/
│   └── gameStore.ts
├── lib/
│   ├── llm.ts
│   ├── poemGenerator.ts
│   ├── presetContent.ts
│   ├── generatedClassicalPoems.ts
│   └── storage.ts
├── types/
│   └── game.ts
└── App.tsx

scripts/
└── build-classical-poems.mjs
```

## 设计原则

- 用户不是在“找最好的一句诗”，而是在通过选择暴露自己的意义过滤器
- 学习是偏移，不是理解
- 古典诗库是稳定底座，LLM 是扰动层
- 洞察必须回到你真正选过的诗句，而不是空泛结论

## 已知情况

- 当前仍是纯前端实现，没有后端持久化
- 打包时会有 chunk size warning，但不影响运行
- 洞察质量仍然依赖你使用的模型与接口稳定性

## 隐私说明

- 项目不会把你的行为历史上传到自建后端
- 你的数据只会发送到你配置的 LLM 服务
- 若勾选“记住配置”，API Key / model / baseUrl 会保存在浏览器本地

## License

MIT

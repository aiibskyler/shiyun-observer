# 观测即意义（Shiyun Observer）

## 详细设计文档（DDD v2.0 / Current Implementation）

---

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 项目名称 | 观测即意义（Shiyun Observer） |
| 当前形态 | 纯前端交互实验 |
| 技术栈 | React 18 + Three.js + Zustand + Vite + TypeScript |
| 文档版本 | v2.0 |
| 文档定位 | 基于当前代码实现的真实设计文档 |
| 目标读者 | 前端开发 / 产品 / 交互设计 / 后续维护者 |

---

## 2. 项目目标

当前项目已经落地为一个三段式体验：

1. 启动页：用户输入 LLM 配置，进入观测。
2. 观测页：Three.js 宇宙场景持续生成“诗云节点”，用户通过 hover 和双击参与赋义。
3. 洞察页：系统基于用户整轮选择历史，生成面向“你”的意义洞察，并展示本轮喜欢过的全部诗句。

当前版本的核心目标不是做一个通用推荐系统，也不是做一个传统诗歌生成器，而是做一个“用户通过选择训练系统，最后被系统反向照见”的交互实验。

---

## 3. 当前系统范围

### 3.1 已实现

- 启动配置页，支持选择 provider、输入 API Key、model、baseUrl
- 配置本地存储与自动回填
- WebGL 宇宙场景、星场、星云、诗云节点
- hover 展示中央诗句浮层
- 双击节点触发“赋义”反馈
- 诗句生成分流：LLM + 古典诗库回响
- 累计喜欢历史 `likedPoems`
- 基于用户历史选择的 LLM 提示词塑形
- 洞察页流式输出 + 喜欢诗句左栏回看
- 古典诗库自动提取脚本，缺失仓库时自动 `git clone`

### 3.2 当前未实现

- 真正的邻域传播/权重扩散算法
- 基于空间聚类的意义分布图可视化
- 导出报告 / 导出截图 / 导出 JSON
- 结束观测后的镜头拉远、宇宙冻结动画
- 后端持久化、多用户会话或服务端分析

---

## 4. 运行态结构

### 4.1 页面状态机

运行时实际使用的状态为：

```ts
type GameState = 'welcome' | 'playing' | 'analyzing'
```

说明：

- `welcome`：启动配置页
- `playing`：宇宙观测页
- `analyzing`：意义洞察页

虽然类型定义里仍保留了 `input`、`complete`，但当前主流程没有使用这两个状态。

### 4.2 主入口

运行时入口由 `src/App.tsx` 控制：

- `welcome` -> `WelcomePage`
- `playing` -> `GameScene` + `GameUI`
- `analyzing` -> `AnalysisPage`

---

## 5. 架构设计

### 5.1 总体分层

```txt
React Page / Overlay Layer
    ↓
Zustand State Layer
    ↓
Three.js Scene + Interaction Layer
    ↓
Text Generation Layer
    ├── classical poem preset pool
    └── LLM streaming generation
```

### 5.2 当前模块划分

| 模块 | 文件 | 责任 |
| --- | --- | --- |
| 启动页 | `src/components/WelcomePage.tsx` | 配置输入、localStorage 回填、启动观测 |
| 主场景 | `src/components/GameScene.tsx` | Three.js 宇宙、背景星场、诗云节点、hover / 双击 |
| 主 UI | `src/components/GameUI.tsx` | 顶部控制栏、漂移进度、底部状态卡 |
| 洞察页 | `src/components/AnalysisPage.tsx` | 流式洞察、左栏喜欢诗句、统计与重开 |
| 全局状态 | `src/stores/gameStore.ts` | 游戏状态、节点数组、累计喜欢历史、实时洞察 |
| 诗句生成 | `src/lib/poemGenerator.ts` | LLM / 诗库回响分流、文本清洗、生命周期初值 |
| 提示词 | `src/lib/llm.ts` | 诗句 prompt、洞察 prompt、流式请求 |
| 诗库回响 | `src/lib/presetContent.ts` | 从古典诗句池采样，并根据用户历史做共鸣筛选 |
| 古典诗库提取 | `scripts/build-classical-poems.mjs` | 自动拉取 `chinese-poetry` 并提取轻量前端诗句池 |
| 配置存储 | `src/lib/storage.ts` | 本地保存 / 读取 LLM 配置 |

---

## 6. 核心数据结构

### 6.1 诗云节点

当前运行态节点定义如下：

```ts
type GamePoemNode = {
  id: string
  text: string
  position: { x: number; y: number; z: number }
  lifecycle: 'spawning' | 'displaying' | 'fading' | 'dead'
  spawnTime: number
  fadeTime: number
  clicked: boolean
  hoverTime: number
  source: 'llm' | 'template'
  scale: number
  opacity: number
  color: { r: number; g: number; b: number }
}
```

说明：

- 当前没有 `weight` 字段，也没有独立邻域传播权重
- `clicked` 只表示这个节点自身是否被双击确认
- 用户真正的长期偏好来源不是场上节点，而是 store 里的 `likedPoems`

### 6.2 LLM 配置

```ts
type LLMConfig = {
  provider: 'openai' | 'anthropic' | 'custom'
  apiKey: string
  baseUrl?: string
  model?: string
}
```

### 6.3 全局状态

当前 store 的关键字段：

```ts
type GameStore = {
  gameState: GameState
  currentStep: number
  totalSteps: number
  llmConfig: LLMConfig | null
  poems: GamePoemNode[]
  maxPoems: number
  poemLifetime: number
  clickedPoemIds: string[]
  likedPoems: string[]
  hoverDurations: Map<string, number>
  insights: LiveInsight[]
  currentInsight: string
  startTime: number
  endTime: number
}
```

关键事实：

- `likedPoems` 是整轮会话的累计喜欢历史，不会因为节点消失而减少
- `currentStep` 是累计生成数，不等于当前场上节点数
- `currentInsight` 用于洞察页的流式展示

---

## 7. 启动页设计

### 7.1 当前交互

启动页提供：

- provider 选择：`openai` / `anthropic`
- API Key 输入
- 可选 model 输入
- 可选 baseUrl 输入
- “记住配置”复选框

### 7.2 存储策略

当前配置通过 `localStorage` 存储：

- 存储 key：`shiyun-observer-config`
- 启动页首次加载会自动回填
- 点击清除按钮可移除已保存配置

### 7.3 当前限制

当前实现中 `apiKey` 为必填项；即使后续想支持纯本地模式，当前代码路径仍然要求有可用的 LLM 配置才能开始。

---

## 8. Three.js 场景设计

### 8.1 当前场景结构

```txt
Scene
 ├── PerspectiveCamera
 ├── WebGLRenderer
 ├── OrbitControls
 ├── AmbientLight
 ├── HemisphereLight
 ├── PointLight x2
 ├── Background Star Fields x2
 ├── Nebula Meshes x2
 └── Poem Groups (dynamic)
```

### 8.2 视觉对象

#### 背景星场

- 使用自定义 `ShaderMaterial` + `THREE.Points`
- 不是静态点阵，而是拥有生命周期的背景星：
  - `appearing`
  - `visible`
  - `shooting`
- 支持从暗到明出现，再以“流星式”消失后重生

#### 诗云节点

每个节点是一个 `THREE.Group`，由三层组成：

- `core`：核心星体
- `aura`：外围光晕
- `ring`：交互回响环

节点支持：

- 缓慢漂浮
- hover 放大与发光
- double-click 脉冲反馈
- 到期小爆炸退场

### 8.3 相机与控制

- `PerspectiveCamera`
- `OrbitControls`
- 启用阻尼
- 禁止平移
- 自动缓慢旋转

---

## 9. 诗云生成与调度

### 9.1 生成调度

当前不是“一次生成一个然后等很久”，而是首屏铺场 + 持续补点：

- 首次进入场景：批量生成 `14` 个节点，其中 `12` 个强制走诗库回响
- 后续每 `1500ms` 检查一次密度
- 根据 `poems.length / maxPoems` 决定一次补 `1~4` 个节点

### 9.2 节点寿命

当前寿命参数：

- `displayDuration = 30000ms`
- `fading window = 3400ms`
- hover 中的节点如果快要退场，会自动续命至少 `5200ms`

也就是说，当前版本已经明确偏向“保证可读性”，而不是密集闪现。

### 9.3 生成来源

生成来源分两类：

| 来源 | 含义 |
| --- | --- |
| `llm` | 通过流式 LLM 请求生成 |
| `template` | 实际上是“诗库回响”，从提取后的古典诗句池中采样 |

---

## 10. 文本生成设计

### 10.1 总体策略

当前策略不是旧文档中的“随机 / 模板 / 偏好 token 权重”三分法，而是：

1. 先用古典诗库作为稳定底座
2. 在合适时机插入 LLM 生成
3. LLM 生成失败、超时或不够诗性时，自动回退到诗库回响

### 10.2 诗库回响

`src/lib/presetContent.ts` 当前只保留从 `chinese-poetry` 抽取的古典诗句：

- `generatedClassicalPoems.ts` 为前端轻量诗句池
- `getPresetPoem(clickedPoems)` 会先从用户历史选择中提取 2~3 字片段
- 若诗库中存在带这些片段的句子，则优先返回“共鸣句”
- 否则从整个古典诗句池随机采样

### 10.3 LLM 使用概率

当前策略参数：

- `PRESET_RATIO = 0.94`
- 每累计 `14` 次诗库输出，强制触发一次 LLM 机会
- 点击率越高，LLM 概率会有轻微提升
- 上限仍然被压制在较低水平，避免场景过于依赖接口速度

### 10.4 LLM 失败保护

当前有冷却机制：

- 若 LLM 请求失败，则进入 `30s` 冷却期
- 冷却期内优先使用诗库回响
- 这样可避免接口抖动导致观测页大量空白

### 10.5 诗句清洗

LLM 返回值会经过：

- 去除解释性前缀
- 去除编号 / 引号 / Markdown 代码块
- 取单行候选
- 通过 `isPoeticLine` 过滤非诗性文本

只有通过校验的内容才会进入场景。

---

## 11. 用户偏好与漂移

### 11.1 偏好记录

当前项目的偏好核心不在 `clickedPoemIds`，而在 `likedPoems`：

- 双击节点时，把诗句文本写入 `likedPoems`
- 节点消失后，偏好历史仍然保留
- 重新开始时才清空

### 11.2 LLM 偏好塑形

在生成新诗句时：

- `clickedPoems` 使用的是 `likedPoems`
- `step` 使用累计生成数 `currentStep`
- `clickRate = likedPoems.length / currentStep`

这意味着：

- 后续生成会受整轮历史影响
- 不会因为已喜欢节点在场景里消失，就丢失偏好

### 11.3 AI 漂移

当前 `AI 漂移` 不再表示“生成进度”，而是 UI 层的一个估算指标：

```txt
drift = 0.68 * likedCountFactor + 0.32 * likedRatioFactor
```

其中：

- `likedCountFactor = clickedCount / 12`
- `likedRatioFactor = clickedCount / totalGenerated`

这是一种叙事化指标，用来表达“系统正在被你塑形的程度”，不是严格机器学习指标。

---

## 12. 交互设计

### 12.1 Hover

流程：

```txt
mousemove
  -> raycaster intersectObjects(scene.children, true)
  -> 命中 poem group
  -> 中央浮层显示诗句
  -> 节点放大 / 发光 / 周边环增强
```

Hover 还承担“阅读保护”作用：

- 节点快到寿命末尾时，如果用户仍在 hover，则延长退场时间

### 12.2 双击

流程：

```txt
double click
  -> 命中 poem
  -> clickPoem(id)
  -> 写入 likedPoems
  -> 触发 ring pulse
  -> 节点颜色 / 发光增强
  -> 底部反馈文案瞬时变化
```

### 12.3 结束观测

点击 `结束观测` 后：

- store 状态切换为 `analyzing`
- `currentInsight` 会先被清空
- 进入分析页并重新发起新的流式洞察请求

---

## 13. UI 设计

### 13.1 观测页

当前观测页由 `GameScene + GameUI` 叠加构成。

#### 顶部区域

- 左侧：观测状态
- 中部：动态叙事文案
- 右侧：重置 / 结束观测

#### 中上区域

- `AI 漂移` 进度条

#### 左下区域

底部状态卡 `Meaning Field`：

- 已生成
- 已赋义
- AI 漂移
- 词汇来源：`LLM x n · 诗库回响 x n · 生成进度 x %`

### 13.2 洞察页

当前洞察页为双栏布局：

- 左栏：本轮喜欢过的全部诗句
- 右栏：流式洞察正文、统计卡片、重新开始按钮

移动端下采用自动堆叠，而不是强制左右并排。

---

## 14. 洞察生成设计

### 14.1 输入

当前洞察 prompt 使用：

- `likedPoems`
- `totalGenerated`
- `clickRate`
- `duration`

### 14.2 Prompt 策略

当前洞察 prompt 已经从“简单性格分析”升级为“审美与意义构建分析”：

- 直接对“你”说话
- 要求引用用户喜欢过的诗句作为证据
- 要分析预期结构、意外性、人生阶段与句子击中方式
- 结尾要求形成一次自然的认知转折

### 14.3 输出形态

当前输出不是结构化 JSON，而是：

- 约 4 段的连续中文分析
- 流式展示到 `currentInsight`
- 同页展示喜欢过的诗句，形成“选择证据 + AI 解读”的组合

---

## 15. 古典诗库构建

### 15.1 数据来源

诗库来源为项目根目录下的 `chinese-poetry` 仓库。

### 15.2 自动拉取

运行：

```bash
npm run build:poetry
```

时，脚本会：

1. 检查根目录是否存在 `chinese-poetry`
2. 若不存在，则自动执行：

```bash
git clone https://github.com/chinese-poetry/chinese-poetry
```

3. 扫描指定目录
4. 提取合格短句
5. 生成 `src/lib/generatedClassicalPoems.ts`

### 15.3 当前筛选规则

抽取规则包括：

- 仅保留中文诗句
- 去掉多余标点和括注
- 长度限制在 `4~20` 个字（去标点后）
- 过滤目录 / 序 / 凡例等弱内容
- 最终保留 `1800` 条轻量句子供前端使用

---

## 16. 非功能约束

### 16.1 当前性能特征

- Three 场景与 UI 同端运行，无后端依赖
- 采用批量补点而不是海量一次性渲染
- 背景星场使用 `Points + ShaderMaterial`
- 诗云节点使用多个 Mesh 组合，而不是 `InstancedMesh`

### 16.2 当前已知约束

- 打包主 chunk 仍偏大，构建会给出 chunk warning
- 洞察页完全依赖外部 LLM，可读性与稳定性受模型输出影响
- 当前没有真正的空间传播学习算法，更多是“提示词偏移 + UI 漂移表达”

---

## 17. 当前设计与旧方案差异

旧版 DDD 中以下内容已经不再适用：

- `InstancedMesh` 作为核心节点容器
- `weight` / `propagate()` 邻域传播
- `PreferenceProfile.tokens` 这种独立 token 学习结构
- “70% 随机 / 20% 模板 / 10% 偏好引导” 的分层生成
- 图表式报告页面

当前真实实现更接近：

- 宇宙式视觉交互
- 会话级喜欢历史
- 古典诗库回响作为大底座
- LLM 作为少量插入与最终洞察的智能层

---

## 18. 后续演进建议

按当前代码结构，最自然的后续方向是：

1. 补上结束观测时的镜头拉远与冻结动画
2. 把洞察输出升级成“核心结论 / 证据 / 反转”更稳定的结构
3. 将 `AI 漂移` 从 UI 估算值升级为更真实的生成偏移指标
4. 继续做代码拆包，解决主 chunk 偏大问题
5. 决定是否实现真正的空间传播/意义密度可视化

---

## 19. 关键设计原则

### 1. 用户不是在“评价诗句”，而是在暴露自己的意义过滤器

系统必须围绕选择行为，而不是围绕“好诗标准”运转。

### 2. 学习是偏移，不是理解

当前所有智能感都应该被解释为：
系统被用户持续塑形，而不是系统真正理解了用户。

### 3. 古典诗库是基底，LLM 是扰动层

这样才能兼顾：

- 场景稳定可读
- 风格不散
- 接口失败时仍可运行

### 4. 洞察必须有证据

最终分析不能只写抽象判断，必须回到用户喜欢过的诗句本身。


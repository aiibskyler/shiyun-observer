# 📄 观测即意义（Shiyun Observer）

## 详细设计文档（DDD v1.0）

---

# 1. 文档信息

| 项目   | 内容                                 |
| ---- | ---------------------------------- |
| 项目名称 | 观测即意义（Shiyun Observer） |
| 技术栈  | React + Three.js(WebGL) + Zustand  |
| 文档版本 | v1.0                               |
| 文档类型 | 详细设计（Detailed Design Document）     |
| 目标读者 | 前端开发 / 架构师 / 产品                    |

---

# 2. 系统概述

## 2.1 系统目标

构建一个基于 WebGL 的交互系统，实现：

* 无限文本空间生成（诗云模拟）
* 用户观察与行为采集（hover / 双击）
* 行为反馈影响生成分布（弱学习机制）
* 最终输出用户“意义构建分析报告”

---

## 2.2 核心特性

| 特性    | 描述         |
| ----- | ---------- |
| 无限生成  | 前端伪无限文本流   |
| 空间可视化 | 3D 宇宙节点    |
| 实时交互  | hover + 双击 |
| 意义传播  | 权重影响邻域     |
| 反馈学习  | 用户偏好影响生成   |
| 结果分析  | 行为建模与报告    |

---

# 3. 系统架构设计

---

## 3.1 总体架构

```txt
UI Layer (React)
    ↓
Interaction Layer (Event System)
    ↓
Rendering Layer (Three.js)
    ↓
State Layer (Zustand)
    ↓
Generation Layer (Local + API)
```

---

## 3.2 模块划分

| 模块   | 职责             |
| ---- | -------------- |
| UI模块 | 面板、提示、分析报告     |
| 渲染模块 | Three.js 场景    |
| 交互模块 | Raycast + 输入处理 |
| 状态模块 | 节点/用户行为管理      |
| 生成模块 | 文本生成           |
| 分析模块 | 用户行为分析         |

---

# 4. 核心数据结构设计

---

## 4.1 节点模型（PoemNode）

```ts
type PoemNode = {
  id: string
  text: string

  position: {
    x: number
    y: number
    z: number
  }

  weight: number        // 意义权重
  liked: boolean        // 是否被喜欢
  hover: boolean

  source: "random" | "template" | "llm"

  createdAt: number
}
```

---

## 4.2 用户行为模型

```ts
type UserAction = {
  nodeId: string
  action: "hover" | "like"
  timestamp: number
}
```

---

## 4.3 用户偏好模型

```ts
type PreferenceProfile = {
  tokens: Map<string, number>
  patterns: Map<string, number>
}
```

---

## 4.4 全局状态（Zustand）

```ts
type Store = {
  nodes: PoemNode[]
  selectedNodeId: string | null

  actions: UserAction[]
  preference: PreferenceProfile

  addNode: (node) => void
  updateNode: (id, patch) => void
  recordAction: (action) => void
}
```

---

# 5. 渲染系统设计（Three.js）

---

## 5.1 场景结构

```txt
Scene
 ├── Camera (Perspective)
 ├── Renderer (WebGLRenderer)
 ├── Controls (OrbitControls)
 ├── NodeGroup (InstancedMesh)
 └── Light (Ambient)
```

---

## 5.2 节点渲染

### 方案

* 使用 `InstancedMesh`（必须）
* 每个节点对应一个 instance

---

### 属性映射

| 属性     | 映射            |
| ------ | ------------- |
| weight | scale / color |
| hover  | emissive      |
| liked  | glow          |

---

---

## 5.3 Raycasting（关键）

```ts
raycaster.setFromCamera(mouse, camera)
const intersects = raycaster.intersectObjects(mesh)
```

---

## 5.4 性能约束

* 节点数：≤ 5000
* 每帧更新：≤ 200节点
* 使用 requestAnimationFrame

---

# 6. 文本生成系统设计

---

## 6.1 生成策略（分层）

---

### 6.1.1 随机生成

```ts
function randomText() {
  return randomChars(5, 10)
}
```

---

### 6.1.2 模板生成

```ts
templates = [
  "{名词}在{名词}中沉默",
  "{形容词}{名词}{动词}"
]
```

---

### 6.1.3 偏好引导生成（核心）

```ts
function generateWithPreference(pref) {
  return weightedSample(pref.tokens)
}
```

---

## 6.2 生成调度

```txt
70% 随机
20% 模板
10% 偏好引导
```

---

👉 强制保持随机性（防止系统“过拟合”）

---

# 7. 交互系统设计

---

## 7.1 Hover

### 流程

```txt
MouseMove → Raycast → Node → set hover
```

---

## 7.2 双击 Like

### 流程

```txt
DoubleClick → Node
    → update weight
    → record action
    → 更新偏好
```

---

# 8. 意义传播算法

---

## 8.1 模型

```txt
节点权重 → 影响邻域
```

---

## 8.2 实现

```ts
function propagate(node) {
  for (neighbor of getNearby(node)) {
    neighbor.weight += node.weight * decay(distance)
  }
}
```

---

## 8.3 衰减函数

```ts
decay(d) = 1 / (1 + d)
```

---

# 9. 偏好学习机制

---

## 9.1 Token提取

```ts
function extractTokens(text) {
  return text.split("")
}
```

---

## 9.2 权重更新

```ts
tokens.forEach(t => {
  pref.tokens[t] += 1
})
```

---

## 9.3 使用方式

影响生成概率：

```ts
P(token) ∝ pref[token]
```

---

# 10. 分析模块设计（终局）

---

## 10.1 输入

* 用户行为日志
* 偏好模型
* 节点分布

---

## 10.2 输出结构

```ts
type Report = {
  topTokens: string[]
  preferenceType: string
  explorationScore: number
  biasScore: number
}
```

---

## 10.3 分析维度

| 维度   | 描述       |
| ---- | -------- |
| 偏好词  | 高频token  |
| 审美倾向 | 抽象 vs 具体 |
| 探索性  | 是否只在局部活动 |
| 收敛性  | 是否快速固定偏好 |

---

## 10.4 文本输出（示例）

* “你偏好短句与自然意象”
* “你在局部空间形成了高密度意义区”
* “系统生成已明显向你的偏好收敛”

---

# 11. UI设计

---

## 11.1 主画布

* 全屏 WebGL
* 节点漂浮

---

## 11.2 悬浮文本

* 中央展示
* 半透明背景

---

## 11.3 控制区

* 结束观测
* 重置系统

---

## 11.4 报告页面

* 图表 + 文本分析

---

# 12. 非功能需求

---

## 12.1 性能

* FPS ≥ 30
* 内存 ≤ 300MB

---

## 12.2 可扩展

* 支持 LLM API
* 支持多用户数据

---

## 12.3 稳定性

* 无阻塞渲染
* 异常节点自动回收

---

# 13. 开发计划

---

## Phase 1（基础）

* Three.js 场景
* 节点渲染
* Hover

---

## Phase 2（交互）

* 双击
* 权重系统
* 传播

---

## Phase 3（智能）

* 偏好学习
* 生成调整

---

## Phase 4（收敛）

* 分析报告
* UX优化

---

# 14. 风险与约束

---

## 14.1 风险

| 风险    | 解决            |
| ----- | ------------- |
| 变推荐系统 | 限制学习能力        |
| 性能瓶颈  | InstancedMesh |
| 无哲学深度 | 强制反转机制        |

---

# 15. 关键设计原则（必须遵守）

---

### 1️⃣ 保持“无意义基底”

→ 随机必须占主导

### 2️⃣ 用户是“赋义者”

→ 系统不做判断

### 3️⃣ 学习是“偏移”，不是“理解”

→ 避免拟人化

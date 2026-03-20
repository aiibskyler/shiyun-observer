/**
 * 游戏状态机
 */
export type GameState =
  | 'welcome' // 欢迎页面
  | 'input' // API key 输入
  | 'playing' // 正在观测（诗句生成中）
  | 'analyzing' // 分析中（流式输出）
  | 'complete' // 完成页面

/**
 * 诗句生命周期状态
 */
export type PoemLifecycle = 'spawning' | 'displaying' | 'fading' | 'dead'

/**
 * 增强的诗句节点
 */
export type GamePoemNode = {
  id: string
  text: string
  position: { x: number; y: number; z: number }

  // 生命周期
  lifecycle: PoemLifecycle
  spawnTime: number
  fadeTime: number

  // 交互
  clicked: boolean
  hoverTime: number // 悬停时长

  // 来源
  source: 'llm' | 'template'

  // 视觉
  scale: number
  opacity: number
  color: { r: number; g: number; b: number }
}

/**
 * LLM 配置
 */
export type LLMConfig = {
  provider: 'openai' | 'anthropic' | 'custom'
  apiKey: string
  baseUrl?: string // 自定义 API 地址（用于代理或兼容服务）
  model?: string
}

/**
 * 实时洞察
 */
export type LiveInsight = {
  id: string
  text: string
  timestamp: number
  isStreaming: boolean
}

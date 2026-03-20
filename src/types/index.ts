/**
 * 诗云节点模型
 */
export type PoemNode = {
  id: string
  text: string
  position: {
    x: number
    y: number
    z: number
  }
  weight: number // 意义权重 (0-1)
  liked: boolean // 是否被喜欢
  hover: boolean // 是否被悬停
  source: 'random' | 'template' | 'llm'
  createdAt: number
}

/**
 * 用户行为模型
 */
export type UserAction = {
  nodeId: string
  action: 'hover' | 'like'
  timestamp: number
}

/**
 * 用户偏好模型
 */
export type PreferenceProfile = {
  tokens: Map<string, number>
  patterns: Map<string, number>
}

/**
 * 分析报告模型
 */
export type Report = {
  topTokens: string[]
  preferenceType: string
  explorationScore: number
  biasScore: number
  totalActions: number
  sessionDuration: number
}

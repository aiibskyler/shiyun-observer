import type { PoemNode, UserAction, PreferenceProfile, Report } from '../types'

/**
 * 分析用户行为并生成报告
 */
export function analyzeSession(
  nodes: PoemNode[],
  actions: UserAction[],
  preference: PreferenceProfile,
  sessionStartTime: number
): Report {
  const sessionDuration = Date.now() - sessionStartTime
  const totalActions = actions.length

  // 1. 获取高频 token
  const topTokens = getTopTokens(preference, 10)

  // 2. 分析偏好类型
  const preferenceType = analyzePreferenceType(preference, nodes)

  // 3. 计算探索性分数
  const explorationScore = calculateExplorationScore(actions, nodes)

  // 4. 计算收敛性分数
  const biasScore = calculateBiasScore(preference, totalActions)

  return {
    topTokens,
    preferenceType,
    explorationScore,
    biasScore,
    totalActions,
    sessionDuration,
  }
}

/**
 * 获取高频 tokens
 */
function getTopTokens(preference: PreferenceProfile, count: number): string[] {
  const sorted = Array.from(preference.tokens.entries()).sort(
    (a, b) => b[1] - a[1]
  )
  return sorted.slice(0, count).map(([token]) => token)
}

/**
 * 分析偏好类型
 * 基于用户喜欢的节点文本特征
 */
function analyzePreferenceType(
  _preference: PreferenceProfile,
  nodes: PoemNode[]
): string {
  const likedNodes = nodes.filter(n => n.liked)
  if (likedNodes.length === 0) {
    return '尚未形成明显偏好'
  }

  // 计算平均文本长度
  const avgLength =
    likedNodes.reduce((sum, n) => sum + n.text.length, 0) / likedNodes.length

  // 计算平均权重
  const avgWeight =
    likedNodes.reduce((sum, n) => sum + n.weight, 0) / likedNodes.length

  // 分析特征
  const traits: string[] = []

  if (avgLength < 4) {
    traits.push('短句')
  } else if (avgLength > 6) {
    traits.push('长句')
  } else {
    traits.push('中长句')
  }

  if (avgWeight > 0.7) {
    traits.push('强烈偏好')
  } else if (avgWeight > 0.5) {
    traits.push('明显偏好')
  } else {
    traits.push('温和偏好')
  }

  // 检查是否偏好自然意象
  const natureWords = ['风', '云', '光', '水', '山', '树', '鸟', '星', '月']
  const hasNature = likedNodes.some(node =>
    natureWords.some(word => node.text.includes(word))
  )
  if (hasNature) {
    traits.push('自然意象')
  }

  // 检查是否偏好抽象概念
  const abstractWords = ['时间', '空间', '梦', '心', '影']
  const hasAbstract = likedNodes.some(node =>
    abstractWords.some(word => node.text.includes(word))
  )
  if (hasAbstract) {
    traits.push('抽象概念')
  }

  return traits.join(' · ')
}

/**
 * 计算探索性分数
 * 衡量用户是否在不同区域活动
 */
function calculateExplorationScore(
  actions: UserAction[],
  nodes: PoemNode[]
): number {
  if (actions.length === 0) return 0

  // 获取所有交互过的节点 ID
  const interactedNodeIds = new Set(actions.map(a => a.nodeId))
  const interactedNodes = nodes.filter(n => interactedNodeIds.has(n.id))

  if (interactedNodes.length < 2) return 0

  // 计算这些节点的空间分布
  // 找出边界框
  let minX = Infinity,
    maxX = -Infinity
  let minY = Infinity,
    maxY = -Infinity
  let minZ = Infinity,
    maxZ = -Infinity

  interactedNodes.forEach(node => {
    minX = Math.min(minX, node.position.x)
    maxX = Math.max(maxX, node.position.x)
    minY = Math.min(minY, node.position.y)
    maxY = Math.max(maxY, node.position.y)
    minZ = Math.min(minZ, node.position.z)
    maxZ = Math.max(maxZ, node.position.z)
  })

  // 计算边界框的体积
  const volume = (maxX - minX) * (maxY - minY) * (maxZ - minZ)

  // 标准化分数 (假设最大合理体积约为 27000 = 30^3)
  const normalizedScore = Math.min(volume / 27000, 1)

  return Math.round(normalizedScore * 100) / 100
}

/**
 * 计算收敛性分数
 * 衡量用户是否快速固定偏好
 */
function calculateBiasScore(
  preference: PreferenceProfile,
  totalActions: number
): number {
  if (totalActions === 0 || preference.tokens.size === 0) return 0

  // 计算 token 分布的熵
  const totalOccurrences = Array.from(preference.tokens.values()).reduce(
    (sum, count) => sum + count,
    0
  )

  let entropy = 0
  preference.tokens.forEach(count => {
    const p = count / totalOccurrences
    entropy -= p * Math.log2(p)
  })

  // 最大熵 = log2(唯一token数)
  const maxEntropy = Math.log2(preference.tokens.size)

  // 归一化熵 (0 = 完全集中, 1 = 完全分散)
  const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0

  // 收敛性 = 1 - 归一化熵
  // 高收敛性意味着偏好集中在少数 token
  const biasScore = 1 - normalizedEntropy

  return Math.round(biasScore * 100) / 100
}

/**
 * 生成文本分析报告
 */
export function generateTextReport(report: Report): string {
  const lines: string[] = []

  lines.push('# 🌸 意义构建分析报告\n')

  // 偏好分析
  lines.push('## 偏好特征')
  lines.push(`你的偏好类型：${report.preferenceType}`)
  lines.push(`高频词：${report.topTokens.slice(0, 5).join('、')}`)
  lines.push('')

  // 行为模式
  lines.push('## 行为模式')
  if (report.explorationScore > 0.7) {
    lines.push('你在广阔的空间中探索，对不同的文本都保持开放和好奇。')
  } else if (report.explorationScore > 0.3) {
    lines.push('你在局部空间中探索，逐渐形成了自己的兴趣区域。')
  } else {
    lines.push('你专注于特定的意义区域，深入探索自己喜欢的内容。')
  }
  lines.push('')

  // 收敛性分析
  lines.push('## 收敛性')
  if (report.biasScore > 0.7) {
    lines.push('你的偏好已经明显收敛，系统生成正在向你的兴趣靠拢。')
  } else if (report.biasScore > 0.4) {
    lines.push('你的偏好正在形成中，系统正在学习你的品味。')
  } else {
    lines.push('你的探索非常多元，尚未形成固定的偏好模式。')
  }
  lines.push('')

  // 统计信息
  lines.push('## 统计数据')
  lines.push(`总交互次数：${report.totalActions}`)
  const durationMinutes = Math.floor(report.sessionDuration / 60000)
  lines.push(`观测时长：${durationMinutes} 分钟`)

  return lines.join('\n')
}

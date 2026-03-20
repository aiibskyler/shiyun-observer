import type { PoemNode } from '../types'

/**
 * 计算两点之间的欧几里得距离
 */
function distance(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * 衰减函数
 * decay(d) = 1 / (1 + d)
 */
function decay(d: number): number {
  return 1 / (1 + d)
}

/**
 * 获取附近的节点
 * @param nodes 所有节点
 * @param centerNode 中心节点
 * @param radius 影响半径 (默认 15)
 */
function getNearby(
  nodes: PoemNode[],
  centerNode: PoemNode,
  radius: number = 15
): PoemNode[] {
  return nodes.filter(node => {
    if (node.id === centerNode.id) return false
    const d = distance(node.position, centerNode.position)
    return d <= radius
  })
}

/**
 * 意义传播算法
 * 当用户喜欢一个节点时，将其权重传播到附近的节点
 *
 * @param nodes 所有节点
 * @param likedNode 被喜欢的节点
 * @param radius 影响半径
 * @returns 更新后的节点数组
 */
export function propagate(
  nodes: PoemNode[],
  likedNode: PoemNode,
  radius: number = 15
): PoemNode[] {
  const neighbors = getNearby(nodes, likedNode, radius)
  const updates = new Map<string, number>()

  // 计算每个邻居的权重增加
  neighbors.forEach(neighbor => {
    const d = distance(neighbor.position, likedNode.position)
    const influence = likedNode.weight * decay(d)
    const currentIncrease = updates.get(neighbor.id) || 0
    updates.set(neighbor.id, currentIncrease + influence)
  })

  // 应用更新
  return nodes.map(node => {
    const increase = updates.get(node.id)
    if (increase !== undefined) {
      const newWeight = Math.min(node.weight + increase, 1) // 最大权重为 1
      return { ...node, weight: newWeight }
    }
    return node
  })
}

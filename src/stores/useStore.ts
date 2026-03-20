import { create } from 'zustand'
import type { PoemNode, UserAction, PreferenceProfile, Report } from '../types'
import { propagate } from '../lib/propagation'
import { generateNode } from '../lib/textGenerator'
import { analyzeSession, generateTextReport } from '../lib/analyzer'

/**
 * 全局状态 Store (Zustand)
 */
interface Store {
  // 状态
  nodes: PoemNode[]
  selectedNodeId: string | null
  hoveredNodeId: string | null
  actions: UserAction[]
  preference: PreferenceProfile
  sessionStartTime: number

  // 节点操作
  addNode: (node: PoemNode) => void
  updateNode: (id: string, updates: Partial<PoemNode>) => void
  getNode: (id: string) => PoemNode | undefined
  generateAndAddNode: () => void

  // 用户行为
  recordAction: (action: UserAction) => void
  likeNode: (id: string) => void
  hoverNode: (id: string | null) => void

  // 偏好学习
  updatePreference: (text: string) => void

  // 系统控制
  reset: () => void
  initializeSession: () => void
  generateReport: () => Report
  generateTextReport: () => string
}

const initialPreference: PreferenceProfile = {
  tokens: new Map(),
  patterns: new Map(),
}

export const useStore = create<Store>((set, get) => ({
  // 初始状态
  nodes: [],
  selectedNodeId: null,
  hoveredNodeId: null,
  actions: [],
  preference: initialPreference,
  sessionStartTime: Date.now(),

  // 添加节点
  addNode: node =>
    set(state => ({
      nodes: [...state.nodes, node],
    })),

  // 更新节点
  updateNode: (id, updates) =>
    set(state => ({
      nodes: state.nodes.map(node =>
        node.id === id ? { ...node, ...updates } : node
      ),
    })),

  // 获取节点
  getNode: id => {
    return get().nodes.find(node => node.id === id)
  },

  // 记录用户行为
  recordAction: action =>
    set(state => ({
      actions: [...state.actions, action],
    })),

  // 喜欢/双击节点
  likeNode: id => {
    const state = get()
    const node = state.getNode(id)
    if (!node) return

    // 增加被喜欢节点的权重
    const likedNode = {
      ...node,
      liked: true,
      weight: Math.min(node.weight + 0.3, 1),
    }

    // 应用意义传播算法
    const updatedNodes = propagate(state.nodes, likedNode)

    // 更新状态
    set({
      nodes: updatedNodes,
      actions: [
        ...state.actions,
        {
          nodeId: id,
          action: 'like',
          timestamp: Date.now(),
        },
      ],
    })

    // 更新偏好学习
    get().updatePreference(node.text)
  },

  // 悬停节点
  hoverNode: id => {
    set(state => {
      // 清除之前的悬停状态
      const updatedNodes = state.nodes.map(node => ({
        ...node,
        hover: node.id === id,
      }))

      return {
        nodes: updatedNodes,
        hoveredNodeId: id,
        actions: id
          ? [
              ...state.actions,
              {
                nodeId: id,
                action: 'hover' as const,
                timestamp: Date.now(),
              },
            ]
          : state.actions,
      }
    })
  },

  // 更新用户偏好
  updatePreference: text => {
    const state = get()
    const tokens = text.split('')

    const newTokens = new Map(state.preference.tokens)
    tokens.forEach(token => {
      const count = newTokens.get(token) || 0
      newTokens.set(token, count + 1)
    })

    set({
      preference: {
        ...state.preference,
        tokens: newTokens,
      },
    })
  },

  // 生成并添加新节点（基于偏好）
  generateAndAddNode: () => {
    const state = get()
    const newNode = generateNode(undefined, state.preference)
    set({
      nodes: [...state.nodes, newNode],
    })
  },

  // 初始化会话
  initializeSession: () => {
    set({
      nodes: [],
      selectedNodeId: null,
      hoveredNodeId: null,
      actions: [],
      preference: initialPreference,
      sessionStartTime: Date.now(),
    })
  },

  // 生成分析报告
  generateReport: () => {
    const state = get()
    return analyzeSession(
      state.nodes,
      state.actions,
      state.preference,
      state.sessionStartTime
    )
  },

  // 生成文本报告
  generateTextReport: () => {
    const report = get().generateReport()
    return generateTextReport(report)
  },

  // 重置
  reset: () => {
    get().initializeSession()
  },
}))

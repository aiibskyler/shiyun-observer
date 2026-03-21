import { create } from 'zustand'
import type {
  GameState,
  GamePoemNode,
  LLMConfig,
  LiveInsight,
} from '../types/game'

interface GameStore {
  // 游戏状态
  gameState: GameState
  currentStep: number
  totalSteps: number

  // LLM 配置
  llmConfig: LLMConfig | null

  // 诗句
  poems: GamePoemNode[]
  maxPoems: number
  poemLifetime: number // 诗句存在时间（毫秒）

  // 用户交互
  clickedPoemIds: string[]
  likedPoems: string[]
  hoverDurations: Map<string, number>

  // 实时洞察
  insights: LiveInsight[]
  currentInsight: string

  // 统计
  startTime: number
  endTime: number

  // Actions
  setGameState: (state: GameState) => void
  setLLMConfig: (config: LLMConfig) => void
  addPoem: (poem: GamePoemNode) => void
  updatePoem: (id: string, updates: Partial<GamePoemNode>) => void
  clickPoem: (id: string) => void
  hoverPoem: (id: string, duration: number) => void
  removePoem: (id: string) => void
  addInsight: (insight: LiveInsight) => void
  updateCurrentInsight: (text: string) => void
  startGame: () => void
  endGame: () => void
  reset: () => void
}

const INITIAL_CONFIG = {
  maxPoems: 96,
  poemLifetime: 30000, // 30秒，和生成器寿命保持一致
  totalSteps: 100, // 总共生成100句诗
}

export const useGameStore = create<GameStore>(set => ({
  // 初始状态
  gameState: 'welcome',
  currentStep: 0,
  totalSteps: INITIAL_CONFIG.totalSteps,
  llmConfig: null,
  poems: [],
  maxPoems: INITIAL_CONFIG.maxPoems,
  poemLifetime: INITIAL_CONFIG.poemLifetime,
  clickedPoemIds: [],
  likedPoems: [],
  hoverDurations: new Map(),
  insights: [],
  currentInsight: '',
  startTime: 0,
  endTime: 0,

  // 设置游戏状态
  setGameState: state => set({ gameState: state }),

  // 设置 LLM 配置
  setLLMConfig: config => set({ llmConfig: config }),

  // 添加诗句
  addPoem: poem =>
    set(state => ({
      poems: [...state.poems, poem],
      currentStep: state.currentStep + 1,
    })),

  // 更新诗句
  updatePoem: (id, updates) =>
    set(state => ({
      poems: state.poems.map(p => (p.id === id ? { ...p, ...updates } : p)),
    })),

  // 点击诗句
  clickPoem: id =>
    set(state => {
      const poem = state.poems.find(p => p.id === id)
      if (!poem || poem.clicked) return state

        return {
          poems: state.poems.map(p =>
            p.id === id ? { ...p, clicked: true } : p
          ),
          clickedPoemIds: [...state.clickedPoemIds, id],
          likedPoems: [...state.likedPoems, poem.text],
        }
      }),

  // 悬停诗句
  hoverPoem: (id, duration) =>
    set(state => {
      const newDurations = new Map(state.hoverDurations)
      const currentDuration = newDurations.get(id) || 0
      newDurations.set(id, currentDuration + duration)

      return {
        hoverDurations: newDurations,
      }
    }),

  // 移除诗句
  removePoem: id =>
    set(state => ({
      poems: state.poems.filter(p => p.id !== id),
    })),

  // 添加洞察
  addInsight: insight =>
    set(state => ({
      insights: [...state.insights, insight],
    })),

  // 更新当前洞察
  updateCurrentInsight: text => set({ currentInsight: text }),

  // 开始游戏
  startGame: () =>
    set({
      gameState: 'playing',
      startTime: Date.now(),
      poems: [],
      clickedPoemIds: [],
      likedPoems: [],
      hoverDurations: new Map(),
      insights: [],
      currentInsight: '',
      currentStep: 0,
    }),

  // 结束游戏
  endGame: () =>
    set({
      gameState: 'analyzing',
      endTime: Date.now(),
      insights: [],
      currentInsight: '',
    }),

  // 重置
  reset: () =>
    set({
      gameState: 'welcome',
      currentStep: 0,
      poems: [],
      clickedPoemIds: [],
      likedPoems: [],
      hoverDurations: new Map(),
      insights: [],
      currentInsight: '',
      startTime: 0,
      endTime: 0,
    }),
}))

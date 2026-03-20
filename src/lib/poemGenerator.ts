import type { GamePoemNode } from '../types/game'
import type { LLMConfig } from '../types/game'
import { streamLLM, generatePoemPrompt, generatePoemSystemPrompt } from './llm'
import { getPresetPoem, shouldUseLLM } from './presetContent'

/**
 * 诗句生成器配置
 */
const CONFIG = {
  spawnInterval: 5000, // 每5秒生成一句（降低频率）
  displayDuration: 30000, // 显示30秒，给阅读留出更从容的时间
  fadeDuration: 3000, // 淡出3秒
}

// 预制内容计数器
let presetCount = 0
const recentLLMPoemQueue: string[] = []
const RECENT_LLM_QUEUE_LIMIT = 2

// LLM失败追踪
let llmFailureCount = 0
let lastLLMFailureTime = 0
const FAILURE_COOLDOWN = 30000 // 失败后30秒内降低LLM使用频率
let lastLLMRequestTime = 0
const REQUEST_COOLDOWN = 25000 // 正常情况下也限制 LLM 的最小请求间隔

function normalizePoemText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[""'`“”‘’《》【】]/g, '')
    .replace(/^\s*(诗句|答案|输出|正文)\s*[:：]\s*/gm, '')
    .replace(/^\s*[-*•\d.]+\s*/gm, '')
    .replace(/\r/g, '')
    .trim()
}

function extractPoeticLine(raw: string): string {
  const normalized = normalizePoemText(raw)
  const lines = normalized
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const candidates = lines.length > 0 ? lines : [normalized]

  for (const candidate of candidates) {
    const cleaned = candidate
      .replace(/[。！？；;,.!?\s]+$/g, '')
      .replace(/[()（）]/g, '')
      .trim()

    if (isPoeticLine(cleaned)) {
      return cleaned
    }
  }

  return ''
}

function isPoeticLine(text: string): boolean {
  if (!text) {
    return false
  }

  const compact = text.replace(/[，。、！？；：·\s]/g, '')
  const length = compact.length
  const bannedPhrases = [
    '诗句',
    '解释',
    '用户',
    '点击',
    '生成',
    '输出',
    '答案',
    '喜欢',
    '意义是',
    '人生',
    '我们要',
  ]

  if (!/^[\u4e00-\u9fa5，。、！？；：·\s]+$/.test(text)) {
    return false
  }

  if (length < 4 || length > 14) {
    return false
  }

  if (bannedPhrases.some(phrase => text.includes(phrase))) {
    return false
  }

  return true
}

/**
 * 生成随机位置
 */
function randomPosition(radius: number = 30): {
  x: number
  y: number
  z: number
} {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.random() * Math.PI
  const r = Math.cbrt(Math.random()) * radius

  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi),
  }
}

/**
 * 生成随机颜色
 */
function randomColor(): { r: number; g: number; b: number } {
  const colors = [
    { r: 147, g: 197, b: 253 }, // 浅蓝
    { r: 196, g: 181, b: 253 }, // 浅紫
    { r: 251, g: 191, b: 213 }, // 粉红
    { r: 167, g: 243, b: 208 }, // 薄荷绿
    { r: 253, g: 224, b: 71 }, // 淡黄
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

/**
 * 诗句生成器
 */
export class PoemGenerator {
  private llmConfig: LLMConfig

  constructor(llmConfig: LLMConfig) {
    this.llmConfig = llmConfig
  }

  private consumeRecentLLMPoem(): string | null {
    const poem = recentLLMPoemQueue.shift()
    return poem ?? null
  }

  private rememberRecentLLMPoem(text: string) {
    if (!text) {
      return
    }

    recentLLMPoemQueue.push(text)

    while (recentLLMPoemQueue.length > RECENT_LLM_QUEUE_LIMIT) {
      recentLLMPoemQueue.shift()
    }
  }

  /**
   * 生成单个诗句
   */
  async generatePoem(context: {
    clickedPoems: string[]
    step: number
    clickRate: number
    forcePreset?: boolean
  }): Promise<GamePoemNode> {
    const now = Date.now()
    const forcePreset = context.forcePreset === true
    const recentLLMPoem = forcePreset ? null : this.consumeRecentLLMPoem()

    // 先准备降级词汇（氛围词）
    // 检查是否在LLM失败冷却期
    const isInCooldown = now - lastLLMFailureTime < FAILURE_COOLDOWN
    const isInRequestCooldown = now - lastLLMRequestTime < REQUEST_COOLDOWN

    // 决定是否使用 LLM
    // 如果在冷却期，直接使用降级词汇，不请求LLM
    let useLLM =
      !recentLLMPoem &&
      !forcePreset &&
      !isInCooldown &&
      !isInRequestCooldown &&
      shouldUseLLM(presetCount, context.clickRate)

    let text = recentLLMPoem ?? ''
    let source: GamePoemNode['source'] = recentLLMPoem ? 'llm' : 'template'

    if (recentLLMPoem) {
      source = 'llm'
    } else if (useLLM) {
      // 尝试使用 LLM 生成，同时已经有降级词汇作为后备
      try {
        lastLLMRequestTime = now
        const prompt = generatePoemPrompt({
          clickedPoems: context.clickedPoems,
        })

        for await (const chunk of streamLLM(this.llmConfig, {
          prompt,
          systemPrompt: generatePoemSystemPrompt(),
          // 给 reasoning 模型足够 completion 额度，避免 content 没机会输出
          maxTokens: 8192,
          temperature: 0.95,
        })) {
          text += chunk
        }

        text = extractPoeticLine(text)

        if (text) {
          source = 'llm'
          this.rememberRecentLLMPoem(text)
          console.log('[PoemGenerator] LLM生成成功:', text)
          llmFailureCount = 0
        } else {
          console.warn('[PoemGenerator] LLM返回内容不够诗性，使用预制诗句')
          text = this.getPresetPoem(context.clickedPoems)
          source = 'template'
        }
      } catch (error) {
        llmFailureCount++
        lastLLMFailureTime = now
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.warn(`[PoemGenerator] LLM请求失败（第${llmFailureCount}次），使用降级词汇:`, errorMessage)
        text = this.getPresetPoem(context.clickedPoems, true)
        source = 'template'
      }
    } else {
      text = this.getPresetPoem(context.clickedPoems)
      source = 'template'
      presetCount++

      // 如果是因为冷却期，增加presetCount以更快恢复
      if (isInCooldown) {
        presetCount++
      }
    }

    const poem = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      position: randomPosition(),
      lifecycle: 'spawning' as const,
      spawnTime: now,
      fadeTime: now + CONFIG.displayDuration,
      clicked: false,
      hoverTime: 0,
      source,
      scale: 0,
      opacity: 0,
      color: randomColor(),
    }

    return poem
  }

  /**
   * 生成预制诗句
   * @param clickedPoems 用户已点击诗句
   * @param forceMood 是否强制使用更稳定的氛围句
   */
  private getPresetPoem(clickedPoems: string[] = [], forceMood: boolean = false): string {
    return getPresetPoem(clickedPoems, forceMood)
  }
}

/**
 * 创建诗句生成器实例
 */
export function createPoemGenerator(llmConfig: LLMConfig): PoemGenerator {
  return new PoemGenerator(llmConfig)
}

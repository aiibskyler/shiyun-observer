import type { GamePoemNode, LLMConfig } from '../types/game'
import { streamLLM } from './llm'
import { getPresetPoem, shouldUseLLM } from './presetContent'

const CONFIG = {
  spawnInterval: 5000,
  displayDuration: 30000,
  fadeDuration: 3000,
}

let presetCount = 0
let llmFailureCount = 0
let lastLLMFailureTime = 0
const FAILURE_COOLDOWN = 30000
let lastLLMRequestTime = 0
const REQUEST_COOLDOWN = 12000
const LLM_BATCH_SIZE = 4

function normalizePoemText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/["'`“”‘’《》【】]/g, '')
    .replace(/^\s*(诗句|答案|输出|正文)\s*[:：]\s*/gm, '')
    .replace(/^\s*(上联|下联|其一|其二)\s*[:：]\s*/gm, '')
    .replace(/^\s*[-*•\d.]+\s*/gm, '')
    .replace(/\r/g, '')
    .trim()
}

function cleanPoemSegment(text: string): string {
  return text
    .replace(/[。！？；;,.!?、]+$/g, '')
    .replace(/[()（）]/g, '')
    .trim()
}

function trySplitSingleLineCouplet(text: string): string[] {
  const cleaned = cleanPoemSegment(text)

  if (!cleaned) {
    return []
  }

  const explicitSegments = cleaned
    .split(/[，；。]/)
    .map(segment => cleanPoemSegment(segment))
    .filter(Boolean)

  if (explicitSegments.length >= 2) {
    return explicitSegments.slice(0, 2)
  }

  const compact = cleaned.replace(/[，。！？；、\s]/g, '')
  const length = compact.length

  if (length < 8 || length > 20) {
    return []
  }

  const half = Math.floor(length / 2)
  const candidates =
    length % 2 === 0
      ? [[compact.slice(0, half), compact.slice(half)]]
      : [
          [compact.slice(0, half), compact.slice(half)],
          [compact.slice(0, half + 1), compact.slice(half + 1)],
        ]

  for (const [left, right] of candidates) {
    if (left.length >= 4 && left.length <= 10 && right.length >= 4 && right.length <= 10) {
      return [left, right]
    }
  }

  return []
}

function splitCoupletCandidates(raw: string): string[] {
  const normalized = normalizePoemText(raw)
  const lines = normalized
    .split('\n')
    .map(line => cleanPoemSegment(line))
    .filter(Boolean)

  if (lines.length >= 2) {
    return lines.slice(0, 2)
  }

  const inlineSegments = normalized
    .split(/[，；,]/)
    .map(segment => cleanPoemSegment(segment))
    .filter(Boolean)

  if (inlineSegments.length >= 2) {
    return inlineSegments.slice(0, 2)
  }

  if (lines.length === 1) {
    return trySplitSingleLineCouplet(lines[0])
  }

  return lines
}

function isPoeticLine(text: string): boolean {
  if (!text) {
    return false
  }

  const compact = text.replace(/[，。！？；、\s]/g, '')
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

  if (!/^[\u4e00-\u9fa5，。！？；、\s]+$/.test(text)) {
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

function isPoeticCouplet(lines: string[]): boolean {
  if (lines.length !== 2) {
    return false
  }

  if (!lines.every(isPoeticLine)) {
    return false
  }

  const lengths = lines.map(line => line.replace(/[，。！？；、\s]/g, '').length)
  return Math.abs(lengths[0] - lengths[1]) <= 2
}

function extractPoeticCouplet(raw: string): string {
  const lines = splitCoupletCandidates(raw)

  if (isPoeticCouplet(lines)) {
    return lines.join('\n')
  }

  return ''
}

function generateBatchPoemPrompt(context: {
  clickedPoems: string[]
  avoidPoems?: string[]
  batchSize: number
}): string {
  const sections = [
    `请一次生成 ${context.batchSize} 组中文短联。`,
    '每组必须严格输出为一行：第N组|上句|下句',
    '上句和下句都必须是完整短句，每句 4-8 个汉字。',
    '不要把单个意象词拆成三段，不要输出“月|窗前|照”这种格式。',
    '正确示例：第1组|月沉荒渡口|灯照未归舟',
    '正确示例：第2组|风停松子落|夜久石泉温',
    '除结果行之外，不要输出任何说明、标题、解释、思维过程或 markdown。',
    '风格要冷静、含蓄、具象。',
  ]

  if (context.clickedPoems.length > 0) {
    sections.push('参考用户偏好：')
    sections.push(context.clickedPoems.join('\n'))
  }

  if (context.avoidPoems && context.avoidPoems.length > 0) {
    sections.push('避免重复：')
    sections.push(context.avoidPoems.slice(0, 12).join('\n'))
  }

  return sections.join('\n')
}

function generateBatchPoemSystemPrompt(): string {
  return [
    '你是“诗云”写作引擎。',
    '当用户要求多组短联时，必须严格逐行输出：第N组|上句|下句。',
    '上句和下句必须都是完整短句，不能拆成意象词、地点词、动作词三段。',
    '不要输出任何额外文本。',
    '上下句都必须是自然的中文诗性短句，每句 4-8 个汉字。',
  ].join('\n')
}

function extractBatchPoeticCouplets(raw: string): string[] {
  const normalized = normalizePoemText(raw)
  const lines = normalized
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const poems: string[] = []

  for (const line of lines) {
    const segments = line
      .split(/[|｜]/)
      .map(segment => cleanPoemSegment(segment))
      .filter(Boolean)

    if (segments.length < 2) {
      continue
    }

    const candidatePairs: Array<[string, string]> = []

    if (segments.length >= 3) {
      const maybeIndex = segments[0]
      if (/^第?\d+组?$/.test(maybeIndex)) {
        candidatePairs.push([segments[1], segments[2]])
      } else {
        candidatePairs.push([segments[0], segments[1]])
        candidatePairs.push([segments[1], segments[2]])
      }
    } else {
      candidatePairs.push([segments[0], segments[1]])
    }

    for (const [left, right] of candidatePairs) {
      const poem = extractPoeticCouplet(`${left}\n${right}`)
      if (poem) {
        poems.push(poem)
        break
      }
    }
  }

  return poems
}

function randomPosition(radius: number = 30): { x: number; y: number; z: number } {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.random() * Math.PI
  const r = Math.cbrt(Math.random()) * radius

  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi),
  }
}

function randomColor(): { r: number; g: number; b: number } {
  const colors = [
    { r: 147, g: 197, b: 253 },
    { r: 196, g: 181, b: 253 },
    { r: 251, g: 191, b: 213 },
    { r: 167, g: 243, b: 208 },
    { r: 253, g: 224, b: 71 },
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

export class PoemGenerator {
  private llmConfig: LLMConfig
  private llmBatchBuffer: string[] = []
  private llmBatchPromise: Promise<void> | null = null

  constructor(llmConfig: LLMConfig) {
    this.llmConfig = llmConfig
  }

  private async requestLLMBatch(context: {
    clickedPoems: string[]
    avoidPoems: string[]
  }): Promise<void> {
    if (!this.llmBatchPromise) {
      this.llmBatchPromise = (async () => {
        let responseText = ''
        const prompt = generateBatchPoemPrompt({
          clickedPoems: context.clickedPoems,
          avoidPoems: context.avoidPoems,
          batchSize: LLM_BATCH_SIZE,
        })

        for await (const chunk of streamLLM(this.llmConfig, {
          prompt,
          systemPrompt: generateBatchPoemSystemPrompt(),
          maxTokens: 8192,
          temperature: 0.95,
        })) {
          responseText += chunk
        }

        const poems = extractBatchPoeticCouplets(responseText)
        if (poems.length === 0) {
          throw new Error(`LLM batch response did not contain valid couplets: ${responseText}`)
        }

        this.llmBatchBuffer.push(...poems)
      })().finally(() => {
        this.llmBatchPromise = null
      })
    }

    await this.llmBatchPromise
  }

  private async getLLMPoemFromBatch(context: {
    clickedPoems: string[]
    avoidPoems: string[]
  }): Promise<string> {
    const avoidSet = new Set(context.avoidPoems.map(poem => poem.trim()).filter(Boolean))

    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (this.llmBatchBuffer.length === 0) {
        await this.requestLLMBatch(context)
      }

      while (this.llmBatchBuffer.length > 0) {
        const poem = this.llmBatchBuffer.shift() || ''
        if (poem && !avoidSet.has(poem)) {
          return poem
        }
      }
    }

    throw new Error('No unique poem available from LLM batch')
  }

  async generatePoem(context: {
    clickedPoems: string[]
    avoidPoems?: string[]
    step: number
    clickRate: number
    forcePreset?: boolean
  }): Promise<GamePoemNode> {
    const now = Date.now()
    const forcePreset = context.forcePreset === true
    const avoidPoems = new Set((context.avoidPoems || []).map(poem => poem.trim()).filter(Boolean))
    const avoidPoemList = [...avoidPoems]
    const isInCooldown = now - lastLLMFailureTime < FAILURE_COOLDOWN
    const isInRequestCooldown = now - lastLLMRequestTime < REQUEST_COOLDOWN

    const useLLM =
      !forcePreset &&
      !isInCooldown &&
      !isInRequestCooldown &&
      shouldUseLLM(presetCount, context.clickRate)

    let text = ''
    let source: GamePoemNode['source'] = 'template'

    if (useLLM) {
      try {
        lastLLMRequestTime = now
        text = await this.getLLMPoemFromBatch({
          clickedPoems: context.clickedPoems,
          avoidPoems: avoidPoemList,
        })

        if (text && !avoidPoems.has(text)) {
          source = 'llm'
          llmFailureCount = 0
          console.log('[PoemGenerator] LLM batch generated poem:', text)
        } else {
          text = this.getPresetPoem(context.clickedPoems, true, avoidPoemList)
          source = 'template'
        }
      } catch (error) {
        llmFailureCount++
        lastLLMFailureTime = now
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.warn(
          `[PoemGenerator] LLM batch request failed (${llmFailureCount}), fallback to preset:`,
          errorMessage
        )
        text = this.getPresetPoem(context.clickedPoems, true, avoidPoemList)
        source = 'template'
      }
    } else {
      text = this.getPresetPoem(context.clickedPoems, false, avoidPoemList)
      source = 'template'
      presetCount++

      if (isInCooldown) {
        presetCount++
      }
    }

    return {
      id: Math.random().toString(36).substring(2, 9),
      text,
      position: randomPosition(),
      lifecycle: 'spawning',
      spawnTime: now,
      fadeTime: now + CONFIG.displayDuration,
      clicked: false,
      hoverTime: 0,
      source,
      scale: 0,
      opacity: 0,
      color: randomColor(),
    }
  }

  private getPresetPoem(
    clickedPoems: string[] = [],
    forceMood: boolean = false,
    avoidPoems: string[] = []
  ): string {
    return getPresetPoem(clickedPoems, forceMood, avoidPoems)
  }
}

export function createPoemGenerator(llmConfig: LLMConfig): PoemGenerator {
  return new PoemGenerator(llmConfig)
}

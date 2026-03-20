/**
 * 预制内容库
 * 仅保留从 chinese-poetry 提取出的古典诗句
 */

import { classicalPoemLines } from './generatedClassicalPoems'

const archivalPoems = [...classicalPoemLines]

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function normalizePoem(text: string): string {
  return text.replace(/[，。！？；：、·\s]/g, '')
}

function extractHintTokens(clickedPoems: string[] = []): string[] {
  const tokens = new Set<string>()

  for (const poem of clickedPoems) {
    const normalized = normalizePoem(poem)

    for (let size = 3; size >= 2; size -= 1) {
      for (let index = 0; index <= normalized.length - size; index += 1) {
        const token = normalized.slice(index, index + size)
        if (token.length >= 2) {
          tokens.add(token)
        }
      }
    }
  }

  return [...tokens].slice(0, 24)
}

function getResonantPoems(clickedPoems: string[] = []): string[] {
  if (clickedPoems.length === 0) {
    return []
  }

  const hints = extractHintTokens(clickedPoems)
  const clickedSet = new Set(clickedPoems)

  return archivalPoems.filter(poem => {
    if (clickedSet.has(poem)) {
      return false
    }

    return hints.some(hint => poem.includes(hint))
  })
}

export function getPresetPoem(clickedPoems: string[] = [], forceMood: boolean = false): string {
  const resonantPoems = getResonantPoems(clickedPoems)

  if (resonantPoems.length > 0 && (forceMood || Math.random() < 0.68)) {
    return pick(resonantPoems)
  }

  return pick(archivalPoems)
}

/**
 * 保留旧接口，供其他模块按类型取用
 */
export function getPresetContent(
  type?: 'single' | 'double' | 'fragment' | 'mood' | 'empty'
): string {
  void type
  return pick(archivalPoems)
}

export const GENERATION_STRATEGY = {
  PRESET_RATIO: 0.94,
  llm: {
    interval: 14,
    afterClick: true,
    boostMultiplier: 1.35,
  },
}

export function shouldUseLLM(presetCount: number, clickRate: number): boolean {
  const { PRESET_RATIO, llm } = GENERATION_STRATEGY

  let llmProbability = 1 - PRESET_RATIO

  if (presetCount > 0 && presetCount % llm.interval === 0) {
    return true
  }

  if (llm.afterClick) {
    llmProbability *= 1 + clickRate * llm.boostMultiplier
  }

  return Math.random() < Math.min(llmProbability, 0.18)
}

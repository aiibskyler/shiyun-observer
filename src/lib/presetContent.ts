/**
 * 预制内容库
 * 仅保留从 chinese-poetry 提取出的古典诗句
 */

import { classicalPoemEntries } from './generatedClassicalPoems'

const archivalPoemEntries = [...classicalPoemEntries]
const archivalPoems = archivalPoemEntries.map(entry => entry.text)

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function normalizePoem(text: string): string {
  return text.replace(/[，。！？；：、·\s]/g, '')
}

function createNormalizedPoemSet(poems: readonly string[] = []): Set<string> {
  return new Set(poems.map(poem => normalizePoem(poem)).filter(Boolean))
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

function getResonantPoems(clickedPoems: string[] = [], avoidPoems: string[] = []): string[] {
  if (clickedPoems.length === 0) {
    return []
  }

  const hints = extractHintTokens(clickedPoems)
  const clickedSet = createNormalizedPoemSet(clickedPoems)
  const avoidSet = createNormalizedPoemSet(avoidPoems)

  return archivalPoems.filter(poem => {
    const normalizedPoem = normalizePoem(poem)

    if (clickedSet.has(normalizedPoem) || avoidSet.has(normalizedPoem)) {
      return false
    }

    return hints.some(hint => normalizedPoem.includes(hint))
  })
}

export function findPresetPoemMetadata(
  text: string
): { author?: string; title?: string } | null {
  const normalizedText = normalizePoem(text)
  const match = archivalPoemEntries.find(
    entry => normalizePoem(entry.text) === normalizedText
  )

  if (!match) {
    return null
  }

  return {
    author: match.author || undefined,
    title: match.title || undefined,
  }
}

export function getPresetPoem(
  clickedPoems: string[] = [],
  forceMood: boolean = false,
  avoidPoems: string[] = []
): string {
  const avoidSet = createNormalizedPoemSet(avoidPoems)
  const resonantPoems = getResonantPoems(clickedPoems, avoidPoems)
  const availableArchivalPoems = archivalPoems.filter(poem => !avoidSet.has(normalizePoem(poem)))

  if (resonantPoems.length > 0 && (forceMood || Math.random() < 0.68)) {
    return pick(resonantPoems)
  }

  if (availableArchivalPoems.length > 0) {
    return pick(availableArchivalPoems)
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
  PRESET_RATIO: 0.55,
  llm: {
    interval: 3,
    afterClick: true,
    boostMultiplier: 1.8,
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

  return Math.random() < Math.min(llmProbability, 0.7)
}

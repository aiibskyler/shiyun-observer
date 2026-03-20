import type { LLMConfig } from '../types/game'

/**
 * LLM API 请求体
 */
interface LLMRequest {
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
}

/**
 * LLM 流式响应
 */
export async function* streamLLM(
  config: LLMConfig,
  request: LLMRequest
): AsyncGenerator<string, void, unknown> {
  const { provider, apiKey, baseUrl, model } = config

  if (provider === 'openai' || provider === 'custom') {
    yield* streamOpenAI(apiKey, request, model, baseUrl)
  } else if (provider === 'anthropic') {
    yield* streamAnthropic(apiKey, request, model, baseUrl)
  } else {
    throw new Error(`Unsupported provider: ${provider}`)
  }
}

/**
 * OpenAI 流式响应
 */
async function* streamOpenAI(
  apiKey: string,
  request: LLMRequest,
  model: string = 'gpt-4o-mini',
  baseUrl?: string
): AsyncGenerator<string, void, unknown> {
  let url: string
  if (baseUrl) {
    // 移除尾部斜杠
    const cleanBaseUrl = baseUrl.replace(/\/$/, '')
    // 如果 baseUrl 已经包含 chat/completions，直接使用
    if (cleanBaseUrl.includes('chat/completions')) {
      url = cleanBaseUrl
    } else {
      // 否则添加 /chat/completions
      url = `${cleanBaseUrl}/chat/completions`
    }
  } else {
    url = 'https://api.openai.com/v1/chat/completions'
  }

  // 创建超时控制器（10秒超时）
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
    console.log('[streamOpenAI] Request timeout after 10 seconds')
  }, 10000)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(request.systemPrompt
            ? [{ role: 'system', content: request.systemPrompt }]
            : []),
          { role: 'user', content: request.prompt },
        ],
        max_tokens: request.maxTokens || 500,
        temperature: request.temperature || 0.8,
        stream: true,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No reader')

    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                yield content
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('OpenAI API timeout after 10 seconds')
    }
    throw error
  }
}

/**
 * Anthropic 流式响应
 */
async function* streamAnthropic(
  apiKey: string,
  request: LLMRequest,
  model: string = 'claude-3-haiku-20240307',
  baseUrl?: string
): AsyncGenerator<string, void, unknown> {
  let url: string
  if (baseUrl) {
    // 移除尾部斜杠
    const cleanBaseUrl = baseUrl.replace(/\/$/, '')
    // 如果 baseUrl 已经包含 messages，直接使用
    if (cleanBaseUrl.includes('messages')) {
      url = cleanBaseUrl
    } else {
      // 否则添加 /messages
      url = `${cleanBaseUrl}/messages`
    }
  } else {
    url = 'https://api.anthropic.com/v1/messages'
  }

  // 创建超时控制器（10秒超时）
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
    console.log('[streamAnthropic] Request timeout after 10 seconds')
  }, 10000)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxTokens || 500,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.prompt }],
        stream: true,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No reader')

    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.delta?.text
              if (content) {
                yield content
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Anthropic API timeout after 10 seconds')
    }
    throw error
  }
}

/**
 * 生成诗句提示词
 */
export function generatePoemPrompt(context: {
  clickedPoems: string[]
  theme?: string
}): string {
  const { clickedPoems, theme } = context
  const preferenceContext = buildPreferenceContext(clickedPoems)

  let prompt = '请写一句新的中文短诗，用于漂浮在“诗云”中。\n'

  if (theme) {
    prompt += `- 主题：${theme}\n`
  }

  if (clickedPoems.length > 0) {
    prompt += `- 以下是用户截至当前双击确认的全部诗句，请作为同一人的累计偏好整体吸收，而不是只参考其中一句：\n${preferenceContext.allPoems}\n`
    prompt += `- 从这些累计选择中提炼出的稳定意象/语感：${preferenceContext.motifs}\n`
    prompt += '- 新句子必须延续这些累计偏好，让人能感觉到系统正被用户持续塑形\n'
  }

  prompt += '- 长度 4 到 12 个汉字，最多一行\n'
  prompt += '- 只输出诗句本身，不要解释、标题、引号、序号或多余标点\n'
  prompt += '- 语言要含蓄、具象、冷静，像被雾和月光包住的句子\n'
  prompt += '- 避免鸡汤、口号、说理、社交媒体文案感\n'
  prompt += '- 不要重复示例原句，只借鉴气质\n'
  prompt += '可参考的气质示例：风穿过无声边界、月光停在旧湖面、雾在远处慢慢合拢。\n'
  prompt += '现在只输出一句。'

  return prompt
}

export function generatePoemSystemPrompt(): string {
  return [
    '你是“诗云”的写作引擎，只负责输出一句中文短诗。',
    '你写的是漂浮在宇宙界面中的诗性碎片，不是解释，也不是文案。',
    '必须遵守：',
    '1. 只输出一句诗句，不输出任何说明。',
    '2. 使用中文，长度 4 到 12 个汉字。',
    '3. 风格冷静、克制、带有意象和留白。',
    '4. 禁止出现“这句诗”“用户”“喜欢”“生成”“解释”等元话语。',
    '5. 避免鸡汤、励志、哲理总结、网络流行语。',
    '6. 如果提供了多句历史偏好，必须把它们视为累计审美轨迹，而不是只响应最近一次选择。',
  ].join('\n')
}

export function generateInsightSystemPrompt(): string {
  return [
    '你是“诗云”的意义分析引擎，负责根据对方的选择历史生成一段高密度、强解释力的中文洞察。',
    '这不是普通的性格测试总结，也不是空泛的抒情文案。',
    '你必须把对方点过的诗句当作证据，从意象、语气、句法、留白方式、选择收敛过程里做分析。',
    '请把分析建立在以下框架上：',
    '1. 审美不是静态偏好，而是一个人整个生命经验塑造出的预期结构。',
    '2. 可以借用这样一种思路：越出乎预期的内容，往往携带越高的信息强度。',
    '3. 在审美里，真正击中一个人的，往往不是“最美”的句子，而是刚好穿透其既有预期结构的句子。',
    '4. 同一句诗在不同人生阶段会产生不同信息量，因为人的预期结构在变化。',
    '5. 这场观测不是在发现意义，而是在暴露自己的意义过滤器，并训练系统向那个过滤器偏移。',
    '输出要求：',
    '1. 使用中文。',
    '2. 不要套话，不要鸡汤，不要泛泛夸赞“你很细腻”“你很敏感”。',
    '3. 结论要明确、有锋利度，可以略带哲学冲击。',
    '4. 不要分点，不要写标题，直接写 4 段左右的连续分析。',
    '5. 分析里至少引用 2 句对方选过的诗句作为证据。',
    '6. 重点解释“为什么这些句子会击中你”，而不只是重复它们很美。',
    '7. 最终输出要直接对“你”说话，使用第二人称，不要称呼“用户”“这个人”或“他/她”。',
  ].join('\n')
}

function buildPreferenceContext(clickedPoems: string[]): {
  allPoems: string
  motifs: string
} {
  if (clickedPoems.length === 0) {
    return {
      allPoems: '无',
      motifs: '无',
    }
  }

  const uniquePoems = [...new Set(clickedPoems.map(poem => poem.trim()).filter(Boolean))]
  const allPoems = uniquePoems
    .map((poem, index) => `${index + 1}. ${poem}`)
    .join('\n')

  const normalized = uniquePoems.map(poem => poem.replace(/[，。、！？；：·\s]/g, ''))
  const stopChars = new Set(['的', '了', '在', '着', '和', '与', '把', '更', '里', '中', '仍'])
  const charCounter = new Map<string, number>()
  const bigramCounter = new Map<string, number>()

  normalized.forEach(poem => {
    for (const char of poem) {
      if (stopChars.has(char)) {
        continue
      }

      charCounter.set(char, (charCounter.get(char) || 0) + 1)
    }

    for (let index = 0; index < poem.length - 1; index += 1) {
      const bigram = poem.slice(index, index + 2)
      if ([...bigram].some(char => stopChars.has(char))) {
        continue
      }

      bigramCounter.set(bigram, (bigramCounter.get(bigram) || 0) + 1)
    }
  })

  const rankedChars = [...charCounter.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([char]) => char)

  const rankedBigrams = [...bigramCounter.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([bigram]) => bigram)

  const motifs = [...rankedBigrams, ...rankedChars].slice(0, 8).join('、') || '冷静留白、自然意象'

  return {
    allPoems,
    motifs,
  }
}

/**
 * 生成洞察提示词
 */
export function generateInsightPrompt(userBehavior: {
  clickedPoems: string[]
  totalPoems: number
  clickRate: number
  duration: number
}): string {
  const { clickedPoems, totalPoems, clickRate, duration } = userBehavior
  const preferenceContext = buildPreferenceContext(clickedPoems)
  const clickedPoemsText =
    clickedPoems.length > 0
      ? clickedPoems.map((p, i) => `${i + 1}. ${p}`).join('\n')
      : '无明确点击记录'

  return `你在“诗云”系统中观测了 ${duration} 秒，看到了 ${totalPoems} 句诗，确认喜欢了 ${clickedPoems.length} 句（占比 ${Math.round(clickRate * 100)}%）。

你确认喜欢的诗句：
${clickedPoemsText}

从这些选择里提炼出的稳定意象/语感：
${preferenceContext.motifs}

请写一段真正有解释力的洞察，不要把它写成“你喜欢风、月、夜”这种表面总结，而要深入回答下面这些问题：

1. 这些句子为什么会击中你？
要分析其中的意象密度、情绪温度、句法节奏、距离感、留白方式，以及这些选择如何暴露你的预期结构。

2. 你的审美是如何构建意义的？
要说明你更容易把什么样的句子认作“有意义”：是冷静克制、遥远含混、轻微失重、延迟抵达、还是别的东西。

3. 请引入“信息量/意外性”的视角。
请直接说明“越出乎预期的内容，往往越有信息强度”这一点，并进一步指出：
不是所有陌生内容都会打动你，真正打动你的，是那些既稍微越出预期、又仍能嵌回你生命经验的句子。

4. 请把“人生阶段会改变同一句诗的信息量”这一点说透。
说明你今天被这些句子击中，不只是因为句子本身，而是因为你一路走来的经历、记忆的沉淀、受过的消耗，以及如今看待世界的方式，已经把某些意象变成了高敏感区。

5. 结尾需要完成一次认知转折。
要让分析自然走到这样一个结论：这场观测不只是你在辨认哪些句子属于你，也是你在持续塑造一个会回过头来迎合你的系统。

写作要求：
- 直接输出正文，不要标题，不要列表，不要解释你在做什么。
- 写成 4 段左右，总长度约 450 到 700 字。
- 语言要有思想密度，有文学性，但核心是分析，不是抒情堆砌。
- 可以锋利，但不要空洞刻薄。
- 至少引用 2 句你选过的诗句作为论据。`
}

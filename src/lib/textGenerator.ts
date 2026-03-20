import type { PoemNode, PreferenceProfile } from '../types'

/**
 * 随机字符生成
 */
function randomChars(min: number, max: number): string {
  const chars =
    '的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取举处刑机修'
  const length = Math.floor(Math.random() * (max - min + 1)) + min
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 模板
 */
const templates = [
  '{noun}在{noun}中沉默',
  '{adj}{noun}{verb}',
  '{noun}与{noun}',
  '当{noun}开始{verb}',
  '{adj}的{noun}',
  '{noun}向着{noun}',
]

const nouns = [
  '风',
  '云',
  '光',
  '水',
  '山',
  '树',
  '鸟',
  '星',
  '月',
  '夜',
  '梦',
  '影',
  '心',
  '时间',
  '空间',
]

const adjs = [
  '静默',
  '轻盈',
  '遥远',
  '模糊',
  '清晰',
  '温柔',
  '冰凉',
  '炽热',
  '永恒',
  '瞬间',
]

const verbs = [
  '流动',
  '沉默',
  '闪耀',
  '消逝',
  '升起',
  '坠落',
  '飘荡',
  '凝视',
  '呼吸',
  '苏醒',
]

/**
 * 模板生成
 */
function templateText(): string {
  const template = templates[Math.floor(Math.random() * templates.length)]
  return template
    .replace('{noun}', () => nouns[Math.floor(Math.random() * nouns.length)])
    .replace('{adj}', () => adjs[Math.floor(Math.random() * adjs.length)])
    .replace('{verb}', () => verbs[Math.floor(Math.random() * verbs.length)])
}

/**
 * 生成随机位置
 */
function randomPosition(radius: number = 30) {
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
 * 偏好引导生成
 * 基于用户偏好 tokens 进行加权随机采样
 */
function generateWithPreference(pref: PreferenceProfile): string {
  const tokens = Array.from(pref.tokens.keys())
  const weights = Array.from(pref.tokens.values())

  if (tokens.length === 0) {
    // 如果没有偏好数据，退回到随机生成
    return randomChars(3, 8)
  }

  // 加权随机采样
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  let random = Math.random() * totalWeight
  let selectedToken = tokens[0]

  for (let i = 0; i < tokens.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      selectedToken = tokens[i]
      break
    }
  }

  // 基于选中的 token 生成文本
  const length = Math.floor(Math.random() * 5) + 3
  let result = selectedToken

  // 添加一些随机字符
  for (let i = 1; i < length; i++) {
    const chars =
      '的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取举处刑机修'
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return result
}

/**
 * 生成节点（自动选择生成方式）
 * 调度策略：
 * - 70% 随机
 * - 20% 模板
 * - 10% 偏好引导
 */
export function generateNode(
  source?: PoemNode['source'],
  preference?: PreferenceProfile
): PoemNode {
  const id = Math.random().toString(36).substring(2, 9)
  let text = ''
  let nodeSource: PoemNode['source'] = 'random'

  // 如果没有指定 source，根据调度策略选择
  if (!source) {
    const rand = Math.random()
    if (rand < 0.7) {
      nodeSource = 'random'
      text = randomChars(3, 8)
    } else if (rand < 0.9) {
      nodeSource = 'template'
      text = templateText()
    } else {
      // 偏好引导（需要有偏好数据）
      if (preference && preference.tokens.size > 0) {
        nodeSource = 'llm'
        text = generateWithPreference(preference)
      } else {
        // 退回到随机
        nodeSource = 'random'
        text = randomChars(3, 8)
      }
    }
  } else {
    nodeSource = source
    switch (source) {
      case 'random':
        text = randomChars(3, 8)
        break
      case 'template':
        text = templateText()
        break
      case 'llm':
        if (preference && preference.tokens.size > 0) {
          text = generateWithPreference(preference)
        } else {
          text = randomChars(3, 8)
        }
        break
    }
  }

  return {
    id,
    text,
    position: randomPosition(),
    weight: Math.random() * 0.3, // 初始权重 0-0.3
    liked: false,
    hover: false,
    source: nodeSource,
    createdAt: Date.now(),
  }
}

/**
 * 生成节点（保持向后兼容的旧版本）
 */
export function generateNodeOld(
  source: PoemNode['source'] = 'random'
): PoemNode {
  return generateNode(source, undefined)
}

/**
 * 生成初始节点集
 */
export function generateInitialNodes(count: number = 500): PoemNode[] {
  const nodes: PoemNode[] = []
  for (let i = 0; i < count; i++) {
    // 70% 随机, 30% 模板
    const source = Math.random() < 0.7 ? 'random' : 'template'
    nodes.push(generateNode(source))
  }
  return nodes
}

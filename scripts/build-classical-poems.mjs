import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const SOURCE_DIRECTORIES = [
  '全唐诗',
  '宋词',
  '五代诗词',
  '纳兰性德',
  '楚辞',
  '水墨唐诗',
  '曹操诗集',
  '诗经',
  '元曲',
  '御定全唐詩',
]

const SOURCE_ROOT = path.join(projectRoot, 'chinese-poetry')
const OUTPUT_FILE = path.join(projectRoot, 'src', 'lib', 'generatedClassicalPoems.ts')
const MAX_LINES = 1800

function normalizeLine(line) {
  return line
    .replace(/\s+/g, '')
    .replace(/[“”"《》〈〉「」『』【】\[\]]/g, '')
    .replace(/[。！？；：、]+$/g, '')
    .trim()
}

function isValidLine(line) {
  if (!line) {
    return false
  }

  const compact = line.replace(/[，。！？；：、·]/g, '')

  if (compact.length < 4 || compact.length > 20) {
    return false
  }

  if (!/^[\u3400-\u9fff，。！？；：、·]+$/.test(line)) {
    return false
  }

  if (/[注释序跋凡例目录]/.test(line) && compact.length <= 6) {
    return false
  }

  return true
}

function collectFromNode(node, bucket) {
  if (!node) {
    return
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectFromNode(item, bucket)
    }
    return
  }

  if (typeof node !== 'object') {
    return
  }

  for (const key of ['paragraphs', 'content', 'para']) {
    const value = node[key]
    if (Array.isArray(value)) {
      for (const line of value) {
        if (typeof line !== 'string') {
          continue
        }

        const normalized = normalizeLine(line)
        if (isValidLine(normalized)) {
          bucket.add(normalized)
        }
      }
    }
  }
}

function hashText(text) {
  let hash = 2166136261

  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

async function walkJsonFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue
    }

    const fullPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...await walkJsonFiles(fullPath))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath)
    }
  }

  return files
}

async function main() {
  const collectedLines = new Set()

  for (const relativeDir of SOURCE_DIRECTORIES) {
    const absoluteDir = path.join(SOURCE_ROOT, relativeDir)
    const jsonFiles = await walkJsonFiles(absoluteDir)

    for (const jsonFile of jsonFiles) {
      try {
        const raw = await fs.readFile(jsonFile, 'utf8')
        const parsed = JSON.parse(raw)
        collectFromNode(parsed, collectedLines)
      } catch (error) {
        console.warn(`[build-classical-poems] skipped ${jsonFile}: ${String(error)}`)
      }
    }
  }

  const selectedLines = [...collectedLines]
    .sort((left, right) => hashText(left) - hashText(right))
    .slice(0, MAX_LINES)

  const content = `/**
 * Auto-generated from local chinese-poetry sources.
 * Run \`npm run build:poetry\` to refresh this file.
 */
export const classicalPoemLines = ${JSON.stringify(selectedLines, null, 2)} as const
`

  await fs.writeFile(OUTPUT_FILE, content, 'utf8')

  console.log(`[build-classical-poems] wrote ${selectedLines.length} lines to ${path.relative(projectRoot, OUTPUT_FILE)}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})

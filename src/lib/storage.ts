/**
 * API 配置存储工具
 */

const STORAGE_KEY = 'shiyun-observer-config'

export interface StoredConfig {
  provider: 'openai' | 'anthropic'
  apiKey: string
  baseUrl: string
  model: string
}

/**
 * 保存配置到 localStorage
 */
export function saveConfig(config: StoredConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (error) {
    console.error('Failed to save config:', error)
  }
}

/**
 * 从 localStorage 读取配置
 */
export function loadConfig(): StoredConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const config = JSON.parse(stored) as StoredConfig

    // 验证必需字段
    if (!config.apiKey) return null

    return config
  } catch (error) {
    console.error('Failed to load config:', error)
    return null
  }
}

/**
 * 清除保存的配置
 */
export function clearConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear config:', error)
  }
}

/**
 * 检查是否有保存的配置
 */
export function hasStoredConfig(): boolean {
  return loadConfig() !== null
}

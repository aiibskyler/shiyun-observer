import { useState, useEffect } from 'react'
import { useGameStore } from '../stores/gameStore'
import type { LLMConfig } from '../types/game'
import {
  saveConfig as saveConfigToStorage,
  loadConfig,
  clearConfig,
} from '../lib/storage'
import { CosmicBackdrop } from './CosmicBackdrop'

export function WelcomePage() {
  const startGame = useGameStore(s => s.startGame)
  const setLLMConfig = useGameStore(s => s.setLLMConfig)

  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [isValid, setIsValid] = useState(false)
  const [shouldSaveConfig, setShouldSaveConfig] = useState(true)

  // 加载保存的配置
  useEffect(() => {
    const saved = loadConfig()
    if (saved) {
      setProvider(saved.provider)
      setApiKey(saved.apiKey)
      setBaseUrl(saved.baseUrl || '')
      setModel(saved.model || '')
      setIsValid(saved.apiKey.length > 0)
    }
  }, [])

  const handleStart = () => {
    if (!apiKey.trim()) return

    const config: LLMConfig = {
      provider,
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim() || undefined,
      model: model.trim() || undefined,
    }

    console.log('[WelcomePage] Starting game with config:', {
      provider: config.provider,
      hasApiKey: !!config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
    })

    // 保存配置到本地存储
    if (shouldSaveConfig) {
      saveConfigToStorage({
        provider,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim(),
        model: model.trim(),
      })
    }

    setLLMConfig(config)
    console.log('[WelcomePage] LLM config set')
    startGame()
    console.log('[WelcomePage] Game state reset and set to playing')
  }

  const handleClearConfig = () => {
    clearConfig()
    setProvider('openai')
    setApiKey('')
    setBaseUrl('')
    setModel('')
    setIsValid(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid) {
      handleStart()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        zIndex: 1000,
        padding: '20px',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <CosmicBackdrop variant="welcome" />
      <div
        style={{
          width: 'min(100%, 600px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            padding: 'clamp(22px, 4vw, 36px)',
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* 标题 */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1
              style={{
                color: 'white',
                fontSize: 'clamp(32px, 6vw, 46px)',
                fontWeight: 'bold',
                lineHeight: 1.08,
                margin: '0 0 10px 0',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              观测即意义
            </h1>
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '14px',
                margin: 0,
              }}
            >
              诗云 · 一个关于审美与意义构建的实验
            </p>
          </div>

          {/* 说明 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '10px',
              marginBottom: '20px',
            }}
          >
            {[
              ['悬停阅读', '将鼠标移入诗云，中央浮层会显现诗句'],
              ['双击赋义', '双击你喜欢的节点，让系统记住你的偏好'],
              ['结束观测', '在意义洞察中回看你的选择与审美轨迹'],
            ].map(([title, description]) => (
              <div
                key={title}
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                }}
              >
                <div
                  style={{
                    color: 'rgba(240, 244, 255, 0.92)',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    color: 'rgba(255, 255, 255, 0.62)',
                    fontSize: '12px',
                    lineHeight: 1.55,
                  }}
                >
                  {description}
                </div>
              </div>
            ))}
          </div>

          {/* API Key 输入 */}
          <div style={{ marginBottom: 0 }}>
            <label
              style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px',
                display: 'block',
                marginBottom: '10px',
                fontWeight: '500',
              }}
            >
              选择 AI 模型
            </label>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '14px',
              }}
            >
              <button
                onClick={() => setProvider('openai')}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  background:
                    provider === 'openai'
                      ? 'rgba(99, 102, 241, 0.3)'
                      : 'rgba(255, 255, 255, 0.05)',
                  border:
                    provider === 'openai'
                      ? '2px solid rgba(99, 102, 241, 0.6)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: provider === 'openai' ? '600' : '400',
                }}
              >
                OpenAI
              </button>
              <button
                onClick={() => setProvider('anthropic')}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  background:
                    provider === 'anthropic'
                      ? 'rgba(99, 102, 241, 0.3)'
                      : 'rgba(255, 255, 255, 0.05)',
                  border:
                    provider === 'anthropic'
                      ? '2px solid rgba(99, 102, 241, 0.6)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: provider === 'anthropic' ? '600' : '400',
                }}
              >
                Anthropic
              </button>
            </div>

            <input
              type="password"
              placeholder="输入 API Key"
              autoComplete="off"
              data-form-type="other"
              value={apiKey}
              onChange={e => {
                setApiKey(e.target.value)
                setIsValid(e.target.value.trim().length > 0)
              }}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                padding: '13px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box',
                marginBottom: '10px',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(99, 102, 241, 0.6)'
                e.target.style.background = 'rgba(255, 255, 255, 0.08)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                e.target.style.background = 'rgba(255, 255, 255, 0.05)'
              }}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '10px',
              }}
            >
              <input
                type="text"
                placeholder={`模型（可选，默认：${
                  provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-haiku'
                }）`}
                autoComplete="off"
                value={model}
                onChange={e => setModel(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <input
                type="text"
                placeholder="Base URL（可选）"
                autoComplete="off"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.4)',
                marginTop: '6px',
                marginLeft: '2px',
              }}
            >
              可用于代理或兼容 OpenAI API 的第三方服务
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '14px 16px 16px',
            background: 'rgba(5, 10, 24, 0.72)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            backdropFilter: 'blur(18px)',
            boxShadow: '0 18px 40px -24px rgba(0, 0, 0, 0.7)',
          }}
        >
          {/* 隐私说明 */}
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '12px',
              marginBottom: '12px',
              textAlign: 'center',
            }}
          >
            {shouldSaveConfig ? (
              <>🔒 配置将保存在本地浏览器中</>
            ) : (
              <>🔒 本次使用后不会保存配置</>
            )}
          </div>

          {/* 保存配置选项 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '14px',
              flexWrap: 'wrap',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '13px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={shouldSaveConfig}
                onChange={e => setShouldSaveConfig(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                }}
              />
              记住配置
            </label>

            {apiKey && (
              <button
                onClick={handleClearConfig}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255, 100, 100, 0.1)',
                  border: '1px solid rgba(255, 100, 100, 0.2)',
                  borderRadius: '6px',
                  color: 'rgba(255, 100, 100, 0.8)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 100, 100, 0.2)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 100, 100, 0.1)'
                }}
              >
                清除
              </button>
            )}
          </div>

          {/* 开始按钮 */}
          <button
            onClick={handleStart}
            disabled={!isValid}
            style={{
              width: '100%',
              padding: '15px 16px',
              background: isValid
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '14px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isValid ? 'pointer' : 'not-allowed',
              opacity: isValid ? 1 : 0.5,
              transition: 'all 0.3s',
              boxShadow: isValid
                ? '0 10px 30px -10px rgba(102, 126, 234, 0.5)'
                : 'none',
            }}
            onMouseEnter={e => {
              if (isValid) {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow =
                  '0 15px 35px -10px rgba(102, 126, 234, 0.6)'
              }
            }}
            onMouseLeave={e => {
              if (isValid) {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow =
                  '0 10px 30px -10px rgba(102, 126, 234, 0.5)'
              }
            }}
          >
            开始观测
          </button>
        </div>
      </div>
    </div>
  )
}

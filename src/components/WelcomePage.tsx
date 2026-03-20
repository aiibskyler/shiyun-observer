import { useState, useEffect } from 'react'
import { useGameStore } from '../stores/gameStore'
import type { LLMConfig } from '../types/game'
import {
  saveConfig as saveConfigToStorage,
  loadConfig,
  clearConfig,
} from '../lib/storage'

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
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          width: '90%',
          padding: '48px',
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1
            style={{
              color: 'white',
              fontSize: '48px',
              fontWeight: 'bold',
              margin: '0 0 16px 0',
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
              fontSize: '16px',
              margin: 0,
            }}
          >
            诗云 · 一个关于审美与意义构建的实验
          </p>
        </div>

        {/* 说明 */}
        <div
          style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '14px',
            lineHeight: '1.8',
            marginBottom: '32px',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
          }}
        >
          <p style={{ margin: '0 0 8px 0' }}>
            🌸 <strong>玩法：</strong>
          </p>
          <p style={{ margin: '0 0 8px' }}>
            诗句会从虚空中浮现，短暂停留后消散
          </p>
          <p style={{ margin: '0 0 8px' }}>
            点击你喜欢的诗句，让 AI 了解你的品味
          </p>
          <p style={{ margin: '0' }}>
            最后，AI 将为你生成一份专属的意义洞察报告
          </p>
        </div>

        {/* API Key 输入 */}
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '14px',
              display: 'block',
              marginBottom: '12px',
              fontWeight: '500',
            }}
          >
            选择 AI 模型
          </label>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <button
              onClick={() => setProvider('openai')}
              style={{
                flex: 1,
                padding: '12px 20px',
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
              OpenAI (GPT-4)
            </button>
            <button
              onClick={() => setProvider('anthropic')}
              style={{
                flex: 1,
                padding: '12px 20px',
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
              Anthropic (Claude)
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
              padding: '14px 18px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s',
              boxSizing: 'border-box',
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

          {/* 可选：自定义模型 */}
          <div style={{ marginTop: '12px' }}>
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
                padding: '12px 18px',
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

          {/* 可选：自定义 baseUrl */}
          <div style={{ marginTop: '12px' }}>
            <input
              type="text"
              placeholder={`Base URL（可选，用于代理或第三方服务）`}
              autoComplete="off"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 18px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div
              style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.4)',
                marginTop: '6px',
                marginLeft: '2px',
              }}
            >
              例如：https://api.openai-proxy.com 或兼容 OpenAI API 的第三方服务
            </div>
          </div>
        </div>

        {/* 隐私说明 */}
        <div
          style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '12px',
            marginBottom: '16px',
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
            marginBottom: '16px',
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
            padding: '16px',
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
  )
}

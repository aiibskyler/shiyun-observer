import { useEffect, useState, useRef } from 'react'
import { useGameStore } from '../stores/gameStore'
import { streamLLM, generateInsightPrompt, generateInsightSystemPrompt } from '../lib/llm'
import { CosmicBackdrop } from './CosmicBackdrop'

export function AnalysisPage() {
  const {
    llmConfig,
    poems,
    likedPoems,
    currentStep,
    currentInsight,
    updateCurrentInsight,
    reset,
  } = useGameStore()
  const totalGenerated = Math.max(currentStep, poems.length)

  const [isStreaming, setIsStreaming] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mounted = true

    updateCurrentInsight('')
    setError(null)
    setIsStreaming(true)

    const generateInsight = async () => {
      if (!llmConfig) return

      const clickedPoems = likedPoems
      const totalPoems = totalGenerated
      const clickRate = clickedPoems.length / Math.max(totalPoems, 1)
      const duration = Math.floor(
        (Date.now() - useGameStore.getState().startTime) / 1000
      )

      const prompt = generateInsightPrompt({
        clickedPoems,
        totalPoems,
        clickRate,
        duration,
      })

      try {
        let fullText = ''
        for await (const chunk of streamLLM(llmConfig, {
          prompt,
          systemPrompt: generateInsightSystemPrompt(),
          maxTokens: 8192,
        })) {
          if (!mounted) return
          fullText += chunk
          updateCurrentInsight(fullText)
        }
        setIsStreaming(false)
      } catch (err) {
        if (!mounted) return
        console.error('Failed to generate insight:', err)
        setError('生成洞察时出错，请检查 API Key 是否正确')
        setIsStreaming(false)
      }
    }

    generateInsight()

    return () => {
      mounted = false
    }
  }, [likedPoems, llmConfig, poems, totalGenerated, updateCurrentInsight])

  const handleRestart = () => {
    reset()
  }

  return (
    <div
      ref={containerRef}
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
        padding: '20px',
        fontFamily: 'sans-serif',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      <CosmicBackdrop variant="analysis" />
      <div
        style={{
          maxWidth: '1120px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          background: 'rgba(20, 20, 35, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '48px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* 标题 */}
        <div style={{ marginBottom: '32px' }}>
          <h2
            style={{
              color: 'white',
              fontSize: '32px',
              fontWeight: 'bold',
              margin: '0 0 12px 0',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            意义洞察
          </h2>
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '14px',
              margin: 0,
            }}
          >
            AI 对你的审美与意义构建的深度分析
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '28px',
            alignItems: 'start',
          }}
        >
          <div
            style={{
              padding: '24px',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '18px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '18px',
              }}
            >
              <div>
                <div
                  style={{
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                >
                  你喜欢过的诗句
                </div>
                <div
                  style={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '13px',
                  }}
                >
                  本轮观测中被你确认过的全部选择
                </div>
              </div>
              <div
                style={{
                  color: '#c7d8ff',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {likedPoems.length} 句
              </div>
            </div>

            {likedPoems.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gap: '10px',
                  maxHeight: '540px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {likedPoems.map((poem, index) => (
                  <div
                    key={`${poem}-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      background: 'rgba(102, 126, 234, 0.08)',
                      border: '1px solid rgba(148, 163, 255, 0.16)',
                      borderRadius: '14px',
                    }}
                  >
                    <div
                      style={{
                        color: 'rgba(199, 216, 255, 0.9)',
                        fontSize: '12px',
                        lineHeight: 1.8,
                        minWidth: '28px',
                      }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div
                      style={{
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '15px',
                        lineHeight: 1.8,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {poem}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.45)',
                  fontSize: '14px',
                  lineHeight: 1.7,
                }}
              >
                这一轮你还没有确认过诗句，所以系统只能根据浏览行为生成较弱的洞察。
              </div>
            )}
          </div>

          <div>
        {/* 加载状态 */}
        {isStreaming && !error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(102, 126, 234, 0.3)',
                borderTopColor: '#667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            正在生成洞察...
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div
            style={{
              padding: '16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              color: '#fca5a5',
              fontSize: '14px',
              marginBottom: '24px',
            }}
          >
            {error}
          </div>
        )}

        {/* 洞察内容 */}
        <div
          style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '16px',
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap',
            paddingBottom: '32px',
          }}
        >
          {currentInsight || (isStreaming ? '正在思考...' : '')}
          {isStreaming && currentInsight && (
            <span
              style={{
                display: 'inline-block',
                width: '2px',
                height: '1em',
                background: '#667eea',
                marginLeft: '2px',
                animation: 'blink 1s infinite',
              }}
            />
          )}
        </div>

        {/* 统计卡片 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <StatCard label="生成诗句" value={totalGenerated} unit="句" />
          <StatCard
            label="点击喜欢"
            value={likedPoems.length}
            unit="句"
          />
          <StatCard
            label={`${Math.round((likedPoems.length / Math.max(poems.length, 1)) * 100)}%`}
            value={likedPoems.length}
            unit=""
          />
        </div>

        {/* 重新开始按钮 */}
        <button
          onClick={handleRestart}
          disabled={isStreaming}
          style={{
            width: '100%',
            padding: '16px',
            background: isStreaming
              ? 'rgba(255, 255, 255, 0.05)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '14px',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isStreaming ? 'not-allowed' : 'pointer',
            opacity: isStreaming ? 0.5 : 1,
            transition: 'all 0.3s',
          }}
        >
          重新开始
        </button>
          </div>
        </div>
      </div>

      {/* 动画样式 */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  unit: string
}

function StatCard({ label, value, unit }: StatCardProps) {
  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div
        style={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '12px',
          marginBottom: '8px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: 'white',
          fontSize: '28px',
          fontWeight: 'bold',
        }}
      >
        {value}
        <span
          style={{
            fontSize: '14px',
            marginLeft: '4px',
            fontWeight: 'normal',
            opacity: 0.6,
          }}
        >
          {unit}
        </span>
      </div>
    </div>
  )
}

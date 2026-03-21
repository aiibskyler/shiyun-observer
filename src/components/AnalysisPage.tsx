import { useEffect, useRef, useState } from 'react'
import type { LikedPoemRecord } from '../types/game'
import { useGameStore } from '../stores/gameStore'
import {
  streamLLM,
  generateInsightPrompt,
  generateInsightSystemPrompt,
} from '../lib/llm'
import { CosmicBackdrop } from './CosmicBackdrop'

function formatDisplayedPoem(text: string): string {
  return text.replace(/\s*\n+\s*/g, '，').trim()
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = []
  const paragraphs = text.split('\n').filter(Boolean)

  paragraphs.forEach(paragraph => {
    let currentLine = ''

    for (const char of paragraph) {
      const nextLine = `${currentLine}${char}`
      if (currentLine && context.measureText(nextLine).width > maxWidth) {
        lines.push(currentLine)
        currentLine = char
      } else {
        currentLine = nextLine
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }

    lines.push('')
  })

  if (lines[lines.length - 1] === '') {
    lines.pop()
  }

  return lines
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  startY: number,
  lineHeight: number
): void {
  lines.forEach((line, index) => {
    context.fillText(line || ' ', x, startY + index * lineHeight)
  })
}

async function buildShareImage(options: {
  likedPoemRecords: LikedPoemRecord[]
  insight: string
  totalGenerated: number
  totalLiked: number
}): Promise<Blob> {
  const measureCanvas = document.createElement('canvas')
  const measureContext = measureCanvas.getContext('2d')
  if (!measureContext) {
    throw new Error('Canvas not supported')
  }

  const canvasWidth = 1080
  const cardX = 84
  const cardWidth = 912
  const textX = 120
  const textWidth = 820
  const likedLineHeight = 42
  const insightLineHeight = 44

  const likedText =
    options.likedPoemRecords.length > 0
      ? options.likedPoemRecords
          .map((poem, index) => {
            const attribution =
              poem.author || poem.title
                ? `\n   ${poem.author ?? ''}${poem.author && poem.title ? '《' : ''}${poem.title ?? ''}${poem.title ? '》' : ''}`
                : ''
            return `${index + 1}. ${formatDisplayedPoem(poem.text)}${attribution}`
          })
          .join('\n')
      : '\u8fd9\u4e00\u8f6e\u4f60\u8fd8\u6ca1\u6709\u786e\u8ba4\u559c\u6b22\u7684\u8bd7\u53e5\u3002'

  measureContext.font = '34px "Songti SC", "STSong", serif'
  const likedLines = wrapCanvasText(measureContext, likedText, textWidth)

  measureContext.font = '32px "Microsoft YaHei UI", "PingFang SC", sans-serif'
  const insightLines = wrapCanvasText(
    measureContext,
    options.insight.trim(),
    textWidth
  )

  const likedSectionTop = 474
  const likedSectionHeight = Math.max(372, 134 + likedLines.length * likedLineHeight)
  const insightSectionTop = likedSectionTop + likedSectionHeight + 40
  const insightSectionHeight = Math.max(
    530,
    142 + insightLines.length * insightLineHeight
  )
  const footerY = insightSectionTop + insightSectionHeight + 76
  const canvasHeight = Math.max(1600, footerY + 60)

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas not supported')
  }

  const gradient = context.createLinearGradient(0, 0, canvasWidth, canvasHeight)
  gradient.addColorStop(0, '#071224')
  gradient.addColorStop(0.55, '#101a37')
  gradient.addColorStop(1, '#030712')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.fillStyle = 'rgba(152, 193, 255, 0.08)'
  context.beginPath()
  context.arc(180, 220, 180, 0, Math.PI * 2)
  context.fill()
  context.beginPath()
  context.arc(920, 340, 220, 0, Math.PI * 2)
  context.fill()
  context.beginPath()
  context.arc(840, canvasHeight - 280, 260, 0, Math.PI * 2)
  context.fill()

  context.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  context.lineWidth = 2
  context.strokeRect(56, 56, 968, canvasHeight - 112)

  context.fillStyle = '#f5f7ff'
  context.font = '700 64px "Microsoft YaHei UI", "PingFang SC", sans-serif'
  context.fillText('\u89c2\u6d4b\u5373\u610f\u4e49', 96, 148)

  context.fillStyle = 'rgba(216, 227, 255, 0.72)'
  context.font = '28px "Microsoft YaHei UI", "PingFang SC", sans-serif'
  context.fillText('Shiyun Observer \u00b7 \u610f\u4e49\u6d1e\u5bdf\u5206\u4eab', 96, 198)

  context.fillStyle = 'rgba(12, 18, 36, 0.82)'
  context.fillRect(cardX, 252, cardWidth, 186)
  context.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  context.strokeRect(cardX, 252, cardWidth, 186)

  const stats = [
    ['\u751f\u6210\u8bd7\u53e5', String(options.totalGenerated)],
    ['\u786e\u8ba4\u559c\u6b22', String(options.totalLiked)],
    [
      '\u504f\u597d\u7387',
      `${Math.round((options.totalLiked / Math.max(options.totalGenerated, 1)) * 100)}%`,
    ],
  ]

  stats.forEach(([label, value], index) => {
    const x = 124 + index * 292
    context.fillStyle = 'rgba(207, 220, 255, 0.68)'
    context.font = '26px "Microsoft YaHei UI", "PingFang SC", sans-serif'
    context.fillText(label, x, 316)
    context.fillStyle = '#ffffff'
    context.font = '700 62px Georgia, serif'
    context.fillText(value, x, 394)
  })

  context.fillStyle = 'rgba(12, 18, 36, 0.82)'
  context.fillRect(cardX, likedSectionTop, cardWidth, likedSectionHeight)
  context.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  context.strokeRect(cardX, likedSectionTop, cardWidth, likedSectionHeight)
  context.fillStyle = '#d8e4ff'
  context.font = '600 34px "Microsoft YaHei UI", "PingFang SC", sans-serif'
  context.fillText('\u6211\u786e\u8ba4\u559c\u6b22\u7684\u8bd7\u53e5', textX, likedSectionTop + 60)

  context.fillStyle = 'rgba(244, 247, 255, 0.92)'
  context.font = '34px "Songti SC", "STSong", serif'
  drawWrappedText(context, likedLines, textX, likedSectionTop + 134, likedLineHeight)

  context.fillStyle = 'rgba(12, 18, 36, 0.82)'
  context.fillRect(cardX, insightSectionTop, cardWidth, insightSectionHeight)
  context.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  context.strokeRect(cardX, insightSectionTop, cardWidth, insightSectionHeight)
  context.fillStyle = '#d8e4ff'
  context.font = '600 34px "Microsoft YaHei UI", "PingFang SC", sans-serif'
  context.fillText('AI \u6d1e\u5bdf\u6458\u5f55', textX, insightSectionTop + 60)

  context.fillStyle = 'rgba(244, 247, 255, 0.92)'
  context.font = '32px "Microsoft YaHei UI", "PingFang SC", sans-serif'
  drawWrappedText(
    context,
    insightLines,
    textX,
    insightSectionTop + 142,
    insightLineHeight
  )

  context.fillStyle = 'rgba(216, 227, 255, 0.6)'
  context.font = '26px "Microsoft YaHei UI", "PingFang SC", sans-serif'
  context.fillText('\u6765\u81ea \u89c2\u6d4b\u5373\u610f\u4e49 \u00b7 Shiyun Observer', 84, footerY)

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/png')
  )

  if (!blob) {
    throw new Error('Failed to export image')
  }

  return blob
}

export function AnalysisPage() {
  const {
    llmConfig,
    poems,
    likedPoems,
    likedPoemRecords,
    currentStep,
    currentInsight,
    updateCurrentInsight,
    reset,
  } = useGameStore()
  const totalGenerated = Math.max(currentStep, poems.length)

  const [isStreaming, setIsStreaming] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)
  const [isSavingImage, setIsSavingImage] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)')
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
    }

    setIsMobile(media.matches)

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }

    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [])

  useEffect(() => {
    let mounted = true

    updateCurrentInsight('')
    setError(null)
    setIsStreaming(true)

    const generateInsight = async () => {
      if (!llmConfig) {
        return
      }

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
          if (!mounted) {
            return
          }
          fullText += chunk
          updateCurrentInsight(fullText)
        }
        setIsStreaming(false)
      } catch (err) {
        if (!mounted) {
          return
        }
        console.error('Failed to generate insight:', err)
        setError('生成洞察时出错，请检查 API Key 是否正确')
        setIsStreaming(false)
      }
    }

    generateInsight()

    return () => {
      mounted = false
    }
  }, [likedPoems, llmConfig, poems, retryNonce, totalGenerated, updateCurrentInsight])

  const handleRestart = () => {
    reset()
  }

  const handleRetry = () => {
    if (isStreaming) {
      return
    }

    updateCurrentInsight('')
    setError(null)
    setIsStreaming(true)
    setRetryNonce(value => value + 1)
  }

  const handleSaveImage = async () => {
    if (isStreaming || !currentInsight.trim()) {
      return
    }

    try {
      setIsSavingImage(true)
      const blob = await buildShareImage({
        likedPoemRecords,
        insight: currentInsight,
        totalGenerated,
        totalLiked: likedPoems.length,
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `shiyun-observer-${Date.now()}.png`
      link.click()
      URL.revokeObjectURL(url)
    } catch (saveError) {
      console.error('Failed to save image:', saveError)
      window.alert('保存图片失败，请稍后再试')
    } finally {
      setIsSavingImage(false)
    }
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
        minHeight: '100dvh',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding:
          'max(14px, env(safe-area-inset-top)) 14px max(14px, env(safe-area-inset-bottom))',
        fontFamily: 'sans-serif',
        zIndex: 1000,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <CosmicBackdrop variant="analysis" />
      <div
        style={{
          maxWidth: '1120px',
          width: '100%',
          margin: 'auto 0',
          maxHeight: isMobile ? 'none' : '80vh',
          overflow: isMobile ? 'visible' : 'auto',
          background: 'rgba(20, 20, 35, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: isMobile ? '16px' : '24px',
          padding: isMobile ? '20px 16px' : '48px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ marginBottom: '32px' }}>
          <h2
            style={{
              color: 'white',
              fontSize: isMobile ? '24px' : '32px',
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
            AI 对你的审美与意义建构的深度分析
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: isMobile ? '16px' : '28px',
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
                  maxHeight: isMobile ? 'none' : '540px',
                  overflowY: isMobile ? 'visible' : 'auto',
                  paddingRight: '4px',
                }}
              >
                {likedPoemRecords.map((poem, index) => (
                  <div
                    key={`${poem.text}-${index}`}
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
                        whiteSpace: 'normal',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: '15px',
                            lineHeight: 1.8,
                            whiteSpace: 'normal',
                          }}
                        >
                          {formatDisplayedPoem(poem.text)}
                        </div>
                        {(poem.author || poem.title) && (
                          <div
                            style={{
                              marginTop: '4px',
                              color: 'rgba(199, 216, 255, 0.64)',
                              fontSize: '12px',
                              lineHeight: 1.6,
                            }}
                          >
                            {poem.author ?? ''}
                            {poem.author && poem.title ? '《' : ''}
                            {poem.title ?? ''}
                            {poem.title ? '》' : ''}
                          </div>
                        )}
                      </div>
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
                这一轮你还没有确认喜欢的诗句，所以系统只能根据浏览行为生成较弱的洞察。
              </div>
            )}
          </div>

          <div>
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
                <div style={{ marginBottom: '14px' }}>{error}</div>
                <button
                  onClick={handleRetry}
                  disabled={isStreaming}
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isStreaming ? 'not-allowed' : 'pointer',
                    opacity: isStreaming ? 0.5 : 1,
                  }}
                >
                  重试生成
                </button>
              </div>
            )}

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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px',
                marginBottom: '32px',
              }}
            >
              <StatCard label="生成诗句" value={totalGenerated} unit="句" />
              <StatCard label="确认喜欢" value={likedPoems.length} unit="句" />
              <StatCard
                label="偏好率"
                value={Math.round((likedPoems.length / Math.max(poems.length, 1)) * 100)}
                unit="%"
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                gap: '12px',
              }}
            >
              <button
                onClick={handleSaveImage}
                disabled={isStreaming || isSavingImage || !currentInsight.trim()}
                style={{
                  width: '100%',
                  padding: '16px',
                  background:
                    isStreaming || isSavingImage || !currentInsight.trim()
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '14px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor:
                    isStreaming || isSavingImage || !currentInsight.trim()
                      ? 'not-allowed'
                      : 'pointer',
                  opacity: isStreaming || isSavingImage || !currentInsight.trim() ? 0.5 : 1,
                  transition: 'all 0.3s',
                }}
              >
                {isSavingImage ? '保存中...' : '保存图片'}
              </button>

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
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
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

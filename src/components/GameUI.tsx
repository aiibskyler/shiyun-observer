import { useGameStore } from '../stores/gameStore'
import { useEffect, useState } from 'react'

function getStatusMessage(totalPoems: number, clickedCount: number, llmCount: number): string {
  if (clickedCount === 0) {
    return '把鼠标移向诗云，双击一个节点，让意义开始偏转'
  }

  if (clickedCount < 3) {
    return '你正在塑造意义，星群开始记住你的偏好'
  }

  if (llmCount > 0 && clickedCount < 6) {
    return '系统正在学习你的凝视方式'
  }

  if (totalPoems > 12) {
    return '意义密度正在上升，噪声开始让位于回响'
  }

  return '宇宙在安静地向你的选择靠拢'
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function getDriftProgress(totalPoems: number, clickedCount: number): number {
  if (clickedCount <= 0) {
    return 0
  }

  const likedCountFactor = clamp01(clickedCount / 12)
  const likedRatioFactor = clamp01(clickedCount / Math.max(totalPoems, 1))
  const driftScore = likedCountFactor * 0.68 + likedRatioFactor * 0.32

  return Math.round(driftScore * 100)
}

export function GameUI() {
  const { poems, likedPoems, currentStep, totalSteps, endGame, reset } = useGameStore()
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

  const generationProgress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0
  const totalPoems = currentStep
  const clickedCount = likedPoems.length
  const llmCount = poems.filter(p => p.source === 'llm').length
  const presetCount = poems.filter(p => p.source === 'template').length
  const statusMessage = getStatusMessage(totalPoems, clickedCount, llmCount)
  const driftProgress = getDriftProgress(totalPoems, clickedCount)

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 14,
          background: `
            radial-gradient(circle at 20% 18%, rgba(132, 188, 255, 0.16), transparent 28%),
            radial-gradient(circle at 78% 12%, rgba(255, 225, 160, 0.14), transparent 24%),
            radial-gradient(circle at 50% 88%, rgba(95, 124, 255, 0.15), transparent 30%),
            linear-gradient(180deg, rgba(2, 5, 15, 0.18) 0%, rgba(2, 5, 15, 0.42) 100%)
          `,
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: isMobile ? 'max(0px, env(safe-area-inset-top))' : '22px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: isMobile ? 'calc(100vw - 20px)' : 'min(1100px, calc(100vw - 40px))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexDirection: 'row',
          gap: isMobile ? '8px' : '18px',
          zIndex: 20,
          pointerEvents: isMobile ? 'auto' : 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: isMobile ? '8px 12px' : '12px 18px',
            borderRadius: '999px',
            background: 'rgba(7, 12, 28, 0.58)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 18px 60px rgba(0, 0, 0, 0.28)',
            backdropFilter: 'blur(18px)',
          }}
        >
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'linear-gradient(180deg, #f7f1c5 0%, #8bc6ff 100%)',
              boxShadow: '0 0 18px rgba(147, 208, 255, 0.9)',
              animation: 'softPulse 2.1s ease-in-out infinite',
            }}
          />
          <span
            style={{
              color: 'rgba(240, 246, 255, 0.96)',
              fontSize: isMobile ? '11px' : '13px',
              letterSpacing: '0.12em',
              fontFamily: '"Microsoft YaHei UI", "PingFang SC", sans-serif',
            }}
          >
            观测中
          </span>
        </div>

        {!isMobile && (
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: '14px 22px',
              borderRadius: '999px',
              background: 'rgba(7, 12, 28, 0.52)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(16px)',
              color: 'rgba(224, 233, 246, 0.9)',
              fontSize: '13px',
              textAlign: 'center',
              letterSpacing: '0.08em',
              fontFamily: '"Songti SC", "STSong", serif',
              boxShadow: '0 18px 55px rgba(0, 0, 0, 0.24)',
            }}
          >
            {statusMessage}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '8px' : '10px',
            pointerEvents: 'auto',
            width: 'auto',
          }}
        >
          <button
            onClick={reset}
            style={{
              padding: isMobile ? '8px 12px' : '12px 18px',
              borderRadius: '999px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(8, 14, 31, 0.52)',
              color: 'rgba(225, 233, 246, 0.88)',
              fontSize: isMobile ? '11px' : '13px',
              cursor: 'pointer',
              backdropFilter: 'blur(14px)',
            }}
          >
            重置
          </button>
          <button
            onClick={endGame}
            style={{
              padding: isMobile ? '8px 12px' : '12px 18px',
              borderRadius: '999px',
              border: '1px solid rgba(255, 234, 188, 0.35)',
              background: 'linear-gradient(135deg, rgba(255, 245, 214, 0.18) 0%, rgba(129, 176, 255, 0.18) 100%)',
              color: 'rgba(255, 249, 233, 0.96)',
              fontSize: isMobile ? '11px' : '13px',
              cursor: 'pointer',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 12px 38px rgba(81, 122, 255, 0.18)',
            }}
          >
            结束观测
          </button>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          top: isMobile ? 'max(42px, calc(env(safe-area-inset-top) + 42px))' : '86px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: isMobile ? 'calc(100vw - 24px)' : 'min(560px, calc(100vw - 48px))',
          zIndex: isMobile ? 21 : 19,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            height: '8px',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 18px rgba(255, 255, 255, 0.04)',
          }}
        >
            <div
              style={{
                width: `${driftProgress}%`,
                height: '100%',
                borderRadius: '999px',
                background: 'linear-gradient(90deg, #9fd1ff 0%, #fff0b8 48%, #77a7ff 100%)',
              boxShadow: '0 0 22px rgba(165, 208, 255, 0.7)',
              transition: 'width 0.6s ease',
            }}
          />
        </div>
      </div>

      {isMobile && (
        <div
          style={{
            position: 'fixed',
            top: 'max(56px, calc(env(safe-area-inset-top) + 56px))',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100vw - 20px)',
            zIndex: 20,
            pointerEvents: 'none',
            padding: '8px 12px',
            borderRadius: '999px',
            background: 'rgba(7, 12, 28, 0.52)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(16px)',
            color: 'rgba(224, 233, 246, 0.9)',
            fontSize: '11px',
            textAlign: 'center',
            letterSpacing: '0.03em',
            fontFamily: '"Songti SC", "STSong", serif',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.2)',
          }}
        >
          {statusMessage}
        </div>
      )}

      <div
        style={{
          position: 'fixed',
          bottom: isMobile ? 'max(12px, env(safe-area-inset-bottom))' : '26px',
          left: isMobile ? '50%' : '26px',
          transform: isMobile ? 'translateX(-50%)' : 'none',
          width: isMobile ? 'calc(100vw - 24px)' : 'min(360px, calc(100vw - 52px))',
          maxWidth: isMobile ? '420px' : 'none',
          padding: isMobile ? '14px' : '18px 20px',
          borderRadius: isMobile ? '16px' : '22px',
          background: 'rgba(6, 10, 24, 0.52)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.3)',
          color: 'rgba(223, 232, 245, 0.88)',
          zIndex: 20,
          backdropFilter: 'blur(18px)',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: isMobile ? '11px' : '12px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(156, 176, 210, 0.8)',
            marginBottom: '12px',
            fontFamily: '"Microsoft YaHei UI", "PingFang SC", sans-serif',
          }}
        >
          Meaning Field
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: isMobile ? '8px' : '10px',
          }}
        >
          {[
            ['已生成', String(totalPoems).padStart(2, '0')],
            ['已赋义', String(clickedCount).padStart(2, '0')],
            ['AI 漂移', `${driftProgress}%`],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                padding: isMobile ? '10px 8px' : '12px 10px',
                borderRadius: isMobile ? '12px' : '16px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div
                style={{
                  fontSize: isMobile ? '10px' : '11px',
                  color: 'rgba(168, 182, 210, 0.74)',
                  marginBottom: '8px',
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: isMobile ? '18px' : '24px',
                  color: '#f4f7ff',
                  fontFamily: '"Georgia", "Times New Roman", serif',
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: '14px',
            fontSize: isMobile ? '11px' : '12px',
            lineHeight: 1.7,
            color: 'rgba(190, 204, 230, 0.82)',
            fontFamily: '"Songti SC", "STSong", serif',
          }}
        >
          诗意来处：LLM {llmCount} · 诗库回响 {presetCount} · 生成进度 {Math.round(generationProgress)}%
        </div>
      </div>
    </>
  )
}

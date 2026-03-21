import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useGameStore } from '../stores/gameStore'

type ProgressBurst = {
  id: number
  x: number
  y: number
  targetX: number
  targetY: number
}

function pickStatusMessage(messages: string[], seed: number): string {
  return messages[Math.abs(seed) % messages.length]
}

function getStatusMessage(totalPoems: number, clickedCount: number, llmCount: number): string {
  if (clickedCount === 0) {
    return pickStatusMessage(
      [
        '把鼠标移向诗云，双击一个节点，让意义开始偏转',
        '先停在一朵诗云前，看看哪一句先把你叫住',
        '别急着解释自己，先让一句诗替你作出选择',
        '在这片云层里犹豫，本身就是意义形成的一部分',
        '先去碰一碰那些发亮的句子，系统会记住你的停顿',
      ],
      totalPoems
    )
  }

  if (clickedCount < 3) {
    return pickStatusMessage(
      [
        '你正在塑造意义，星群开始记住你的偏好',
        '最初的几次确认，正在悄悄改变诗云的航线',
        '系统还在摸索你偏向哪一种回声',
        '每一次双击都像一次轻微校准，场域正在向你靠近',
        '你给出的不是答案，而是诗云继续生长的方向',
      ],
      clickedCount + totalPoems
    )
  }

  if (llmCount > 0 && clickedCount < 6) {
    return pickStatusMessage(
      [
        '系统正在学习你的凝视方式',
        '新的句子开始带着你的偏好返回',
        '诗云已经不再随机，它开始试探性地回应你',
        '你的选择正在渗进生成逻辑，回声开始变得私人',
        '此刻出现的句子，已经有一部分在向你靠拢',
      ],
      llmCount + clickedCount
    )
  }

  if (totalPoems > 18 && clickedCount > 6) {
    return pickStatusMessage(
      [
        '意义密度正在上升，整片场域开始出现你的轮廓',
        '你不是在挑选句子，而是在训练一句句诗如何接近你',
        '系统已经学会一部分你偏爱的沉默方式',
        '越来越多的诗句开始携带同一种暗色的吸引力',
        '这片诗云正在从公共语言缓慢收缩成你的语言',
      ],
      totalPoems + clickedCount + llmCount
    )
  }

  return pickStatusMessage(
    [
      '宇宙在安静地向你的选择偏移',
      '诗云仍在漂移，但它已经不是最初那片云',
      '你留下的每一次确认，都在改变下一句抵达的方式',
      '某种更私人的秩序，正在这些句子之间慢慢成形',
      '你所偏爱的，不只是句子本身，还有它们靠近你的角度',
    ],
    totalPoems * 3 + clickedCount + llmCount
  )
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
  const [progressBursts, setProgressBursts] = useState<ProgressBurst[]>([])

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
    const handleMeaningTransfer = (event: Event) => {
      const customEvent = event as CustomEvent<{ x: number; y: number }>
      const burst = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        x: customEvent.detail.x,
        y: customEvent.detail.y,
        targetX: window.innerWidth / 2,
        targetY: isMobile ? 46 : 90,
      }

      setProgressBursts(current => [...current, burst])
      window.setTimeout(() => {
        setProgressBursts(current => current.filter(item => item.id !== burst.id))
      }, 950)
    }

    window.addEventListener('meaning-transfer', handleMeaningTransfer)
    return () => window.removeEventListener('meaning-transfer', handleMeaningTransfer)
  }, [isMobile])

  const generationProgress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0
  const totalPoems = currentStep
  const clickedCount = likedPoems.length
  const llmCount = poems.filter(p => p.source === 'llm').length
  const presetCount = poems.filter(p => p.source === 'template').length
  const statusMessage = getStatusMessage(totalPoems, clickedCount, llmCount)
  const driftProgress = getDriftProgress(totalPoems, clickedCount)

  return (
    <>
      {progressBursts.map(burst => (
        <div
          key={burst.id}
          style={{
            position: 'fixed',
            left: `${burst.x}px`,
            top: `${burst.y}px`,
            width: '14px',
            height: '14px',
            borderRadius: '999px',
            zIndex: 26,
            pointerEvents: 'none',
            background:
              'radial-gradient(circle, rgba(255, 244, 186, 1) 0%, rgba(150, 212, 255, 0.92) 52%, rgba(150, 212, 255, 0) 100%)',
            boxShadow: '0 0 22px rgba(162, 214, 255, 0.95)',
            transform: 'translate(-50%, -50%)',
            animation: 'meaningTransfer 900ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
            ['--travel-x' as string]: `${burst.targetX - burst.x}px`,
            ['--travel-y' as string]: `${burst.targetY - burst.y}px`,
          } as CSSProperties}
        />
      ))}

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
              background:
                'linear-gradient(135deg, rgba(255, 245, 214, 0.18) 0%, rgba(129, 176, 255, 0.18) 100%)',
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

      <style>{`
        @keyframes meaningTransfer {
          0% {
            transform: translate(-50%, -50%) scale(0.7);
            opacity: 0;
          }
          18% {
            opacity: 1;
          }
          78% {
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--travel-x)), calc(-50% + var(--travel-y))) scale(0.18);
            opacity: 0;
          }
        }
      `}</style>
    </>
  )
}

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useGameStore } from '../stores/gameStore'

const STATUS_ROTATION_INTERVAL = 6800

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

function getStatusMessages(totalPoems: number, clickedCount: number, llmCount: number): string[] {
  if (clickedCount === 0) {
    return [
      '\u628a\u9f20\u6807\u79fb\u5411\u8bd7\u4e91\uff0c\u53cc\u51fb\u4e00\u4e2a\u8282\u70b9\uff0c\u8ba9\u610f\u4e49\u5f00\u59cb\u504f\u8f6c',
      '\u5148\u505c\u5728\u4e00\u6735\u8bd7\u4e91\u524d\uff0c\u770b\u770b\u54ea\u4e00\u53e5\u5148\u628a\u4f60\u53eb\u4f4f',
      '\u522b\u6025\u7740\u89e3\u91ca\u81ea\u5df1\uff0c\u5148\u8ba9\u4e00\u53e5\u8bd7\u66ff\u4f60\u4f5c\u51fa\u9009\u62e9',
      '\u5728\u8fd9\u7247\u4e91\u5c42\u91cc\u72b9\u8c6b\uff0c\u672c\u8eab\u5c31\u662f\u610f\u4e49\u5f62\u6210\u7684\u4e00\u90e8\u5206',
      '\u5148\u53bb\u78b0\u4e00\u78b0\u90a3\u4e9b\u53d1\u4eae\u7684\u53e5\u5b50\uff0c\u7cfb\u7edf\u4f1a\u8bb0\u4f4f\u4f60\u7684\u505c\u987f',
    ]
  }

  if (clickedCount < 3) {
    return [
      '\u4f60\u6b63\u5728\u5851\u9020\u610f\u4e49\uff0c\u661f\u7fa4\u5f00\u59cb\u8bb0\u4f4f\u4f60\u7684\u504f\u597d',
      '\u6700\u521d\u7684\u51e0\u6b21\u786e\u8ba4\uff0c\u6b63\u5728\u6084\u6084\u6539\u53d8\u8bd7\u4e91\u7684\u822a\u7ebf',
      '\u7cfb\u7edf\u8fd8\u5728\u6478\u7d22\u4f60\u504f\u5411\u54ea\u4e00\u79cd\u56de\u58f0',
      '\u6bcf\u4e00\u6b21\u53cc\u51fb\u90fd\u50cf\u4e00\u6b21\u8f7b\u5fae\u6821\u51c6\uff0c\u573a\u57df\u6b63\u5728\u5411\u4f60\u9760\u8fd1',
      '\u4f60\u7ed9\u51fa\u7684\u4e0d\u662f\u7b54\u6848\uff0c\u800c\u662f\u8bd7\u4e91\u7ee7\u7eed\u751f\u957f\u7684\u65b9\u5411',
    ]
  }

  if (llmCount > 0 && clickedCount < 6) {
    return [
      '\u7cfb\u7edf\u6b63\u5728\u5b66\u4e60\u4f60\u7684\u51dd\u89c6\u65b9\u5f0f',
      '\u65b0\u7684\u53e5\u5b50\u5f00\u59cb\u5e26\u7740\u4f60\u7684\u504f\u597d\u8fd4\u56de',
      '\u8bd7\u4e91\u5df2\u7ecf\u4e0d\u518d\u968f\u673a\uff0c\u5b83\u5f00\u59cb\u8bd5\u63a2\u6027\u5730\u56de\u5e94\u4f60',
      '\u4f60\u7684\u9009\u62e9\u6b63\u5728\u6e17\u8fdb\u751f\u6210\u903b\u8f91\uff0c\u56de\u58f0\u5f00\u59cb\u53d8\u5f97\u79c1\u4eba',
      '\u6b64\u523b\u51fa\u73b0\u7684\u53e5\u5b50\uff0c\u5df2\u7ecf\u6709\u4e00\u90e8\u5206\u5728\u5411\u4f60\u9760\u62e2',
    ]
  }

  if (totalPoems > 18 && clickedCount > 6) {
    return [
      '\u610f\u4e49\u5bc6\u5ea6\u6b63\u5728\u4e0a\u5347\uff0c\u6574\u7247\u573a\u57df\u5f00\u59cb\u51fa\u73b0\u4f60\u7684\u8f6e\u5ed3',
      '\u4f60\u4e0d\u662f\u5728\u6311\u9009\u53e5\u5b50\uff0c\u800c\u662f\u5728\u8bad\u7ec3\u4e00\u53e5\u53e5\u8bd7\u5982\u4f55\u63a5\u8fd1\u4f60',
      '\u7cfb\u7edf\u5df2\u7ecf\u5b66\u4f1a\u4e00\u90e8\u5206\u4f60\u504f\u7231\u7684\u6c89\u9ed8\u65b9\u5f0f',
      '\u8d8a\u6765\u8d8a\u591a\u7684\u8bd7\u53e5\u5f00\u59cb\u643a\u5e26\u540c\u4e00\u79cd\u6697\u8272\u7684\u5438\u5f15\u529b',
      '\u8fd9\u7247\u8bd7\u4e91\u6b63\u5728\u4ece\u516c\u5171\u8bed\u8a00\u7f13\u6162\u6536\u7f29\u6210\u4f60\u7684\u8bed\u8a00',
    ]
  }

  return [
    '\u5b87\u5b99\u5728\u5b89\u9759\u5730\u5411\u4f60\u7684\u9009\u62e9\u504f\u79fb',
    '\u8bd7\u4e91\u4ecd\u5728\u6f02\u79fb\uff0c\u4f46\u5b83\u5df2\u7ecf\u4e0d\u662f\u6700\u521d\u90a3\u7247\u4e91',
    '\u4f60\u7559\u4e0b\u7684\u6bcf\u4e00\u6b21\u786e\u8ba4\uff0c\u90fd\u5728\u6539\u53d8\u4e0b\u4e00\u53e5\u62b5\u8fbe\u7684\u65b9\u5f0f',
    '\u67d0\u79cd\u66f4\u79c1\u4eba\u7684\u79e9\u5e8f\uff0c\u6b63\u5728\u8fd9\u4e9b\u53e5\u5b50\u4e4b\u95f4\u6162\u6162\u6210\u5f62',
    '\u4f60\u6240\u504f\u7231\u7684\uff0c\u4e0d\u53ea\u662f\u53e5\u5b50\u672c\u8eab\uff0c\u8fd8\u6709\u5b83\u4eec\u9760\u8fd1\u4f60\u7684\u89d2\u5ea6',
  ]
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
  const [statusTick, setStatusTick] = useState(0)

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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStatusTick(current => current + 1)
    }, STATUS_ROTATION_INTERVAL)

    return () => window.clearInterval(timer)
  }, [])


  const generationProgress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0
  const totalPoems = currentStep
  const clickedCount = likedPoems.length
  const llmCount = poems.filter(p => p.source === 'llm').length
  const presetCount = poems.filter(p => p.source === 'template').length
  const statusMessages = getStatusMessages(totalPoems, clickedCount, llmCount)
  const statusStageKey = `${clickedCount === 0 ? 'idle' : clickedCount < 3 ? 'awakening' : llmCount > 0 && clickedCount < 6 ? 'learning' : totalPoems > 18 && clickedCount > 6 ? 'shaping' : 'drifting'}-${statusMessages.length}`
  const statusMessage = statusMessages[statusTick % statusMessages.length] ?? ''
  const driftProgress = getDriftProgress(totalPoems, clickedCount)

  useEffect(() => {
    setStatusTick(0)
  }, [statusStageKey])

  return (
    <>
      {progressBursts.map(burst => (
        <>
          <div
            key={`${burst.id}-core`}
            style={{
              position: 'fixed',
              left: `${burst.x}px`,
              top: `${burst.y}px`,
              width: '16px',
              height: '16px',
              borderRadius: '999px',
              zIndex: 27,
              pointerEvents: 'none',
              background:
                'radial-gradient(circle, rgba(255, 247, 205, 1) 0%, rgba(166, 226, 255, 0.98) 46%, rgba(112, 164, 255, 0.2) 100%)',
              boxShadow:
                '0 0 26px rgba(255, 238, 177, 0.95), 0 0 42px rgba(142, 211, 255, 0.85)',
              transform: 'translate(-50%, -50%)',
              animation: 'meaningTransferCore 980ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
              ['--travel-x' as string]: `${burst.targetX - burst.x}px`,
              ['--travel-y' as string]: `${burst.targetY - burst.y}px`,
            } as CSSProperties}
          />
          <div
            key={`${burst.id}-trail`}
            style={{
              position: 'fixed',
              left: `${burst.x}px`,
              top: `${burst.y}px`,
              width: '84px',
              height: '18px',
              borderRadius: '999px',
              zIndex: 26,
              pointerEvents: 'none',
              background:
                'linear-gradient(90deg, rgba(255, 238, 177, 0.0) 0%, rgba(255, 238, 177, 0.18) 18%, rgba(145, 213, 255, 0.72) 56%, rgba(255, 247, 205, 0.96) 100%)',
              filter: 'blur(6px)',
              transform: 'translate(-82%, -50%) rotate(-6deg)',
              transformOrigin: '100% 50%',
              animation: 'meaningTransferTrail 980ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
              ['--travel-x' as string]: `${burst.targetX - burst.x}px`,
              ['--travel-y' as string]: `${burst.targetY - burst.y}px`,
            } as CSSProperties}
          />
          <div
            key={`${burst.id}-spark`}
            style={{
              position: 'fixed',
              left: `${burst.x}px`,
              top: `${burst.y}px`,
              width: '8px',
              height: '8px',
              borderRadius: '999px',
              zIndex: 25,
              pointerEvents: 'none',
              background: 'rgba(203, 236, 255, 0.95)',
              boxShadow: '0 0 16px rgba(203, 236, 255, 0.85)',
              transform: 'translate(-50%, -50%)',
              animation: 'meaningTransferSpark 920ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
              ['--travel-x' as string]: `${burst.targetX - burst.x - 16}px`,
              ['--travel-y' as string]: `${burst.targetY - burst.y + 8}px`,
            } as CSSProperties}
          />
          <div
            key={`${burst.id}-impact`}
            style={{
              position: 'fixed',
              left: `${burst.targetX}px`,
              top: `${burst.targetY}px`,
              width: '18px',
              height: '18px',
              borderRadius: '999px',
              zIndex: 24,
              pointerEvents: 'none',
              border: '2px solid rgba(255, 238, 177, 0.75)',
              boxShadow: '0 0 20px rgba(155, 214, 255, 0.7)',
              transform: 'translate(-50%, -50%) scale(0.2)',
              opacity: 0,
              animation: 'meaningTransferImpact 700ms ease-out 620ms forwards',
            }}
          />
        </>
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
        @keyframes meaningTransferCore {
          0% {
            transform: translate(-50%, -50%) scale(0.55);
            opacity: 0;
          }
          18% {
            opacity: 1;
          }
          78% {
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--travel-x)), calc(-50% + var(--travel-y))) scale(0.14);
            opacity: 0;
          }
        }
        @keyframes meaningTransferTrail {
          0% {
            transform: translate(-82%, -50%) scaleX(0.4) rotate(-10deg);
            opacity: 0;
          }
          16% {
            opacity: 0.95;
          }
          100% {
            transform: translate(calc(-82% + var(--travel-x)), calc(-50% + var(--travel-y))) scaleX(1.15) rotate(4deg);
            opacity: 0;
          }
        }
        @keyframes meaningTransferSpark {
          0% {
            transform: translate(-50%, -50%) scale(0.35);
            opacity: 0;
          }
          24% {
            opacity: 0.9;
          }
          100% {
            transform: translate(calc(-50% + var(--travel-x)), calc(-50% + var(--travel-y))) scale(0.08);
            opacity: 0;
          }
        }
        @keyframes meaningTransferImpact {
          0% {
            transform: translate(-50%, -50%) scale(0.2);
            opacity: 0;
          }
          25% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.8);
            opacity: 0;
          }
        }
      `}</style>
    </>
  )
}

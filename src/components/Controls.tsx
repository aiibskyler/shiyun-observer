import { useState } from 'react'
import { useStore } from '../stores/useStore'
import { Report } from './Report'

export function Controls() {
  const [showReport, setShowReport] = useState(false)
  const reset = useStore(s => s.reset)

  const handleEndObservation = () => {
    setShowReport(true)
  }

  const handleReset = () => {
    if (confirm('确定要重置系统吗？所有数据将被清空。')) {
      reset()
    }
  }

  const handleCloseReport = () => {
    setShowReport(false)
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '12px',
          zIndex: 10,
        }}
      >
        <button
          onClick={handleEndObservation}
          style={{
            padding: '12px 24px',
            background: 'rgba(100, 200, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(100, 200, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'sans-serif',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(100, 200, 255, 0.3)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(100, 200, 255, 0.2)'
          }}
        >
          结束观测
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: '12px 24px',
            background: 'rgba(255, 100, 100, 0.2)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 100, 100, 0.3)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'sans-serif',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255, 100, 100, 0.3)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255, 100, 100, 0.2)'
          }}
        >
          重置系统
        </button>
      </div>

      {showReport && <Report onClose={handleCloseReport} />}
    </>
  )
}

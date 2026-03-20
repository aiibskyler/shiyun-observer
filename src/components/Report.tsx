import { useStore } from '../stores/useStore'
import type { Report } from '../types'

interface ReportProps {
  onClose: () => void
}

export function Report({ onClose }: ReportProps) {
  const generateTextReport = useStore(s => s.generateTextReport)
  const report = useStore(s => s.generateReport())

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(20px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(20, 20, 30, 0.95)',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '800px',
          maxHeight: '80vh',
          overflow: 'auto',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontFamily: 'sans-serif',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <h2
            style={{
              color: 'white',
              margin: 0,
              fontSize: '28px',
            }}
          >
            🌸 意义构建分析报告
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            关闭
          </button>
        </div>

        <div
          style={{
            color: 'rgba(255, 255, 255, 0.9)',
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap',
          }}
        >
          {generateTextReport()}
        </div>

        {/* 数据可视化 */}
        <div
          style={{
            marginTop: '32px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          <MetricCard
            label="总交互次数"
            value={report.totalActions}
            unit="次"
          />
          <MetricCard
            label="探索性"
            value={Math.round(report.explorationScore * 100)}
            unit="%"
          />
          <MetricCard
            label="收敛性"
            value={Math.round(report.biasScore * 100)}
            unit="%"
          />
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: number
  unit: string
}

function MetricCard({ label, value, unit }: MetricCardProps) {
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
          fontSize: '32px',
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

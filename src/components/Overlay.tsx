import { useStore } from '../stores/useStore'

export function Overlay() {
  const hoveredNodeId = useStore(s => s.hoveredNodeId)
  const nodes = useStore(s => s.nodes)

  const hoveredNode = nodes.find(n => n.id === hoveredNodeId)

  if (!hoveredNode) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        padding: '20px 30px',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'white',
        fontFamily: 'sans-serif',
        textAlign: 'center',
        zIndex: 100,
        pointerEvents: 'none',
        transition: 'opacity 0.2s',
      }}
    >
      <div
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '8px',
          letterSpacing: '2px',
        }}
      >
        {hoveredNode.text}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.6)',
        }}
      >
        双击喜欢 · 悬浮探索
      </div>
    </div>
  )
}

type CosmicBackdropProps = {
  variant?: 'welcome' | 'analysis'
}

type StarSpec = {
  left: string
  top: string
  size: number
  opacity: number
  duration: number
  delay: number
  color: string
}

function createStars(count: number, palette: string[], seedOffset: number): StarSpec[] {
  return Array.from({ length: count }, (_, index) => {
    const seed = (index + 1) * 97 + seedOffset
    const left = `${(seed * 17) % 100}%`
    const top = `${(seed * 29) % 100}%`
    const size = 1 + ((seed * 7) % 24) / 10
    const opacity = 0.22 + ((seed * 13) % 50) / 100
    const duration = 3.6 + ((seed * 11) % 36) / 10
    const delay = ((seed * 5) % 20) / 10
    const color = palette[seed % palette.length]

    return {
      left,
      top,
      size,
      opacity,
      duration,
      delay,
      color,
    }
  })
}

const coolPalette = ['#d9ebff', '#a9d1ff', '#f7f3d1']
const warmPalette = ['#fff3d8', '#d9ebff', '#c7deff']
const welcomeStars = createStars(72, coolPalette, 31)
const analysisStars = createStars(88, warmPalette, 73)

export function CosmicBackdrop({ variant = 'welcome' }: CosmicBackdropProps) {
  const stars = variant === 'analysis' ? analysisStars : welcomeStars
  const glowColor =
    variant === 'analysis'
      ? 'radial-gradient(circle, rgba(255, 221, 167, 0.18) 0%, rgba(255, 221, 167, 0) 72%)'
      : 'radial-gradient(circle, rgba(116, 162, 255, 0.18) 0%, rgba(116, 162, 255, 0) 72%)'

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '-12%',
          background:
            'radial-gradient(circle at 18% 20%, rgba(87, 132, 255, 0.18), transparent 28%), radial-gradient(circle at 80% 22%, rgba(250, 216, 150, 0.12), transparent 24%), radial-gradient(circle at 52% 78%, rgba(113, 186, 255, 0.12), transparent 22%)',
          animation: 'cosmicFloat 18s ease-in-out infinite alternate',
          opacity: variant === 'analysis' ? 0.78 : 0.92,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at center, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 58%)',
          mixBlendMode: 'screen',
        }}
      />

      {stars.map((star, index) => (
        <span
          key={`${variant}-star-${index}`}
          style={{
            position: 'absolute',
            left: star.left,
            top: star.top,
            width: `${star.size}px`,
            height: `${star.size}px`,
            borderRadius: '999px',
            background: star.color,
            opacity: star.opacity,
            boxShadow: `0 0 ${Math.max(4, star.size * 5)}px ${star.color}`,
            animation: `starTwinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          inset: '-18%',
          background: glowColor,
          filter: 'blur(22px)',
          animation: 'nebulaPulse 14s ease-in-out infinite',
          opacity: variant === 'analysis' ? 0.7 : 0.58,
        }}
      />
    </div>
  )
}

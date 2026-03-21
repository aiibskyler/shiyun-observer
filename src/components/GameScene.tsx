import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useGameStore } from '../stores/gameStore'
import { createPoemGenerator } from '../lib/poemGenerator'
import type { PoemGenerator } from '../lib/poemGenerator'
import type { GamePoemNode } from '../types/game'

type PoemGroupUserData = {
  poemId: string
  poemText: string
  source: GamePoemNode['source']
  core: THREE.Mesh
  aura: THREE.Mesh
  ring: THREE.Mesh
  haloRing: THREE.Mesh
  driftPhase: number
  driftSpeed: number
  rotationOffset: number
  baseColor: THREE.Color
}

type BackgroundStarState = {
  anchor: THREE.Vector3
  baseSize: number
  maxAlpha: number
  driftRadius: number
  driftSpeed: number
  driftOffset: number
  phase: 'appearing' | 'visible' | 'shooting'
  phaseStart: number
  appearDuration: number
  visibleDuration: number
  shootDuration: number
  shootDirection: THREE.Vector3
  shootDistance: number
  color: THREE.Color
}

type BackgroundStarField = {
  points: THREE.Points
  geometry: THREE.BufferGeometry
  material: THREE.ShaderMaterial
  positions: Float32Array
  sizes: Float32Array
  alphas: Float32Array
  colors: Float32Array
  positionAttr: THREE.BufferAttribute
  sizeAttr: THREE.BufferAttribute
  alphaAttr: THREE.BufferAttribute
  states: BackgroundStarState[]
  shellMin: number
  shellMax: number
  palette: THREE.Color[]
  sizeRange: [number, number]
}

type PoemExplosion = {
  group: THREE.Group
  ring: THREE.Mesh
  flash: THREE.Mesh
  particles: Array<{
    mesh: THREE.Mesh
    velocity: THREE.Vector3
  }>
  startAt: number
  duration: number
}

type MeaningTransferDetail = {
  x: number
  y: number
}

function formatDisplayedPoem(text: string): string {
  return text.replace(/\s*\n+\s*/g, '\uFF0C').trim()
}

const STAR_VERTEX_SHADER = `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
varying float vAlpha;
varying vec3 vColor;
uniform float uPixelRatio;

void main() {
  vAlpha = aAlpha;
  vColor = aColor;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uPixelRatio * (320.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`

const STAR_FRAGMENT_SHADER = `
varying float vAlpha;
varying vec3 vColor;

void main() {
  float dist = distance(gl_PointCoord, vec2(0.5));
  float strength = smoothstep(0.52, 0.0, dist);
  strength *= smoothstep(0.0, 0.18, 0.5 - dist);
  if (strength <= 0.001) {
    discard;
  }
  gl_FragColor = vec4(vColor, strength * vAlpha);
}
`

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function easeOutCubic(value: number): number {
  const t = clamp01(value)
  return 1 - (1 - t) ** 3
}

function normalizePoemTextForDedup(text: string): string {
  return text.replace(/[，。！？；：、\s]/g, '').trim()
}

function randomAnchor(shellMin: number, shellMax: number): THREE.Vector3 {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const radius = shellMin + Math.random() * (shellMax - shellMin)

  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  )
}

function createBackgroundStarField(
  count: number,
  shellMin: number,
  shellMax: number,
  palette: number[],
  sizeRange: [number, number]
): BackgroundStarField {
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const alphas = new Float32Array(count)
  const colors = new Float32Array(count * 3)

  const geometry = new THREE.BufferGeometry()
  const positionAttr = new THREE.BufferAttribute(positions, 3)
  const sizeAttr = new THREE.BufferAttribute(sizes, 1)
  const alphaAttr = new THREE.BufferAttribute(alphas, 1)
  const colorAttr = new THREE.BufferAttribute(colors, 3)

  geometry.setAttribute('position', positionAttr)
  geometry.setAttribute('aSize', sizeAttr)
  geometry.setAttribute('aAlpha', alphaAttr)
  geometry.setAttribute('aColor', colorAttr)

  const material = new THREE.ShaderMaterial({
    vertexShader: STAR_VERTEX_SHADER,
    fragmentShader: STAR_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
  })

  const points = new THREE.Points(geometry, material)
  const field: BackgroundStarField = {
    points,
    geometry,
    material,
    positions,
    sizes,
    alphas,
    colors,
    positionAttr,
    sizeAttr,
    alphaAttr,
    states: [],
    shellMin,
    shellMax,
    palette: palette.map(color => new THREE.Color(color)),
    sizeRange,
  }

  for (let index = 0; index < count; index += 1) {
    const color = field.palette[Math.floor(Math.random() * field.palette.length)]
    field.states.push({
      anchor: randomAnchor(shellMin, shellMax),
      baseSize: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
      maxAlpha: 0.35 + Math.random() * 0.5,
      driftRadius: 0.4 + Math.random() * 1.3,
      driftSpeed: 0.00018 + Math.random() * 0.00026,
      driftOffset: Math.random() * Math.PI * 2,
      phase: 'appearing',
      phaseStart: Date.now() - Math.random() * 2200,
      appearDuration: 1000 + Math.random() * 2200,
      visibleDuration: 2600 + Math.random() * 5200,
      shootDuration: 480 + Math.random() * 720,
      shootDirection: new THREE.Vector3(0, 0, 0),
      shootDistance: 8 + Math.random() * 18,
      color,
    })
  }

  return field
}

function resetBackgroundStar(state: BackgroundStarState, field: BackgroundStarField, now: number): void {
  state.anchor = randomAnchor(field.shellMin, field.shellMax)
  state.baseSize = field.sizeRange[0] + Math.random() * (field.sizeRange[1] - field.sizeRange[0])
  state.maxAlpha = 0.35 + Math.random() * 0.5
  state.driftRadius = 0.4 + Math.random() * 1.3
  state.driftSpeed = 0.00018 + Math.random() * 0.00026
  state.driftOffset = Math.random() * Math.PI * 2
  state.phase = 'appearing'
  state.phaseStart = now
  state.appearDuration = 1000 + Math.random() * 2200
  state.visibleDuration = 2600 + Math.random() * 5200
  state.shootDuration = 480 + Math.random() * 720
  state.shootDirection = new THREE.Vector3(0, 0, 0)
  state.shootDistance = 8 + Math.random() * 18
  state.color = field.palette[Math.floor(Math.random() * field.palette.length)]
}

function beginStarShoot(state: BackgroundStarState, now: number): void {
  state.phase = 'shooting'
  state.phaseStart = now
  state.shootDuration = 480 + Math.random() * 720
  state.shootDistance = 8 + Math.random() * 18

  const direction = state.anchor.clone().normalize()
  direction.x += (Math.random() - 0.5) * 0.8
  direction.y += (Math.random() - 0.5) * 0.8
  direction.z += (Math.random() - 0.5) * 0.8
  state.shootDirection = direction.normalize()
}

function updateBackgroundStarField(field: BackgroundStarField, now: number): void {
  for (let index = 0; index < field.states.length; index += 1) {
    const state = field.states[index]
    const positionIndex = index * 3

    const driftX = Math.sin(now * state.driftSpeed + state.driftOffset) * state.driftRadius
    const driftY = Math.cos(now * state.driftSpeed * 1.35 + state.driftOffset) * state.driftRadius
    const driftZ = Math.sin(now * state.driftSpeed * 0.85 + state.driftOffset) * state.driftRadius * 0.6

    let x = state.anchor.x + driftX
    let y = state.anchor.y + driftY
    let z = state.anchor.z + driftZ
    let alpha = state.maxAlpha
    let size = state.baseSize

    if (state.phase === 'appearing') {
      const progress = clamp01((now - state.phaseStart) / state.appearDuration)
      const eased = easeOutCubic(progress)
      alpha = state.maxAlpha * eased
      size = state.baseSize * (0.15 + eased * 0.85)

      if (progress >= 1) {
        state.phase = 'visible'
        state.phaseStart = now
      }
    } else if (state.phase === 'visible') {
      const shimmer = 0.74 + Math.sin(now * state.driftSpeed * 9 + state.driftOffset) * 0.24
      alpha = state.maxAlpha * shimmer
      size = state.baseSize * (0.95 + Math.sin(now * state.driftSpeed * 11 + state.driftOffset) * 0.08)

      if (now - state.phaseStart >= state.visibleDuration) {
        beginStarShoot(state, now)
      }
    } else {
      const progress = clamp01((now - state.phaseStart) / state.shootDuration)
      const eased = easeOutCubic(progress)
      x += state.shootDirection.x * state.shootDistance * eased
      y += state.shootDirection.y * state.shootDistance * eased
      z += state.shootDirection.z * state.shootDistance * eased
      alpha = state.maxAlpha * (1 - eased)
      size = state.baseSize * (1 + eased * 2.1)

      if (progress >= 1) {
        resetBackgroundStar(state, field, now)
      }
    }

    field.positions[positionIndex] = x
    field.positions[positionIndex + 1] = y
    field.positions[positionIndex + 2] = z
    field.sizes[index] = size
    field.alphas[index] = alpha
    field.colors[positionIndex] = state.color.r
    field.colors[positionIndex + 1] = state.color.g
    field.colors[positionIndex + 2] = state.color.b
  }

  field.positionAttr.needsUpdate = true
  field.sizeAttr.needsUpdate = true
  field.alphaAttr.needsUpdate = true
  const colorAttr = field.geometry.getAttribute('aColor')
  colorAttr.needsUpdate = true
}

function createNebula(position: THREE.Vector3, color: number, scale: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  )

  mesh.position.copy(position)
  mesh.scale.set(scale, scale * 0.65, scale)
  return mesh
}

function createPoemExplosion(position: THREE.Vector3, color: THREE.Color, now: number): PoemExplosion {
  const group = new THREE.Group()
  group.position.copy(position)

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.045, 10, 32),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  )
  ring.rotation.x = Math.PI / 2

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 16),
    new THREE.MeshBasicMaterial({
      color: color.clone().offsetHSL(0, 0.1, 0.2),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  )

  group.add(ring)
  group.add(flash)

  const particles: PoemExplosion['particles'] = []
  for (let index = 0; index < 9; index += 1) {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.09 + Math.random() * 0.05, 0),
      new THREE.MeshBasicMaterial({
        color: color.clone().offsetHSL((Math.random() - 0.5) * 0.06, 0.08, 0.16),
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )

    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 2.2
    )

    particles.push({ mesh, velocity })
    group.add(mesh)
  }

  return {
    group,
    ring,
    flash,
    particles,
    startAt: now,
    duration: 980,
  }
}

function updatePoemExplosions(explosions: PoemExplosion[], scene: THREE.Scene, now: number): void {
  for (let index = explosions.length - 1; index >= 0; index -= 1) {
    const explosion = explosions[index]
    const progress = clamp01((now - explosion.startAt) / explosion.duration)
    const eased = easeOutCubic(progress)

    const ringMaterial = explosion.ring.material as THREE.MeshBasicMaterial
    const flashMaterial = explosion.flash.material as THREE.MeshBasicMaterial

    explosion.ring.scale.setScalar(1 + eased * 5.2)
    ringMaterial.opacity = (1 - progress) * 0.85

    explosion.flash.scale.setScalar(1 + eased * 3.4)
    flashMaterial.opacity = (1 - progress) * 0.7

    explosion.particles.forEach(particle => {
      particle.mesh.position.copy(particle.velocity).multiplyScalar(eased * 2.2)
      particle.mesh.scale.setScalar(1 + eased * 1.5)
      const material = particle.mesh.material as THREE.MeshBasicMaterial
      material.opacity = (1 - progress) * 0.95
    })

    if (progress >= 1) {
      scene.remove(explosion.group)
      explosions.splice(index, 1)
    }
  }
}

function getScreenPosition(
  object: THREE.Object3D,
  camera: THREE.PerspectiveCamera
): MeaningTransferDetail {
  const projected = object.position.clone().project(camera)

  return {
    x: ((projected.x + 1) / 2) * window.innerWidth,
    y: ((-projected.y + 1) / 2) * window.innerHeight,
  }
}

export function GameScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const spawnIntervalRef = useRef<number | null>(null)
  const hideCardTimeoutRef = useRef<number | null>(null)
  const feedbackTimeoutRef = useRef<number | null>(null)
  const pulseTimeoutRef = useRef<number | null>(null)

  const poemMeshesRef = useRef<Map<string, THREE.Group>>(new Map())
  const poemGeneratorRef = useRef<PoemGenerator | null>(null)
  const backgroundStarFieldsRef = useRef<BackgroundStarField[]>([])
  const poemExplosionsRef = useRef<PoemExplosion[]>([])
  const pendingSpawnCountRef = useRef(0)
  const pendingPoemTextsRef = useRef<Set<string>>(new Set())
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const hoveredPoemIdRef = useRef<string | null>(null)
  const clickBurstsRef = useRef<Map<string, number>>(new Map())

  const [hoveredPoemText, setHoveredPoemText] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState<string | null>(null)
  const [showPulse, setShowPulse] = useState(false)
  const [pulseKey, setPulseKey] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  const addPoem = useGameStore(s => s.addPoem)
  const updatePoem = useGameStore(s => s.updatePoem)
  const removePoem = useGameStore(s => s.removePoem)
  const llmConfig = useGameStore(s => s.llmConfig)
  const clickPoem = useGameStore(s => s.clickPoem)

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

  const clearHideCardTimeout = () => {
    if (hideCardTimeoutRef.current !== null) {
      window.clearTimeout(hideCardTimeoutRef.current)
      hideCardTimeoutRef.current = null
    }
  }

  const clearFeedbackTimeout = () => {
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current)
      feedbackTimeoutRef.current = null
    }
  }

  const clearPulseTimeout = () => {
    if (pulseTimeoutRef.current !== null) {
      window.clearTimeout(pulseTimeoutRef.current)
      pulseTimeoutRef.current = null
    }
  }

  const triggerClickFeedback = (text: string) => {
    setFeedbackText(`意义偏向了你 · ${text}`)
    clearFeedbackTimeout()
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedbackText(null)
    }, 1400)

    setPulseKey(key => key + 1)
    setShowPulse(true)
    clearPulseTimeout()
    pulseTimeoutRef.current = window.setTimeout(() => {
      setShowPulse(false)
    }, 700)
  }

  const findIntersectedPoem = (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
    raycasterRef.current.setFromCamera(mouseRef.current, camera)
    const intersects = raycasterRef.current.intersectObjects(scene.children, true)

    for (const intersect of intersects) {
      const poemId = intersect.object.userData.poemId as string | undefined
      const poemText = intersect.object.userData.poemText as string | undefined

      if (poemId && poemText) {
        return { poemId, poemText }
      }
    }

    return null
  }

  const removePoemWithExplosion = (
    poemId: string,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ) => {
    const group = poemMeshesRef.current.get(poemId)
    if (!group) {
      return
    }

    const userData = group.userData as PoemGroupUserData
    const now = Date.now()
    const screenPosition = getScreenPosition(group, camera)
    const explosion = createPoemExplosion(
      group.position.clone(),
      userData.baseColor.clone(),
      now
    )

    poemExplosionsRef.current.push(explosion)
    scene.add(explosion.group)
    scene.remove(group)
    poemMeshesRef.current.delete(poemId)
    clickBurstsRef.current.delete(poemId)
    removePoem(poemId)

    if (hoveredPoemIdRef.current === poemId) {
      hoveredPoemIdRef.current = null
      setHoveredPoemText(null)
      document.body.style.cursor = 'default'
    }

    window.dispatchEvent(
      new CustomEvent<MeaningTransferDetail>('meaning-transfer', {
        detail: screenPosition,
      })
    )
  }

  const createPoemMesh = (poem: GamePoemNode): THREE.Group => {
    const group = new THREE.Group()
    const isLLMSource = poem.source === 'llm'
    const baseColor = isLLMSource
      ? new THREE.Color(0xe8f2ff)
      : new THREE.Color(
          poem.color.r / 255,
          poem.color.g / 255,
          poem.color.b / 255
        )

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(isLLMSource ? 1.28 : 1.05, 1),
      new THREE.MeshStandardMaterial({
        color: baseColor.clone().multiplyScalar(isLLMSource ? 0.42 : 0.2),
        roughness: isLLMSource ? 0.12 : 0.22,
        metalness: isLLMSource ? 0.94 : 0.78,
        transparent: true,
        opacity: 0,
      })
    )

    const aura = new THREE.Mesh(
      new THREE.SphereGeometry(isLLMSource ? 2.48 : 1.95, 26, 26),
      new THREE.MeshBasicMaterial({
        color: isLLMSource
          ? new THREE.Color(0xfff2d6)
          : baseColor.clone().offsetHSL(0, 0.12, 0.16),
        transparent: true,
        opacity: isLLMSource ? 0.16 : 0.05,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(isLLMSource ? 2.62 : 2.35, isLLMSource ? 0.11 : 0.075, 12, 48),
      new THREE.MeshBasicMaterial({
        color: isLLMSource ? 0xffefbf : 0xcde8ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )

    const haloRing = new THREE.Mesh(
      new THREE.TorusGeometry(isLLMSource ? 3.18 : 2.65, isLLMSource ? 0.075 : 0.036, 12, 56),
      new THREE.MeshBasicMaterial({
        color: isLLMSource ? 0xfff6dd : 0xbddfff,
        transparent: true,
        opacity: isLLMSource ? 0.3 : 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )

    ring.rotation.x = Math.PI / 2
    haloRing.rotation.x = Math.PI / 2
    haloRing.rotation.z = Math.PI / 5

    const poemTarget = { poemId: poem.id, poemText: poem.text }
    core.userData = poemTarget
    aura.userData = poemTarget
    ring.userData = poemTarget
    haloRing.userData = poemTarget

    group.add(aura)
    group.add(ring)
    group.add(haloRing)
    group.add(core)
    group.userData = {
      ...poemTarget,
      source: poem.source,
      core,
      aura,
      ring,
      haloRing,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.00055 + Math.random() * 0.00035,
      rotationOffset: Math.random() * Math.PI * 2,
      baseColor,
    } satisfies PoemGroupUserData

    return group
  }

  const updatePoems = (scene: THREE.Scene, now: number) => {
    const poemMeshes = poemMeshesRef.current
    const currentPoems = useGameStore.getState().poems

    currentPoems.forEach(poem => {
      let group = poemMeshes.get(poem.id)

      if (!group) {
        group = createPoemMesh(poem)
        poemMeshes.set(poem.id, group)
        scene.add(group)
      }

      const age = now - poem.spawnTime
      const isHovered = hoveredPoemIdRef.current === poem.id
      let timeUntilFade = poem.fadeTime - now

      // Keep the node alive while the user is actively reading it.
      if (isHovered && timeUntilFade < 5200) {
        poem.fadeTime = now + 5200
        timeUntilFade = poem.fadeTime - now
      }

      if (age < 1400) {
        const progress = age / 1400
        poem.scale = 0.28 + progress * 0.94
        poem.opacity = progress
        poem.lifecycle = 'spawning'
      } else if (timeUntilFade > 3400) {
        poem.scale = 1.22
        poem.opacity = 1
        poem.lifecycle = 'displaying'
      } else if (timeUntilFade > 0) {
        const progress = 1 - timeUntilFade / 3400
        poem.scale = 1.22 + progress * 0.16
        poem.opacity = 1 - progress * 0.38
        poem.lifecycle = 'fading'
      } else {
        const userData = group.userData as PoemGroupUserData
        const explosion = createPoemExplosion(group.position.clone(), userData.baseColor.clone(), now)
        poemExplosionsRef.current.push(explosion)
        scene.add(explosion.group)

        if (hoveredPoemIdRef.current === poem.id) {
          hoveredPoemIdRef.current = null
          setHoveredPoemText(null)
          document.body.style.cursor = 'default'
        }

        poem.lifecycle = 'dead'
        scene.remove(group)
        poemMeshes.delete(poem.id)
        clickBurstsRef.current.delete(poem.id)
        removePoem(poem.id)
        return
      }

      const userData = group.userData as PoemGroupUserData
      const clickBurstStartedAt = clickBurstsRef.current.get(poem.id)
      const clickBurstProgress = clickBurstStartedAt
        ? (now - clickBurstStartedAt) / 980
        : null
      const isLLMSource = userData.source === 'llm'

      if (clickBurstProgress !== null && clickBurstProgress >= 1) {
        clickBurstsRef.current.delete(poem.id)
      }

      const spawnBrightness = poem.lifecycle === 'spawning' ? easeOutCubic(poem.opacity) : 1
      const driftX = Math.sin(now * userData.driftSpeed + userData.driftPhase) * 0.9
      const driftY = Math.cos(now * userData.driftSpeed * 1.2 + userData.driftPhase) * 0.75
      const driftZ = Math.sin(now * userData.driftSpeed * 0.8 + userData.rotationOffset) * 0.6
      const llmPulse = isLLMSource ? 1 + Math.sin(now * 0.004 + userData.rotationOffset) * 0.06 : 1
      const displayScale = (
        isHovered ? poem.scale * 1.55 : poem.clicked ? poem.scale * 1.2 : poem.scale
      ) * llmPulse

      group.scale.setScalar(displayScale)
      group.position.set(
        poem.position.x + driftX,
        poem.position.y + driftY,
        poem.position.z + driftZ
      )
      group.rotation.x = now * 0.00018 + userData.rotationOffset
      group.rotation.y = now * 0.00026 + userData.driftPhase

      const coreMaterial = userData.core.material as THREE.MeshStandardMaterial
      const auraMaterial = userData.aura.material as THREE.MeshBasicMaterial
      const ringMaterial = userData.ring.material as THREE.MeshBasicMaterial
      const haloRingMaterial = userData.haloRing.material as THREE.MeshBasicMaterial

      coreMaterial.color
        .copy(userData.baseColor)
        .multiplyScalar((isLLMSource ? 0.36 : 0.15) + spawnBrightness * (isLLMSource ? 1.16 : 0.85))
      coreMaterial.opacity = poem.opacity
      coreMaterial.transparent = true
      coreMaterial.emissive = new THREE.Color(0, 0, 0)
      coreMaterial.emissiveIntensity = 0

      auraMaterial.color = poem.clicked
        ? new THREE.Color(0xffecb0)
        : isHovered
          ? new THREE.Color(0xc8e9ff)
          : isLLMSource
            ? new THREE.Color(0xffefcb)
            : userData.baseColor.clone().offsetHSL(0, 0.08, 0.14)
      auraMaterial.opacity =
        poem.opacity *
        spawnBrightness *
        (isHovered ? (isLLMSource ? 0.7 : 0.38) : poem.clicked ? 0.26 : isLLMSource ? 0.34 : 0.14)

      ringMaterial.color = poem.clicked
        ? new THREE.Color(0xffe2a1)
        : isLLMSource
          ? new THREE.Color(0xfff4d0)
          : new THREE.Color(0xc6e2ff)
      ringMaterial.opacity = isHovered
        ? poem.opacity * (isLLMSource ? 0.8 : 0.45)
        : isLLMSource
          ? poem.opacity * (0.28 + Math.sin(now * 0.0036 + userData.driftPhase) * 0.06)
          : 0
      haloRingMaterial.color = isLLMSource ? new THREE.Color(0xfff7e4) : new THREE.Color(0xc6e2ff)
      haloRingMaterial.opacity = poem.opacity *
        (isHovered ? (isLLMSource ? 0.58 : 0.12) : isLLMSource ? 0.38 + Math.sin(now * 0.0028 + userData.rotationOffset) * 0.07 : 0)
      userData.aura.scale.setScalar(
        isHovered ? (isLLMSource ? 1.56 : 1.28) : poem.clicked ? 1.16 : isLLMSource ? 1.22 + Math.sin(now * 0.003 + userData.driftPhase) * 0.04 : 1
      )
      userData.haloRing.scale.setScalar(
        isHovered ? (isLLMSource ? 1.28 : 1.04) : isLLMSource ? 1.16 + Math.sin(now * 0.0026 + userData.rotationOffset) * 0.05 : 1
      )
      userData.haloRing.rotation.z = now * (isLLMSource ? 0.00072 : 0.0002) + userData.rotationOffset

      const shouldGlow = isHovered || poem.clicked || poem.lifecycle === 'spawning' || poem.lifecycle === 'fading'
      if (shouldGlow) {
        const glowIntensity = Math.sin(now * 0.005) * 0.22 + 0.82
        coreMaterial.emissive = isHovered
          ? new THREE.Color(0xbee6ff)
          : poem.clicked
            ? new THREE.Color(0xffe1a3)
            : isLLMSource
              ? new THREE.Color(0xffefc8)
              : new THREE.Color(0xa8d7ff)

        const lifecycleBoost =
          poem.lifecycle === 'spawning'
            ? spawnBrightness * 0.7
            : poem.lifecycle === 'fading'
              ? 0.7 + (1 - timeUntilFade / 3400) * 0.55
              : 0.75

        coreMaterial.emissiveIntensity = glowIntensity * lifecycleBoost * (isLLMSource ? 1.24 : 1)
      } else if (isLLMSource) {
        coreMaterial.emissive = new THREE.Color(0xfff1cc)
        coreMaterial.emissiveIntensity = 0.42 + Math.sin(now * 0.0032 + userData.driftPhase) * 0.12
      }

      if (clickBurstProgress !== null && clickBurstProgress < 1) {
        userData.ring.scale.setScalar(1 + clickBurstProgress * 4.6)
        ringMaterial.opacity = (1 - clickBurstProgress) * 0.95
      } else {
        userData.ring.scale.setScalar(isHovered ? 1.35 : 1)
      }

      updatePoem(poem.id, { ...poem })
    })
  }

  const spawnPoemNode = async (forcePreset: boolean = false) => {
    const { likedPoems, currentStep, poems } = useGameStore.getState()

    if (!poemGeneratorRef.current) {
      return
    }

    const generator = poemGeneratorRef.current
    const clickedPoems = likedPoems
    const avoidPoems = poems.map(poem => poem.text)
    const step = currentStep
    const clickRate = currentStep > 0 ? likedPoems.length / currentStep : 0

    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    const radius = 18 + Math.random() * 20

    try {
      const newPoem = await generator.generatePoem({
        clickedPoems,
        avoidPoems,
        step,
        clickRate,
        forcePreset,
      })

      newPoem.position = {
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
      }

      addPoem(newPoem)
    } catch (error) {
      console.error('[GameScene] 生成诗句失败:', error)
    }
  }

  void spawnPoemNode

  const spawnUniquePoemNode = async (forcePreset: boolean = false) => {
    if (!poemGeneratorRef.current) {
      return
    }

    const generator = poemGeneratorRef.current
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    const radius = 18 + Math.random() * 20

    try {
      let newPoem: GamePoemNode | null = null

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const { likedPoems, currentStep, poems } = useGameStore.getState()
        const avoidPoems = [
          ...poems.map(poem => poem.text),
          ...Array.from(pendingPoemTextsRef.current),
        ]

        const candidate = await generator.generatePoem({
          clickedPoems: likedPoems,
          avoidPoems,
          step: currentStep,
          clickRate: currentStep > 0 ? likedPoems.length / currentStep : 0,
          forcePreset,
        })

        const normalizedText = normalizePoemTextForDedup(candidate.text)
        const existingPoems = useGameStore.getState().poems
        const hasDuplicate =
          !normalizedText ||
          existingPoems.some(poem => normalizePoemTextForDedup(poem.text) === normalizedText) ||
          pendingPoemTextsRef.current.has(normalizedText)

        if (!hasDuplicate) {
          pendingPoemTextsRef.current.add(normalizedText)
          newPoem = candidate
          break
        }
      }
      if (!newPoem) {
        console.warn('[GameScene] Skipped duplicate poem after retrying generation')
        return
      }

      newPoem.position = {
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
      }

      addPoem(newPoem)
    } catch (error) {
      console.error('[GameScene] 生成诗句失败:', error)
    } finally {
      const activeTextSet = new Set(
        useGameStore
          .getState()
          .poems.map(poem => normalizePoemTextForDedup(poem.text))
          .filter(Boolean)
      )

      pendingPoemTextsRef.current.forEach(text => {
        if (activeTextSet.has(text)) {
          pendingPoemTextsRef.current.delete(text)
        }
      })
    }
  }

  const trySpawnBatch = async (batchSize: number, presetCount: number) => {
    const { poems, maxPoems } = useGameStore.getState()
    const remainingSlots = Math.max(0, maxPoems - poems.length - pendingSpawnCountRef.current)
    const actualBatchSize = Math.min(batchSize, remainingSlots)

    if (actualBatchSize <= 0) {
      return
    }

    const forcedPresetCount = Math.min(presetCount, actualBatchSize)
    const tasks: Promise<void>[] = []

    for (let index = 0; index < actualBatchSize; index += 1) {
      pendingSpawnCountRef.current += 1
      tasks.push(
        spawnUniquePoemNode(index < forcedPresetCount).finally(() => {
          pendingSpawnCountRef.current = Math.max(0, pendingSpawnCountRef.current - 1)
        })
      )
    }

    await Promise.all(tasks)
  }

  useEffect(() => {
    if (!containerRef.current || !llmConfig) {
      return
    }

    const container = containerRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x020611)
    scene.fog = new THREE.FogExp2(0x020611, 0.0105)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1400)
    camera.position.set(0, 0, 56)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    controls.minDistance = 42
    controls.maxDistance = 84
    controls.dampingFactor = 0.045
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.24

    scene.add(new THREE.AmbientLight(0xffffff, 0.48))
    scene.add(new THREE.HemisphereLight(0x8ec8ff, 0x050713, 0.7))

    const pointLight1 = new THREE.PointLight(0x8fc6ff, 1.6, 180)
    pointLight1.position.set(28, 18, 34)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xffe2a8, 1.25, 160)
    pointLight2.position.set(-24, -16, 28)
    scene.add(pointLight2)

    const primaryStars = createBackgroundStarField(
      1050,
      90,
      260,
      [0x9fc9ff, 0xd8ebff, 0xa7d6ff],
      [1.4, 3.4]
    )
    const accentStars = createBackgroundStarField(
      260,
      70,
      190,
      [0xffefc2, 0xffdca8, 0xcde8ff],
      [2.1, 4.8]
    )

    backgroundStarFieldsRef.current = [primaryStars, accentStars]
    scene.add(primaryStars.points)
    scene.add(accentStars.points)
    scene.add(createNebula(new THREE.Vector3(-34, 10, -60), 0x467eff, 28))
    scene.add(createNebula(new THREE.Vector3(40, -22, -42), 0xf2d59d, 22))

    poemGeneratorRef.current = createPoemGenerator(llmConfig)
    void poemGeneratorRef.current
      .warmupLLMBatch()
      .catch(error => {
        console.warn('[GameScene] Initial LLM warmup failed:', error)
      })
    void trySpawnBatch(14, 3)

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      const now = Date.now()

      backgroundStarFieldsRef.current.forEach(field => {
        updateBackgroundStarField(field, now)
      })

      updatePoems(scene, now)
      updatePoemExplosions(poemExplosionsRef.current, scene, now)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    spawnIntervalRef.current = window.setInterval(() => {
      const { poems, maxPoems } = useGameStore.getState()
      const density = poems.length / maxPoems

      if (density < 0.26) {
        void trySpawnBatch(4, 1)
      } else if (density < 0.52) {
        void trySpawnBatch(3, 1)
      } else if (density < 0.75) {
        void trySpawnBatch(2, 1)
      } else if (density < 0.9) {
        void trySpawnBatch(1, 0)
      }
    }, 1500)

    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      )

      const hoveredPoem = findIntersectedPoem(scene, camera)

      if (hoveredPoem) {
        clearHideCardTimeout()

        if (hoveredPoemIdRef.current !== hoveredPoem.poemId) {
          hoveredPoemIdRef.current = hoveredPoem.poemId
          setHoveredPoemText(hoveredPoem.poemText)
          document.body.style.cursor = 'pointer'
        }

        return
      }

      if (hoveredPoemIdRef.current !== null) {
        hoveredPoemIdRef.current = null
        clearHideCardTimeout()
        hideCardTimeoutRef.current = window.setTimeout(() => {
          setHoveredPoemText(null)
          document.body.style.cursor = 'default'
        }, 180)
      }
    }

    const handleDoubleClick = () => {
      const intersectedPoem = findIntersectedPoem(scene, camera)
      if (!intersectedPoem) {
        return
      }

      const poem = useGameStore.getState().poems.find(item => item.id === intersectedPoem.poemId)
      if (!poem || poem.clicked) {
        return
      }

      clickPoem(poem.id)
      clickBurstsRef.current.set(poem.id, Date.now())
      triggerClickFeedback(poem.text)
      removePoemWithExplosion(poem.id, scene, camera)
    }

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)

      backgroundStarFieldsRef.current.forEach(field => {
        field.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('dblclick', handleDoubleClick)
    window.addEventListener('resize', handleResize)

    return () => {
      if (spawnIntervalRef.current !== null) {
        window.clearInterval(spawnIntervalRef.current)
      }

      clearHideCardTimeout()
      clearFeedbackTimeout()
      clearPulseTimeout()
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('dblclick', handleDoubleClick)
      window.removeEventListener('resize', handleResize)

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      document.body.style.cursor = 'default'
      controls.dispose()
      renderer.dispose()

      backgroundStarFieldsRef.current.forEach(field => {
        field.geometry.dispose()
        field.material.dispose()
      })

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }

      poemMeshesRef.current.clear()
      clickBurstsRef.current.clear()
      pendingPoemTextsRef.current.clear()
      poemExplosionsRef.current = []
      backgroundStarFieldsRef.current = []
    }
  }, [llmConfig, addPoem, clickPoem, removePoem, updatePoem])

  return (
    <>
      <div
        ref={containerRef}
        style={{
          width: '100vw',
          height: '100vh',
          position: 'fixed',
          inset: 0,
          zIndex: 10,
        }}
      />

      {showPulse && (
        <div
          key={pulseKey}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 16,
            pointerEvents: 'none',
            background:
              'radial-gradient(circle at center, rgba(255, 238, 178, 0.32) 0%, rgba(138, 190, 255, 0.16) 24%, rgba(3, 6, 18, 0) 56%)',
            animation: 'meaningWave 680ms cubic-bezier(0.19, 1, 0.22, 1)',
          }}
        />
      )}

      {hoveredPoemText && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 30,
            minWidth: isMobile ? '0' : '320px',
            width: isMobile ? 'min(88vw, 420px)' : 'auto',
            maxWidth: isMobile ? '88vw' : 'min(78vw, 760px)',
            padding: isMobile ? '14px 18px' : '22px 34px',
            borderRadius: isMobile ? '16px' : '24px',
            background:
              'linear-gradient(180deg, rgba(6, 10, 23, 0.76) 0%, rgba(4, 8, 19, 0.62) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            boxShadow: '0 26px 80px rgba(0, 0, 0, 0.36)',
            backdropFilter: 'blur(22px)',
            color: 'rgba(244, 247, 255, 0.97)',
            fontFamily: '"Songti SC", "STSong", serif',
            fontSize: isMobile ? '22px' : '30px',
            letterSpacing: isMobile ? '0.06em' : '0.1em',
            lineHeight: isMobile ? 1.38 : 1.45,
            textAlign: 'center',
            pointerEvents: 'none',
            whiteSpace: 'pre-wrap',
          }}
        >
          {formatDisplayedPoem(hoveredPoemText)}
        </div>
      )}

      {feedbackText && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: isMobile ? 'max(176px, calc(env(safe-area-inset-bottom) + 176px))' : '84px',
            transform: 'translateX(-50%)',
            zIndex: 28,
            width: isMobile ? 'calc(100vw - 24px)' : 'auto',
            maxWidth: isMobile ? 'calc(100vw - 24px)' : 'none',
            padding: isMobile ? '10px 14px' : '12px 18px',
            borderRadius: '999px',
            background: 'rgba(255, 239, 194, 0.12)',
            border: '1px solid rgba(255, 233, 174, 0.26)',
            color: 'rgba(255, 245, 219, 0.96)',
            fontSize: isMobile ? '12px' : '13px',
            letterSpacing: isMobile ? '0.04em' : '0.08em',
            fontFamily: '"Microsoft YaHei UI", "PingFang SC", sans-serif',
            backdropFilter: 'blur(14px)',
            animation: 'driftUp 1.4s ease forwards',
            pointerEvents: 'none',
            textAlign: 'center',
            whiteSpace: isMobile ? 'normal' : 'nowrap',
            lineHeight: isMobile ? 1.5 : 'normal',
          }}
        >
          {feedbackText}
        </div>
      )}
    </>
  )
}

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useStore } from '../stores/useStore'
import { generateInitialNodes } from '../lib/textGenerator'

const MAX_NODES = 5000
const INITIAL_NODES = 500

export function Scene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const geometryRef = useRef<THREE.BufferGeometry | null>(null)
  const materialRef = useRef<THREE.Material | null>(null)
  const raycasterRef = useRef<THREE.Raycaster | null>(null)
  const mouseRef = useRef<THREE.Vector2 | null>(null)
  const nodesRef = useRef<typeof nodes>([])

  const { nodes, addNode, hoverNode, hoveredNodeId, likeNode } = useStore()

  // 保持 nodesRef 最新
  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 1. 创建场景
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    sceneRef.current = scene

    // 2. 创建相机
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 50)
    cameraRef.current = camera

    // 3. 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // 4. 添加控制器
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controlsRef.current = controls

    // 5. 添加灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0xffffff, 1)
    pointLight.position.set(10, 10, 10)
    scene.add(pointLight)

    // 6. 创建 InstancedMesh
    const geometry = new THREE.SphereGeometry(1, 16, 16)
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.3,
    })

    geometryRef.current = geometry
    materialRef.current = material

    const instancedMesh = new THREE.InstancedMesh(geometry, material, MAX_NODES)
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    scene.add(instancedMesh)
    instancedMeshRef.current = instancedMesh

    // 7. 设置 Raycaster
    const raycaster = new THREE.Raycaster()
    raycaster.params.Points = { threshold: 0.5 }
    raycasterRef.current = raycaster

    const mouse = new THREE.Vector2()
    mouseRef.current = mouse

    // 8. 鼠标移动事件
    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

      raycaster.setFromCamera(mouse, camera)

      if (instancedMesh) {
        const intersects = raycaster.intersectObject(instancedMesh)

        if (intersects.length > 0) {
          const instanceId = intersects[0].instanceId
          if (instanceId !== null && instanceId !== undefined) {
            const node = nodesRef.current[instanceId]
            if (node) {
              hoverNode(node.id)
            }
          }
        } else {
          hoverNode(null)
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove)

    // 9. 双击事件
    const handleDoubleClick = () => {
      if (hoveredNodeId && hoveredNodeId !== null) {
        likeNode(hoveredNodeId)
      }
    }

    window.addEventListener('dblclick', handleDoubleClick)

    // 10. 初始化节点
    const initialNodes = generateInitialNodes(INITIAL_NODES)
    initialNodes.forEach(node => addNode(node))

    // 8. 动画循环
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // 7. 处理窗口大小变化
    const handleResize = () => {
      if (!camera || !renderer) return
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    // 清理
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('dblclick', handleDoubleClick)
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
      controls.dispose()
      if (geometryRef.current) geometryRef.current.dispose()
      if (materialRef.current) materialRef.current.dispose()
    }
  }, [addNode, hoverNode, likeNode, hoveredNodeId])

  // 更新 InstancedMesh
  useEffect(() => {
    if (!instancedMeshRef.current) return

    const mesh = instancedMeshRef.current
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()

    // 更新每个 instance
    for (let i = 0; i < MAX_NODES; i++) {
      const node = nodes[i]

      if (node) {
        // 设置位置
        dummy.position.set(node.position.x, node.position.y, node.position.z)

        // 设置缩放 (基于权重)
        const scale = 0.5 + node.weight * 2
        dummy.scale.set(scale, scale, scale)

        // 设置旋转 (轻微随机旋转)
        dummy.rotation.set(
          node.position.x * 0.1,
          node.position.y * 0.1,
          node.position.z * 0.1
        )

        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)

        // 设置颜色
        if (node.liked) {
          // 被喜欢：金色发光
          color.setHex(0xffd700)
          mesh.setColorAt(i, color)
        } else if (node.hover) {
          // 悬停：青色高亮
          color.setHex(0x00ffff)
          mesh.setColorAt(i, color)
        } else {
          // 默认：基于权重的渐变色
          const hue = 0.6 + node.weight * 0.2 // 蓝色到紫色
          const saturation = 0.5 + node.weight * 0.5
          const value = 0.3 + node.weight * 0.7
          color.setHSL(hue, saturation, value)
          mesh.setColorAt(i, color)
        }
      } else {
        // 隐藏未使用的 instance
        dummy.position.set(0, 0, 0)
        dummy.scale.set(0, 0, 0)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  }, [nodes])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 0,
      }}
    />
  )
}

import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../store/gameStore'
import { LEVEL_AREAS, LEVEL_ACTIONS, BOSS_ROUTE, BOSS_SPAWN, PLAYER_SPAWN } from '../data/level1'
import { GAME_CONFIG } from '../game/config'
import { isPointInVisionCone } from '../game/vision'
import type { AreaId, PlayerAction, Point } from '../types/game'

/** Three.js 3D 办公室场景 - 参照产品图的俯视视角 */
export function OfficeScene3D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef({
    renderer: null as THREE.WebGLRenderer | null,
    scene: null as THREE.Scene | null,
    camera: null as THREE.OrthographicCamera | null,
    animId: 0,
    player: null as THREE.Group | null,
    boss: null as THREE.Group | null,
    visionCone: null as THREE.Mesh | null,
    exposureMs: 0,
    bossRouteIdx: 0,
    bossFacing: Math.PI / 2,
    playerTarget: null as Point | null,
    isMoving: false,
    bossTarget: null as Point | null,
    patrolTimer: null as ReturnType<typeof setTimeout> | null,
    bossPatrolling: false,
    fishPopup: 0, salaryPopup: 0, popupTimer: 0,
  })

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const s = stateRef.current
    if (!s.scene || !s.camera || !s.player) return
    const store = useGameStore.getState()
    if (store.phase !== 'playing' || store.guideOpen || performance.now() < store.stunnedUntil || store.currentAction === 'moving') return

    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    // 将 NDC 转换到世界坐标 (1080x760 空间)
    const worldX = (x + 1) / 2 * 1080
    const worldY = (1 - y) / 2 * 760

    const area = detectArea({ x: worldX, y: worldY })
    if (area === 'bossOffice') return

    s.playerTarget = { x: worldX, y: worldY }
    s.isMoving = true
    store.setAction('moving', true)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const s = stateRef.current

    // 场景
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x121821)
    s.scene = scene

    // 正交相机（俯视角）
    const aspect = 1080 / 760
    const frustum = 760
    const camera = new THREE.OrthographicCamera(-frustum * aspect / 2, frustum * aspect / 2, frustum / 2, -frustum / 2, 0.1, 2000)
    camera.position.set(540, 800, 380)
    camera.lookAt(540, 0, 380)
    s.camera = camera

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(1080, 760)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)
    s.renderer = renderer

    // 灯光
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(540, 600, 380)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.set(2048, 2048)
    dirLight.shadow.camera.left = -600; dirLight.shadow.camera.right = 600
    dirLight.shadow.camera.top = 400; dirLight.shadow.camera.bottom = -400
    scene.add(dirLight)

    // 地板
    const floorGeo = new THREE.PlaneGeometry(1080, 760)
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1f2e, roughness: 0.9 })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.set(540, 0, 380)
    floor.receiveShadow = true
    scene.add(floor)

    // 加载产品图作为纹理
    const loader = new THREE.TextureLoader()
    const areas = [
      { id: 'bossOffice', img: '/images/bossOffice.png', ...LEVEL_AREAS.bossOffice },
      { id: 'workstation', img: '/images/workstation.png', ...LEVEL_AREAS.workstation },
      { id: 'pantry', img: '/images/breakroom.png', ...LEVEL_AREAS.pantry },
      { id: 'restroom', img: '/images/restroom.png', ...LEVEL_AREAS.restroom },
    ]

    for (const area of areas) {
      const { rect } = area
      // 区域地板（3D平面，带产品图纹理）
      const geo = new THREE.PlaneGeometry(rect.width, rect.height)
      const mat = new THREE.MeshStandardMaterial({
        color: area.fill,
        roughness: 0.8,
        metalness: 0.1,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(rect.x + rect.width / 2, 0.1, rect.y + rect.height / 2)
      mesh.receiveShadow = true
      scene.add(mesh)

      // 加载纹理叠加
      loader.load(area.img, (tex) => {
        const overlayGeo = new THREE.PlaneGeometry(rect.width, rect.height)
        const overlayMat = new THREE.MeshStandardMaterial({
          map: tex, transparent: true, opacity: 0.5, roughness: 0.9,
        })
        const overlay = new THREE.Mesh(overlayGeo, overlayMat)
        overlay.rotation.x = -Math.PI / 2
        overlay.position.set(rect.x + rect.width / 2, 0.15, rect.y + rect.height / 2)
        scene.add(overlay)
      })

      // 墙壁边框
      const wallMat = new THREE.MeshStandardMaterial({ color: area.stroke, roughness: 0.5 })
      const wallH = 8
      // 四面墙
      const walls = [
        { w: rect.width + 4, d: 2, x: rect.x + rect.width / 2, z: rect.y - 2 },
        { w: rect.width + 4, d: 2, x: rect.x + rect.width / 2, z: rect.y + rect.height + 2 },
        { w: 2, d: rect.height + 4, x: rect.x - 2, z: rect.y + rect.height / 2 },
        { w: 2, d: rect.height + 4, x: rect.x + rect.width + 2, z: rect.y + rect.height / 2 },
      ]
      for (const w of walls) {
        const wallGeo = new THREE.BoxGeometry(w.w, wallH, w.d)
        const wall = new THREE.Mesh(wallGeo, wallMat)
        wall.position.set(w.x, wallH / 2, w.z)
        wall.castShadow = true
        scene.add(wall)
      }
    }

    // 走廊地板
    const corr = LEVEL_AREAS.corridor
    const corrGeo = new THREE.PlaneGeometry(corr.rect.width, corr.rect.height)
    const corrMat = new THREE.MeshStandardMaterial({ color: corr.fill, roughness: 0.9 })
    const corrMesh = new THREE.Mesh(corrGeo, corrMat)
    corrMesh.rotation.x = -Math.PI / 2
    corrMesh.position.set(corr.rect.x + corr.rect.width / 2, 0.1, corr.rect.y + corr.rect.height / 2)
    corrMesh.receiveShadow = true
    scene.add(corrMesh)

    // 玩家（3D胶囊人）
    const player = createCharacter(0x4488ff, 0x2563eb, '你')
    player.position.set(PLAYER_SPAWN.x, 0, PLAYER_SPAWN.y)
    scene.add(player)
    s.player = player

    // 老板（3D胶囊人，红色）
    const boss = createCharacter(0xff4444, 0x8f1d1d, '老板')
    boss.position.set(BOSS_SPAWN.x, 0, BOSS_SPAWN.y)
    scene.add(boss)
    s.boss = boss

    // 视野锥（3D扇形）
    const coneGeo = new THREE.ConeGeometry(160, 10, 24, 1, true, 0, Math.PI / 2)
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
    const visionCone = new THREE.Mesh(coneGeo, coneMat)
    visionCone.rotation.x = -Math.PI / 2
    visionCone.visible = false
    scene.add(visionCone)
    s.visionCone = visionCone

    // 注册事件
    window.addEventListener('slackfish:start', handleStart)
    window.addEventListener('slackfish:restart', handleStart)
    window.addEventListener('slackfish:move-area', handleMoveArea)
    window.addEventListener('slackfish:set-action', handleSetAction)

    // 游戏循环
    const animate = () => {
      s.animId = requestAnimationFrame(animate)
      const store = useGameStore.getState()
      if (store.phase === 'playing' && !store.guideOpen) {
        const delta = 1 / 60
        updatePlayer(s, delta)
        updateBoss(s, delta)
        updateVision(s)
        updateGameLoop(s, delta)
      }
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(s.animId)
      window.removeEventListener('slackfish:start', handleStart)
      window.removeEventListener('slackfish:restart', handleStart)
      window.removeEventListener('slackfish:move-area', handleMoveArea)
      window.removeEventListener('slackfish:set-action', handleSetAction)
      if (s.patrolTimer) clearTimeout(s.patrolTimer)
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} onClick={handleCanvasClick} className="cursor-pointer" style={{ width: 1080, height: 760 }} />
}

// 3D 角色创建
function createCharacter(bodyColor: number, suitColor: number, label: string): THREE.Group {
  const group = new THREE.Group()

  // 身体
  const bodyGeo = new THREE.CylinderGeometry(18, 18, 30, 16)
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.6 })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = 15
  body.castShadow = true
  group.add(body)

  // 头
  const headGeo = new THREE.SphereGeometry(12, 16, 12)
  const headMat = new THREE.MeshStandardMaterial({ color: 0xf7d08a, roughness: 0.7 })
  const head = new THREE.Mesh(headGeo, headMat)
  head.position.y = 36
  head.castShadow = true
  group.add(head)

  // 头发
  const hairGeo = new THREE.SphereGeometry(13, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x222222 })
  const hair = new THREE.Mesh(hairGeo, hairMat)
  hair.position.y = 38
  group.add(hair)

  // 领带/标记
  const tieGeo = new THREE.ConeGeometry(4, 16, 4)
  const tieMat = new THREE.MeshStandardMaterial({ color: suitColor })
  const tie = new THREE.Mesh(tieGeo, tieMat)
  tie.position.y = 12
  tie.rotation.x = Math.PI
  group.add(tie)

  // 底部阴影圈
  const shadowGeo = new THREE.CircleGeometry(20, 16)
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 })
  const shadow = new THREE.Mesh(shadowGeo, shadowMat)
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.1
  group.add(shadow)

  return group
}

const isInsideRect = (p: Point, r: { x: number; y: number; width: number; height: number }) =>
  p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height

const detectArea = (p: Point): AreaId => {
  const order: AreaId[] = ['bossOffice', 'workstation', 'pantry', 'restroom', 'corridor']
  for (const id of order) {
    if (id !== 'corridor' && isInsideRect(p, LEVEL_AREAS[id].rect)) return id
  }
  return 'corridor'
}

const moveTowards = (from: Point, to: Point, dist: number) => {
  const dx = to.x - from.x; const dy = to.y - from.y; const len = Math.hypot(dx, dy)
  if (len <= dist || len === 0) return { point: to, arrived: true, angle: Math.atan2(dy, dx) }
  const r = dist / len
  return { point: { x: from.x + dx * r, y: from.y + dy * r }, arrived: false, angle: Math.atan2(dy, dx) }
}

function updatePlayer(s: typeof stateRef extends React.RefObject<infer T> ? T : never, dt: number) {
  if (!s.player || !s.playerTarget) return
  const store = useGameStore.getState()
  const cur = { x: s.player.position.x, y: s.player.position.z }
  const next = moveTowards(cur, s.playerTarget, GAME_CONFIG.movement.playerSpeed * dt)
  s.player.position.x = next.point.x
  s.player.position.z = next.point.y
  store.setArea(detectArea(next.point))
  if (next.arrived) { s.playerTarget = null; s.isMoving = false; store.setAction('idle', true) }
}

function updateBoss(s: typeof stateRef extends React.RefObject<infer T> ? T : never, dt: number) {
  if (!s.boss || !s.bossTarget) return
  const store = useGameStore.getState()
  if (store.bossStatus !== 'patrolling') return
  const cur = { x: s.boss.position.x, y: s.boss.position.z }
  const next = moveTowards(cur, s.bossTarget, GAME_CONFIG.movement.bossSpeed * dt)
  s.boss.position.x = next.point.x; s.boss.position.z = next.point.y
  s.bossFacing = Number.isFinite(next.angle) ? next.angle : s.bossFacing
  // 旋转角色面向移动方向
  s.boss.rotation.y = -(s.bossFacing - Math.PI / 2)
  if (next.arrived) {
    s.bossRouteIdx++
    if (s.bossRouteIdx >= BOSS_ROUTE.length) {
      finishBossPatrol(s)
    } else {
      s.bossTarget = BOSS_ROUTE[s.bossRouteIdx]
    }
  }
}

function finishBossPatrol(s: typeof stateRef extends React.RefObject<infer T> ? T : never) {
  if (!s.boss) return
  s.boss.position.set(BOSS_SPAWN.x, 0, BOSS_SPAWN.y)
  s.boss.rotation.y = 0; s.bossTarget = null; s.exposureMs = 0
  useGameStore.getState().setBossStatus('resting')
  const delay = Phaser_Math_Between(GAME_CONFIG.timing.bossRestMinMs, GAME_CONFIG.timing.bossRestMaxMs)
  s.patrolTimer = setTimeout(() => startBossWarning(s), delay)
}

function startBossWarning(s: typeof stateRef extends React.RefObject<infer T> ? T : never) {
  const store = useGameStore.getState()
  if (store.phase !== 'playing') return
  store.setBossStatus('warning')
  s.patrolTimer = setTimeout(() => {
    if (useGameStore.getState().phase !== 'playing') return
    useGameStore.getState().setBossStatus('patrolling')
    s.bossRouteIdx = 0; s.bossTarget = BOSS_ROUTE[0]; s.bossPatrolling = true
  }, GAME_CONFIG.timing.bossWarningMs)
}

function startFirstPatrol(s: typeof stateRef extends React.RefObject<infer T> ? T : never) {
  s.patrolTimer = setTimeout(() => startBossWarning(s), GAME_CONFIG.timing.firstPatrolDelayMs)
}

function Phaser_Math_Between(min: number, max: number) { return min + Math.floor(Math.random() * (max - min + 1)) }

function updateVision(s: typeof stateRef extends React.RefObject<infer T> ? T : never) {
  if (!s.visionCone || !s.boss) return
  const store = useGameStore.getState()
  s.visionCone.visible = store.bossStatus === 'patrolling'
  if (!s.visionCone.visible) return
  s.visionCone.position.set(s.boss.position.x, 2, s.boss.position.z)
  s.visionCone.rotation.z = -(s.bossFacing + Math.PI / 2)
}

function updateGameLoop(s: typeof stateRef extends React.RefObject<infer T> ? T : never, dt: number) {
  const store = useGameStore.getState()
  if (!s.player || !s.boss) return

  // 曝光判定
  if (store.bossStatus === 'patrolling' && performance.now() >= store.stunnedUntil) {
    const visible = isPointInVisionCone({
      viewer: { x: s.boss.position.x, y: s.boss.position.z },
      target: { x: s.player.position.x, y: s.player.position.z },
      facingRadians: s.bossFacing, distance: GAME_CONFIG.vision.distance, angleDegrees: GAME_CONFIG.vision.angleDegrees,
    })
    const illegal = isIllegal(store.currentArea, store.currentAction)
    if (visible && illegal) {
      s.exposureMs += dt * 1000
      const pct = Math.min(100, Math.round((s.exposureMs / GAME_CONFIG.timing.illegalExposureMs) * 100))
      store.setThreatText(`暴露中 ${pct}%`)
      if (s.exposureMs >= GAME_CONFIG.timing.illegalExposureMs) catchPlayer(s)
    } else {
      s.exposureMs = 0
    }
  }

  // 经济
  const gains = store.tickEconomy(dt)
  s.fishPopup += gains.fishGain; s.salaryPopup += gains.salaryGain; s.popupTimer += dt
  if (s.popupTimer >= 1) { s.popupTimer = 0; s.fishPopup = 0; s.salaryPopup = 0 }
}

function isIllegal(area: AreaId, action: PlayerAction) {
  if (area === 'restroom' || action === 'working') return false
  if (area !== 'workstation') return true
  return action === 'watching' || action === 'chips'
}

function catchPlayer(s: typeof stateRef extends React.RefObject<infer T> ? T : never) {
  const store = useGameStore.getState()
  let amount = GAME_CONFIG.penalties.awayFromDesk; let title = '离岗警告'
  if (store.currentArea === 'workstation' && (store.currentAction === 'watching' || store.currentAction === 'chips')) { amount = GAME_CONFIG.penalties.workstationFish; title = '轻度警告' }
  else if (store.currentArea === 'pantry') { amount = GAME_CONFIG.penalties.pantryFish; title = '中度处罚' }
  s.exposureMs = 0; s.playerTarget = null; s.isMoving = false
  store.applyCatch(amount, title)
}

// 事件处理函数
function handleStart() {
  // 重置状态由 store 处理
}
function handleMoveArea(e: Event) {
  // 3D场景内移动由store+scene联动处理
}
function handleSetAction(e: Event) {
  // 行为设置由store处理
}

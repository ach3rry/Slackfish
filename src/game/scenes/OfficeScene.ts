import Phaser from 'phaser'
import { LEVEL_ACTIONS, LEVEL_AREAS, BOSS_SPAWN, PLAYER_SPAWN, pickRandomRouteFull } from '../../data/level1'
import { LAYERS } from '../../data/mobileLevelLayout'
import { GAME_CONFIG } from '../config'
import { isPointInVisionCone } from '../vision'
import { useGameStore } from '../../store/gameStore'
import type { AreaId, BossBehavior, PlayerAction, Point, Rect } from '../../types/game'

type Waypoint = { id: string; x: number; y: number; areaId: string; faceDirection: string; waitMs: number; visionEnabled: boolean; action: string }

const areaOrder: AreaId[] = ['workstation', 'pantry', 'restroom', 'bossOffice', 'corridor']
const textStyle = { fontFamily: 'Microsoft YaHei, SimHei, sans-serif', color: '#f8fafc', stroke: '#10131a', strokeThickness: 5 }
const isInsideRect = (p: Point, r: Rect) => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height

const moveTowards = (from: Point, to: Point, dist: number) => {
  const dx = to.x - from.x; const dy = to.y - from.y; const len = Math.hypot(dx, dy)
  if (len <= dist || len === 0) return { point: to, arrived: true, angle: Math.atan2(dy, dx) }
  const r = dist / len
  return { point: { x: from.x + dx * r, y: from.y + dy * r }, arrived: false, angle: Math.atan2(dy, dx) }
}

export class OfficeScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container
  private boss!: Phaser.GameObjects.Container
  private playerSprite!: Phaser.GameObjects.Image
  private bossSprite!: Phaser.GameObjects.Image
  private visionGraphics!: Phaser.GameObjects.Graphics
  private markerGraphics!: Phaser.GameObjects.Graphics
  private actionBadge!: Phaser.GameObjects.Text
  private doorBadge!: Phaser.GameObjects.Text
  private playerTarget: Point | null = null
  private bossTarget: Point | null = null
  private bossRouteIndex = 0
  private currentBossRoute: Waypoint[] = []
  private bossBehavior: BossBehavior = 'resting'
  private bossScanElapsed = 0
  private bossFacing = Math.PI / 2
  private patrolTimer: Phaser.Time.TimerEvent | null = null
  private exposureMs = 0
  private fishPopup = 0
  private salaryPopup = 0
  private popupTimer = 0

  constructor() { super('OfficeScene') }

  preload() {
    this.load.image('scene-bg', 'images2d/mobile-map.png')
    this.load.image('player-idle', 'sprites/employee-idle.png')
    this.load.image('player-walk-1', 'sprites/employee-walk-1.png')
    this.load.image('player-walk-2', 'sprites/employee-walk-2.png')
    this.load.image('player-side', 'sprites/employee-side.png')
    this.load.image('player-work', 'sprites/employee-work.png')
    this.load.image('player-chips', 'sprites/employee-chips.png')
    this.load.image('player-milk-tea', 'sprites/employee-milk-tea.png')
    this.load.image('player-fake-work', 'sprites/employee-fake-work.png')
    this.load.image('player-phone', 'sprites/employee-phone.png')
    this.load.image('boss-idle', 'sprites/boss-idle.png')
    this.load.image('boss-walk-1', 'sprites/boss-walk-1.png')
    this.load.image('boss-walk-2', 'sprites/boss-walk-2.png')
    this.load.image('boss-side', 'sprites/boss-side.png')
    this.load.image('boss-checking', 'sprites/boss-checking.png')
  }

  create() {
    this.cameras.main.setBackgroundColor(GAME_CONFIG.canvas.background)
    this.add.image(LAYERS.map.width / 2, LAYERS.map.height / 2, 'scene-bg').setDisplaySize(LAYERS.map.width, LAYERS.map.height).setDepth(0)
    this.createCharacters()
    this.createOverlays()
    this.registerCommands()
    this.resetScene()
  }

  update(_time: number, delta: number) {
    const state = useGameStore.getState()
    this.updateVisionGraphic()
    this.updateActionBadge()
    if (state.phase !== 'playing' || state.guideOpen) return
    if (state.bossStatus === 'resting' && !this.patrolTimer) {
      this.scheduleBossWarning(GAME_CONFIG.timing.firstPatrolDelayMs)
    }
    const ds = Math.min(delta / 1000, GAME_CONFIG.timing.dtCapSeconds)
    this.updatePlayerMovement(ds)
    this.updateBossBehavior(ds)
    this.updateEconomy(ds)
    this.updateExposure(delta)
    this.updateRestroomLimits(ds)
    this.updateFakeWorkLimit()
  }

  // ── 角色 ──

  private createCharacters() {
    this.player = this.add.container(PLAYER_SPAWN.x, PLAYER_SPAWN.y).setDepth(20)
    this.playerSprite = this.add.image(0, 0, 'player-idle').setDisplaySize(56, 82).setOrigin(0.5, 0.9).setDepth(1)
    const pl = this.add.text(0, 26, '你', { ...textStyle, fontSize: '20px', color: '#bbf7d0' }).setOrigin(0.5).setDepth(2)
    const pShadow = this.add.ellipse(0, 8, 34, 10, 0x000000, 0.25).setDepth(0)
    this.player.add([pShadow, this.playerSprite, pl])

    this.boss = this.add.container(BOSS_SPAWN.x, BOSS_SPAWN.y).setDepth(22)
    this.bossSprite = this.add.image(0, 0, 'boss-idle').setDisplaySize(70, 110).setOrigin(0.5, 0.9).setDepth(1)
    const bl = this.add.text(0, 28, '老板', { ...textStyle, fontSize: '18px', color: '#fecaca' }).setOrigin(0.5).setDepth(2)
    const bShadow = this.add.ellipse(0, 8, 42, 14, 0x000000, 0.25).setDepth(0)
    this.boss.add([bShadow, this.bossSprite, bl])
  }

  private createOverlays() {
    this.visionGraphics = this.add.graphics().setDepth(14)
    this.markerGraphics = this.add.graphics().setDepth(12)
    this.actionBadge = this.add.text(PLAYER_SPAWN.x, PLAYER_SPAWN.y - 70, '待机', { ...textStyle, fontSize: '18px', color: '#e0f2fe' }).setOrigin(0.5).setDepth(30)
    this.doorBadge = this.add.text(BOSS_SPAWN.x, BOSS_SPAWN.y - 88, '老板出门了！', { ...textStyle, fontSize: '28px', color: '#fef08a' }).setOrigin(0.5).setDepth(40).setVisible(false)
  }

  // ── 事件 ──

  private registerCommands() {
    window.addEventListener('slackfish:start', this.handleStart)
    window.addEventListener('slackfish:restart', this.handleRestart)
    window.addEventListener('slackfish:move-area', this.handleMoveArea)
    window.addEventListener('slackfish:set-action', this.handleSetAction)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.removeCommands, this)
    this.events.once(Phaser.Scenes.Events.DESTROY, this.removeCommands, this)
    this.input.on('pointerdown', this.handlePointerDown, this)
    this.input.keyboard?.on('keydown', this.handleKeyDown)
  }

  private removeCommands() {
    window.removeEventListener('slackfish:start', this.handleStart)
    window.removeEventListener('slackfish:restart', this.handleRestart)
    window.removeEventListener('slackfish:move-area', this.handleMoveArea)
    window.removeEventListener('slackfish:set-action', this.handleSetAction)
  }

  private handleStart = () => this.resetScene(true)
  private handleRestart = () => this.resetScene(true)
  private handleMoveArea = (event: Event) => {
    const area = (event as CustomEvent<{ area: AreaId }>).detail.area
    this.movePlayerToArea(area)
  }
  private handleSetAction = (event: Event) => {
    const action = (event as CustomEvent<{ action: PlayerAction }>).detail.action
    const state = useGameStore.getState()
    const config = LEVEL_ACTIONS.find(item => item.id === action)
    if (!config || config.area !== state.currentArea) return
    this.playerTarget = null
    this.markerGraphics.clear()
    useGameStore.getState().setAction(action, true)
  }
  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    this.movePlayerTo({ x: pointer.worldX, y: pointer.worldY })
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    const state = useGameStore.getState()
    if (state.phase === 'won' || state.phase === 'lost') {
      if (event.key === 'r' || event.key === 'R') { state.restartGame(); this.resetScene(true) }
      return
    }
    if (state.phase !== 'playing' || state.guideOpen) return
    const keyMap: Record<string, PlayerAction> = {
      '1': 'working', '2': 'watching', '3': 'chips',
      '4': 'milkTea', '5': 'chatting', '6': 'fakeWorking', '7': 'phone',
    }
    if (keyMap[event.key]) {
      const action = keyMap[event.key]
      const config = LEVEL_ACTIONS.find(item => item.id === action)
      if (config && config.area === state.currentArea) {
        this.playerTarget = null; this.markerGraphics.clear()
        useGameStore.getState().setAction(action, true)
      }
    }
    if (event.key === ' ') { this.playerTarget = null; this.markerGraphics.clear(); useGameStore.getState().setAction('idle', true) }
    if (event.key === 'p' || event.key === 'P') this.catchPlayer()
  }

  private resetScene(startPatrol = false) {
    this.player.setPosition(PLAYER_SPAWN.x, PLAYER_SPAWN.y)
    this.boss.setPosition(BOSS_SPAWN.x, BOSS_SPAWN.y)
    this.playerTarget = null
    this.bossTarget = null
    this.bossRouteIndex = 0
    this.currentBossRoute = []
    this.bossBehavior = 'resting'
    this.bossScanElapsed = 0
    this.bossFacing = Math.PI / 2
    this.exposureMs = 0
    this.fishPopup = 0
    this.salaryPopup = 0
    this.popupTimer = 0
    this.playerSprite.setTexture('player-idle').setDisplaySize(56, 82).setFlipX(false)
    this.bossSprite.setTexture('boss-idle').setDisplaySize(70, 110).setFlipX(false)
    this.markerGraphics.clear()
    this.doorBadge.setVisible(false)
    this.clearPatrolTimer()
    const store = useGameStore.getState()
    store.setArea('workstation')
    store.setAction('idle', true)
    store.setBossStatus('resting')
    store.setBossBehavior('resting')
    store.setThreatText('休息中')
    if (startPatrol) this.scheduleBossWarning(GAME_CONFIG.timing.firstPatrolDelayMs)
  }

  // ── 玩家移动 ──

  private movePlayerTo(target: Point) {
    const state = useGameStore.getState()
    if (state.phase !== 'playing' || state.guideOpen || performance.now() < state.stunnedUntil) return
    const ta = this.detectArea(target)
    if (ta === 'bossOffice') {
      this.showFloatingText('老板办公室进不去', this.player.x, this.player.y - 72, '#fca5a5'); return
    }
    if (ta === 'restroom' && state.restroomEntries >= GAME_CONFIG.limits.restroomMaxEntries) {
      this.showFloatingText('卫生间次数已用完', this.player.x, this.player.y - 72, '#fca5a5'); return
    }
    this.cancelActionForMovement()
    this.playerTarget = target
    useGameStore.getState().setAction('moving', true)
    this.drawMoveMarker(target)
  }

  private movePlayerToArea(area: AreaId) {
    const target = LEVEL_AREAS[area]?.center
    if (!target) return
    const state = useGameStore.getState()
    if (state.phase !== 'playing' || state.guideOpen || performance.now() < state.stunnedUntil) return
    if (area === 'bossOffice') return
    if (area === 'restroom' && state.restroomEntries >= GAME_CONFIG.limits.restroomMaxEntries) {
      this.showFloatingText('卫生间次数已用完', this.player.x, this.player.y - 72, '#fca5a5'); return
    }
    this.cancelActionForMovement()
    this.playerTarget = target
    useGameStore.getState().setAction('moving', true)
    this.drawMoveMarker(target)
  }

  private cancelActionForMovement() {
    const state = useGameStore.getState()
    if (state.currentAction === 'fakeWorking') {
      useGameStore.setState({ fakeWorkCooldownUntil: performance.now() + GAME_CONFIG.limits.fakeWorkCooldownMs })
    }
  }

  private drawMoveMarker(target: Point) {
    this.markerGraphics.clear()
    this.markerGraphics.lineStyle(3, 0x38bdf8, 0.88)
    this.markerGraphics.strokeCircle(target.x, target.y, 13)
    this.markerGraphics.lineBetween(this.player.x, this.player.y, target.x, target.y)
  }

  private updatePlayerMovement(ds: number) {
    if (!this.playerTarget) return
    const next = moveTowards({ x: this.player.x, y: this.player.y }, this.playerTarget, GAME_CONFIG.movement.playerSpeed * ds)
    this.player.setPosition(next.point.x, next.point.y)
    this.updateMovingSprite(this.playerSprite, next.angle, 'player')
    const area = this.detectArea(next.point)
    const store = useGameStore.getState()
    const prevArea = store.currentArea
    store.setArea(area)
    if (area === 'restroom' && prevArea !== 'restroom') {
      useGameStore.setState(s => ({ restroomEntries: s.restroomEntries + 1, restroomEntryStartMs: performance.now(), restroomLastWarningMs: 0 }))
    }
    if (next.arrived) {
      this.playerTarget = null
      this.markerGraphics.clear()
      this.assignDefaultAction(area)
      this.playerSprite.setTexture('player-idle').setDisplaySize(56, 82).setFlipX(false)
    }
  }

  private assignDefaultAction(area: AreaId) {
    const store = useGameStore.getState()
    if (store.currentAction === 'moving' || store.currentAction === 'idle') {
      const def = GAME_CONFIG.defaults.areaActions[area]
      const config = def ? LEVEL_ACTIONS.find(item => item.id === def && item.area === area) : null
      if (config) { store.setAction(def, true); return }
    }
    useGameStore.getState().setAction('idle', true)
  }

  // ── 老板巡逻 ──

  private scheduleBossWarning(delay: number) {
    this.clearPatrolTimer()
    this.patrolTimer = this.time.delayedCall(delay, () => this.startBossWarning())
  }

  private startBossWarning() {
    const state = useGameStore.getState()
    if (state.phase !== 'playing') return
    state.setBossStatus('warning')
    state.setBossBehavior('warning')
    this.doorBadge.setVisible(true).setAlpha(1)
    this.showFloatingText('老板出门了！', BOSS_SPAWN.x, BOSS_SPAWN.y - 92, '#fef08a')
    this.tweens.add({ targets: this.doorBadge, scaleX: 1.08, scaleY: 1.08, yoyo: true, repeat: 3, duration: 120 })
    this.cameras.main.shake(160, 0.003)
    this.patrolTimer = this.time.delayedCall(GAME_CONFIG.timing.bossWarningMs, () => this.startBossOpening())
  }

  private startBossOpening() {
    const state = useGameStore.getState()
    if (state.phase !== 'playing') return
    this.bossBehavior = 'opening'
    state.setBossBehavior('opening')
    state.setThreatText('老板起身了')
    this.tweens.add({
      targets: this.boss, scaleX: 1.08, scaleY: 1.08, duration: GAME_CONFIG.boss.openingMs,
      yoyo: true, onComplete: () => this.startPatrol(),
    })
  }

  private startPatrol() {
    const state = useGameStore.getState()
    if (state.phase !== 'playing') return
    this.bossBehavior = 'patrolling'
    state.setBossStatus('patrolling')
    state.setBossBehavior('patrolling')
    this.doorBadge.setVisible(false)
    this.currentBossRoute = pickRandomRouteFull()
    this.bossRouteIndex = 0
    this.bossTarget = this.currentBossRoute[0] ? { x: this.currentBossRoute[0].x, y: this.currentBossRoute[0].y } : null
  }

  private updateBossBehavior(ds: number) {
    const state = useGameStore.getState()

    if (this.bossBehavior === 'returning') {
      if (!this.bossTarget) { this.enterBossRest(); return }
      const next = moveTowards({ x: this.boss.x, y: this.boss.y }, this.bossTarget, GAME_CONFIG.movement.bossSpeed * ds)
      this.boss.setPosition(next.point.x, next.point.y)
      this.bossFacing = Number.isFinite(next.angle) ? next.angle : this.bossFacing
      this.updateMovingSprite(this.bossSprite, this.bossFacing, 'boss')
      if (next.arrived) this.enterBossRest()
      return
    }

    if (state.bossStatus !== 'patrolling') return

    if (this.bossBehavior === 'scanning') {
      this.bossScanElapsed += ds * 1000
      this.bossFacing = this.bossFacing + GAME_CONFIG.boss.scanRotationSpeed * ds
      return
    }

    if (this.bossBehavior === 'opening') return

    if (!this.bossTarget) return
    const next = moveTowards({ x: this.boss.x, y: this.boss.y }, this.bossTarget, GAME_CONFIG.movement.bossSpeed * ds)
    this.boss.setPosition(next.point.x, next.point.y)
    this.bossFacing = Number.isFinite(next.angle) ? next.angle : this.bossFacing
    this.updateMovingSprite(this.bossSprite, this.bossFacing, 'boss')
    if (next.arrived) this.handleWaypointArrival()
  }

  private handleWaypointArrival() {
    const wp = this.currentBossRoute[this.bossRouteIndex]
    if (!wp) { this.advanceBossRoute(); return }

    if (wp.action === 'scan') {
      this.bossBehavior = 'scanning'
      this.bossScanElapsed = 0
      useGameStore.getState().setBossBehavior('scanning')
      this.bossSprite.setTexture('boss-checking').setDisplaySize(70, 110)
      this.time.delayedCall(GAME_CONFIG.boss.scanDurationMs, () => {
        if (this.bossBehavior === 'scanning') this.advanceBossRoute()
      })
    } else if (wp.action === 'check') {
      this.bossSprite.setTexture('boss-checking').setDisplaySize(70, 110)
      this.time.delayedCall(wp.waitMs, () => {
        this.bossSprite.setTexture('boss-idle').setDisplaySize(70, 110)
        this.advanceBossRoute()
      })
    } else {
      this.advanceBossRoute()
    }
  }

  private advanceBossRoute() {
    this.bossRouteIndex += 1
    if (this.bossRouteIndex >= this.currentBossRoute.length) {
      this.finishPatrol()
    } else {
      const wp = this.currentBossRoute[this.bossRouteIndex]
      if (wp) this.bossTarget = { x: wp.x, y: wp.y }
    }
    if (this.bossBehavior !== 'resting' && this.bossBehavior !== 'returning') {
      this.bossBehavior = 'patrolling'
      useGameStore.getState().setBossBehavior('patrolling')
    }
  }

  private finishPatrol() {
    const dist = Math.hypot(this.boss.x - BOSS_SPAWN.x, this.boss.y - BOSS_SPAWN.y)
    if (dist < 20) {
      this.bossSprite.setTexture('boss-idle').setDisplaySize(70, 110).setFlipX(false)
      this.enterBossRest()
    } else {
      this.bossTarget = { x: BOSS_SPAWN.x, y: BOSS_SPAWN.y }
      this.bossBehavior = 'returning'
      useGameStore.getState().setBossBehavior('returning')
    }
  }

  private enterBossRest() {
    this.boss.setPosition(BOSS_SPAWN.x, BOSS_SPAWN.y)
    this.bossTarget = null
    this.bossBehavior = 'resting'
    this.bossSprite.setTexture('boss-idle').setDisplaySize(70, 110).setFlipX(false)
    this.exposureMs = 0
    const store = useGameStore.getState()
    store.setBossStatus('resting')
    store.setBossBehavior('resting')
    this.scheduleBossWarning(Phaser.Math.Between(GAME_CONFIG.timing.bossRestMinMs, GAME_CONFIG.timing.bossRestMaxMs))
  }

  // ── 视野锥 ──

  private updateVisionGraphic() {
    const state = useGameStore.getState()
    this.visionGraphics.clear()
    if (state.bossStatus !== 'patrolling' && this.bossBehavior !== 'returning') return
    const range = GAME_CONFIG.vision.distance
    const halfAngle = (GAME_CONFIG.vision.angleDegrees * Math.PI) / 360
    const segments = 24
    const pulse = 0.28 + Math.sin(this.time.now / 400) * 0.06
    const bx = this.boss.x; const by = this.boss.y
    const outer = [new Phaser.Math.Vector2(bx, by)]
    for (let i = 0; i <= segments; i++) {
      const a = this.bossFacing - halfAngle + (i / segments) * halfAngle * 2
      outer.push(new Phaser.Math.Vector2(bx + Math.cos(a) * (range + 20), by + Math.sin(a) * (range + 20)))
    }
    this.visionGraphics.fillStyle(0xff2626, pulse * 0.3)
    this.visionGraphics.fillPoints(outer, true)
    const pts = [new Phaser.Math.Vector2(bx, by)]
    for (let i = 0; i <= segments; i++) {
      const a = this.bossFacing - halfAngle + (i / segments) * halfAngle * 2
      pts.push(new Phaser.Math.Vector2(bx + Math.cos(a) * range, by + Math.sin(a) * range))
    }
    this.visionGraphics.fillStyle(0xff2626, pulse)
    this.visionGraphics.fillPoints(pts, true)
    this.visionGraphics.lineStyle(2, 0xff6666, 0.5)
    this.visionGraphics.lineBetween(bx, by, bx + Math.cos(this.bossFacing) * range, by + Math.sin(this.bossFacing) * range)
    this.visionGraphics.lineStyle(2, 0xff4444, 0.65)
    this.visionGraphics.strokePoints(pts, true)
    if (this.exposureMs > 0) {
      this.visionGraphics.fillStyle(0xff0000, 0.15 + Math.sin(this.time.now / 80) * 0.1)
      this.visionGraphics.fillPoints(pts, true)
    }
  }

  // ── 暴露检测 ──

  private updateExposure(deltaMs: number) {
    const store = useGameStore.getState()
    if (performance.now() < store.stunnedUntil || (store.bossStatus !== 'patrolling' && this.bossBehavior !== 'returning')) return
    if (this.bossBehavior === 'returning') {
      this.exposureMs = Math.max(0, this.exposureMs - deltaMs * GAME_CONFIG.exposure.decayMultiplier)
      return
    }
    const visible = isPointInVisionCone({
      viewer: { x: this.boss.x, y: this.boss.y },
      target: { x: this.player.x, y: this.player.y },
      facingRadians: this.bossFacing,
      distance: GAME_CONFIG.vision.distance,
      angleDegrees: GAME_CONFIG.vision.angleDegrees,
    })
    if (!visible) {
      this.exposureMs = Math.max(0, this.exposureMs - deltaMs * GAME_CONFIG.exposure.decayMultiplier)
      if (this.bossBehavior !== 'scanning') this.bossSprite.setTexture('boss-walk-1').setDisplaySize(70, 110)
      store.setThreatText(this.exposureMs > 0 ? `暴露衰减 ${Math.round(this.exposureMs / GAME_CONFIG.exposure.thresholdMs * 100)}%` : '巡查中')
      return
    }

    const info = this.getExposureInfo(store.currentArea, store.currentAction)
    if (info.safe) { store.setThreatText('安全区域'); return }
    if (info.legal) { this.exposureMs = 0; store.setThreatText('老板看着你'); return }

    this.exposureMs += deltaMs * info.multiplier
    const pct = Math.min(100, Math.round((this.exposureMs / GAME_CONFIG.exposure.thresholdMs) * 100))
    store.setThreatText(pct >= 80 ? `危险！${pct}%` : `暴露中 ${pct}%`)
    this.bossSprite.setTexture('boss-checking').setDisplaySize(70, 110)
    if (this.exposureMs >= GAME_CONFIG.exposure.thresholdMs) this.catchPlayer()
  }

  private getExposureInfo(area: AreaId, action: PlayerAction) {
    if (area === 'restroom') return { safe: true, legal: false, multiplier: 0 }
    if (action === 'working' || action === 'idle' || action === 'moving') return { safe: false, legal: true, multiplier: 0 }
    const m = GAME_CONFIG.exposure.multipliers
    if (action === 'fakeWorking') return { safe: false, legal: false, multiplier: m.fakeWorking }
    return { safe: false, legal: false, multiplier: (m as Record<string, number>)[area] ?? m.corridor }
  }

  private catchPlayer() {
    const store = useGameStore.getState()
    const { amount, title } = this.getPenalty(store.currentArea, store.currentAction)
    this.exposureMs = 0
    this.playerTarget = null
    this.markerGraphics.clear()
    store.applyCatch(amount, title)
    this.showFloatingText(`${title} -${amount}`, this.player.x, this.player.y - 70, '#fb7185')
    this.showFloatingText('被抓了！', this.player.x, this.player.y - 100, '#fbbf24')
    this.cameras.main.shake(300, 0.01)
    this.cameras.main.flash(200, 255, 60, 60)
  }

  private getPenalty(area: AreaId, action: PlayerAction) {
    const p = GAME_CONFIG.penalties
    if (action === 'fakeWorking') return { amount: p.fakeWorkFail, title: '伪装失败' }
    if (action === 'watching') return { amount: p.workstationSlacking, title: '严重警告' }
    if (action === 'chips') return { amount: p.minorSlacking, title: '轻度警告' }
    if (action === 'milkTea' || action === 'chatting') return { amount: p.pantrySlacking, title: '重度处罚' }
    return { amount: p.offSeat, title: '离岗警告' }
  }

  // ── 时限系统 ──

  private updateRestroomLimits(ds: number) {
    const state = useGameStore.getState()
    if (state.currentArea !== 'restroom') return
    const now = performance.now()

    if (state.currentAction === 'phone') {
      const newTotal = state.restroomPhoneTotalMs + ds * 1000
      if (newTotal >= GAME_CONFIG.limits.restroomPhoneMaxMs) {
        useGameStore.getState().setAction('idle', true)
        this.showFloatingText('手机时间用完了', this.player.x, this.player.y - 72, '#fca5a5')
        return
      }
      useGameStore.setState({ restroomPhoneTotalMs: newTotal })
    }

    if (state.restroomEntryStartMs > 0) {
      const stay = now - state.restroomEntryStartMs
      if (stay >= GAME_CONFIG.limits.restroomStayAutoStopMs && state.currentAction === 'phone') {
        useGameStore.getState().setAction('idle', true)
        this.showFloatingText('待太久了，自动停止', this.player.x, this.player.y - 72, '#fca5a5')
      } else if (stay >= GAME_CONFIG.limits.restroomWarningMs && (state.restroomLastWarningMs === 0 || now - state.restroomLastWarningMs >= GAME_CONFIG.limits.restroomWarningIntervalMs)) {
        this.showFloatingText('注意：别待太久！', this.player.x, this.player.y - 92, '#fef08a')
        useGameStore.setState({ restroomLastWarningMs: now })
      }
    }
  }

  private updateFakeWorkLimit() {
    const state = useGameStore.getState()
    if (state.currentAction !== 'fakeWorking' || state.fakeWorkStartMs === 0) return
    if (performance.now() - state.fakeWorkStartMs >= GAME_CONFIG.limits.fakeWorkMaxMs) {
      useGameStore.setState({ fakeWorkCooldownUntil: performance.now() + GAME_CONFIG.limits.fakeWorkCooldownMs })
      useGameStore.getState().setAction('idle', true)
      this.showFloatingText('假装工作暴露了', this.player.x, this.player.y - 72, '#fca5a5')
    }
  }

  // ── 经济 ──

  private updateEconomy(ds: number) {
    const gains = useGameStore.getState().tickEconomy(ds)
    this.fishPopup += gains.fishGain
    this.salaryPopup += gains.salaryGain
    this.popupTimer += ds
    if (this.popupTimer < 1) return
    if (this.fishPopup >= 0.8) this.showFloatingText(`+${Math.round(this.fishPopup)} 摸鱼`, this.player.x, this.player.y - 62, '#fef3c7')
    if (this.salaryPopup >= 0.8) this.showFloatingText(`+${Math.round(this.salaryPopup)} 工资`, this.player.x, this.player.y - 88, '#86efac')
    this.popupTimer = 0
    this.fishPopup = 0
    this.salaryPopup = 0
  }

  // ── 精灵切换 ──

  private updateActionBadge() {
    const state = useGameStore.getState()
    const action = LEVEL_ACTIONS.find(item => item.id === state.currentAction)
    const label = state.currentAction === 'moving' ? '移动中' : state.currentAction === 'idle' ? '待机' : `${action?.icon ?? ''} ${action?.name ?? '待机'}`
    this.actionBadge.setText(action?.disguise ? `${label}～伪装中` : label).setPosition(this.player.x, this.player.y - 72)
    if (!this.playerTarget) this.updatePlayerActionSprite(state.currentAction)
  }

  private updateMovingSprite(sprite: Phaser.GameObjects.Image, angle: number, owner: 'player' | 'boss') {
    const frame = Math.floor(this.time.now / 180) % 2 === 0 ? 'walk-1' : 'walk-2'
    const horizontal = Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))
    if (owner === 'player') {
      sprite.setTexture(horizontal ? 'player-side' : `player-${frame}`).setDisplaySize(56, 82)
      sprite.setFlipX(horizontal && Math.cos(angle) < 0)
      return
    }
    sprite.setTexture(horizontal ? 'boss-side' : `boss-${frame}`).setDisplaySize(horizontal ? 64 : 70, 110)
    sprite.setFlipX(horizontal && Math.cos(angle) < 0)
  }

  private updatePlayerActionSprite(action: PlayerAction) {
    const texture = action === 'working' ? 'player-work'
      : action === 'chips' ? 'player-chips'
        : action === 'milkTea' || action === 'chatting' ? 'player-milk-tea'
          : action === 'fakeWorking' ? 'player-fake-work'
            : action === 'phone' ? 'player-phone'
              : 'player-idle'
    const large = texture !== 'player-idle'
    this.playerSprite.setTexture(texture).setFlipX(false).setDisplaySize(large ? 132 : 56, large ? 118 : 82)
  }

  // ── 工具 ──

  private detectArea(point: Point): AreaId {
    const exact = areaOrder.find(id => id !== 'corridor' && isInsideRect(point, LEVEL_AREAS[id].rect))
    return exact ?? 'corridor'
  }

  private showFloatingText(text: string, x: number, y: number, color: string) {
    const label = this.add.text(x, y, text, { ...textStyle, fontSize: '22px', color }).setOrigin(0.5).setDepth(50)
    this.tweens.add({ targets: label, y: y - 34, alpha: 0, duration: 900, ease: 'Sine.easeOut', onComplete: () => label.destroy() })
  }

  private clearPatrolTimer() {
    if (this.patrolTimer) { this.patrolTimer.remove(false); this.patrolTimer = null }
  }
}

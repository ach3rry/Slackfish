import Phaser from 'phaser'
import { LEVEL_ACTIONS, LEVEL_AREAS, BOSS_SPAWN, PLAYER_SPAWN } from '../../data/level1'
import { LAYERS } from '../../data/mobileLevelLayout'
import { GAME_CONFIG } from '../config'
import { checkVision, WALL_SEGMENTS } from '../vision'
import { useGameStore } from '../../store/gameStore'
import type { AreaId, BossBehavior, BossMood, PlayerAction, Point, RhythmPhase } from '../../types/game'

type Waypoint = { id: string; x: number; y: number; areaId: string; faceDirection: string; waitMs: number; visionEnabled: boolean; action: string }

const areaOrder: AreaId[] = ['workstation', 'pantry', 'restroom', 'bossOffice', 'corridor']
const textStyle = { fontFamily: 'Microsoft YaHei, SimHei, sans-serif', color: '#f8fafc', stroke: '#10131a', strokeThickness: 5 }
const isInsideRect = (p: Point, r: { x: number; y: number; width: number; height: number }) => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height

const moveTowards = (from: Point, to: Point, dist: number) => {
  const dx = to.x - from.x; const dy = to.y - from.y; const len = Math.hypot(dx, dy)
  if (len <= dist || len === 0) return { point: to, arrived: true, angle: Math.atan2(dy, dx) }
  const r = dist / len
  return { point: { x: from.x + dx * r, y: from.y + dy * r }, arrived: false, angle: Math.atan2(dy, dx) }
}

const bossMoodColor: Record<BossMood, number> = { calm: 0xfca5a5, suspicious: 0xfbbf24, angry: 0xf97316, furious: 0xef4444 }

export class OfficeScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container
  private boss!: Phaser.GameObjects.Container
  private playerSprite!: Phaser.GameObjects.Image
  private bossSprite!: Phaser.GameObjects.Image
  private playerRing!: Phaser.GameObjects.Arc
  private visionGraphics!: Phaser.GameObjects.Graphics
  private markerGraphics!: Phaser.GameObjects.Graphics
  private suspicionBar!: Phaser.GameObjects.Graphics
  private actionBadge!: Phaser.GameObjects.Text
  private doorBadge!: Phaser.GameObjects.Text
  private moodBadge!: Phaser.GameObjects.Text
  private playerTarget: Point | null = null
  private bossTarget: Point | null = null
  private bossRouteIndex = 0
  private currentBossRoute: Waypoint[] = []
  private bossBehavior: BossBehavior = 'resting'
  private bossScanElapsed = 0
  private lastBossArea: string = 'bossOffice'
  private bossFacing = Math.PI / 2
  private patrolTimer: Phaser.Time.TimerEvent | null = null
  private exposureMs = 0
  private fishPopup = 0
  private salaryPopup = 0
  private popupTimer = 0
  private rhythmTimer = 0
  private suspicion = 0
  private bubbleTimer = 0
  private lastPlayerBubbleMs = 0
  private lastBossBubbleMs = 0
  private playerBubbleBg!: Phaser.GameObjects.Graphics
  private playerBubbleText!: Phaser.GameObjects.Text
  private bossBubbleBg!: Phaser.GameObjects.Graphics
  private bossBubbleText!: Phaser.GameObjects.Text
  private playerBubbleAlpha = 0
  private bossBubbleAlpha = 0
  private fakeReturning = false
  private lookBackDone = false
  private suddenStopping = false
  private warningPaused = false
  private warningPauseDone = false
  private exposurePercent = 0
  private currentStage: 'safe' | 'warning' | 'danger' = 'safe'
  private vignetteGraphics!: Phaser.GameObjects.Graphics
  private heartbeatGraphics!: Phaser.GameObjects.Graphics
  private lingerFacingUntil = 0
  private bossLockOn = false

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
    this.load.image('boss-scolding', 'sprites/boss-scolding.png')
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
    this.updateSuspicionBar()
    if (state.phase !== 'playing' || state.guideOpen || state.subPage) return

    if (state.bossStatus === 'resting' && !this.patrolTimer) {
      this.scheduleBossWarning(GAME_CONFIG.timing.firstPatrolDelayMs)
    }

    const ds = Math.min(delta / 1000, GAME_CONFIG.timing.dtCapSeconds)
    const deltaMs = Math.min(delta, GAME_CONFIG.timing.dtCapSeconds * 1000)

    this.updateRhythm(deltaMs)
    this.updatePlayerMovement(ds)
    this.updateBossAI(ds, deltaMs)
    this.updateEconomy(ds)
    this.updateExposure(deltaMs)
    this.updateSuspicion(ds)
    this.updateRestroomLimits(ds)
    this.updateFakeWorkLimit()
    this.updateAutoBubble(deltaMs)
  }

  // ── 角色 ──

  private createCharacters() {
    this.player = this.add.container(PLAYER_SPAWN.x, PLAYER_SPAWN.y).setDepth(20)
    this.playerSprite = this.add.image(0, 0, 'player-idle').setDisplaySize(64, 94).setOrigin(0.5, 0.9).setDepth(1)
    this.playerRing = this.add.arc(0, -10, 26, 0, 360, false, 0x66bb6a, 0).setDepth(2).setStrokeStyle(2.5, 0x66bb6a, 0.7)
    const pl = this.add.text(0, 26, '你', { ...textStyle, fontSize: '20px', color: '#bbf7d0' }).setOrigin(0.5).setDepth(3)
    const pShadow = this.add.ellipse(0, 8, 34, 10, 0x000000, 0.25).setDepth(0)
    this.player.add([pShadow, this.playerSprite, this.playerRing, pl])

    this.boss = this.add.container(BOSS_SPAWN.x, BOSS_SPAWN.y).setDepth(22)
    this.bossSprite = this.add.image(0, 0, 'boss-idle').setDisplaySize(78, 122).setOrigin(0.5, 0.9).setDepth(1)
    const bl = this.add.text(0, 28, '老板', { ...textStyle, fontSize: '18px', color: '#fecaca' }).setOrigin(0.5).setDepth(2)
    const bShadow = this.add.ellipse(0, 8, 42, 14, 0x000000, 0.25).setDepth(0)
    this.boss.add([bShadow, this.bossSprite, bl])
  }

  private createOverlays() {
    this.visionGraphics = this.add.graphics().setDepth(14)
    this.markerGraphics = this.add.graphics().setDepth(12)
    this.suspicionBar = this.add.graphics().setDepth(31)
    this.vignetteGraphics = this.add.graphics().setDepth(40)
    this.heartbeatGraphics = this.add.graphics().setDepth(15)
    // Bubble overlays
    this.playerBubbleBg = this.add.graphics().setDepth(54)
    this.playerBubbleText = this.add.text(0, 0, '', {
      fontFamily: 'Microsoft YaHei, SimHei, sans-serif', fontSize: '22px', color: '#e0f2fe',
      stroke: '#0a0a0f', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(55).setAlpha(0)
    this.bossBubbleBg = this.add.graphics().setDepth(54)
    this.bossBubbleText = this.add.text(0, 0, '', {
      fontFamily: 'Microsoft YaHei, SimHei, sans-serif', fontSize: '22px', color: '#fca5a5',
      stroke: '#0a0a0f', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(55).setAlpha(0)
    this.actionBadge = this.add.text(PLAYER_SPAWN.x, PLAYER_SPAWN.y - 70, '待机', { ...textStyle, fontSize: '18px', color: '#e0f2fe' }).setOrigin(0.5).setDepth(30)
    this.doorBadge = this.add.text(BOSS_SPAWN.x, BOSS_SPAWN.y - 88, '老板出门了！', { ...textStyle, fontSize: '28px', color: '#fef08a' }).setOrigin(0.5).setDepth(41).setVisible(false)
    this.moodBadge = this.add.text(BOSS_SPAWN.x, BOSS_SPAWN.y - 110, '', { ...textStyle, fontSize: '16px' }).setOrigin(0.5).setDepth(41)
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
  private pendingActionTimer: Phaser.Time.TimerEvent | null = null

  private handleSetAction = (event: Event) => {
    const action = (event as CustomEvent<{ action: PlayerAction }>).detail.action
    const state = useGameStore.getState()
    const config = LEVEL_ACTIONS.find(item => item.id === action)
    if (!config || config.area !== state.currentArea) return
    this.playerTarget = null
    this.markerGraphics.clear()
    this.sayP('act_' + action)
    if (state.currentAction !== 'idle') {
      useGameStore.getState().setAction('idle', true)
      if (this.pendingActionTimer) this.pendingActionTimer.remove(false)
      this.pendingActionTimer = this.time.delayedCall(120, () => { this.pendingActionTimer = null; useGameStore.getState().setAction(action, true) })
    } else {
      useGameStore.getState().setAction(action, true)
    }
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
    this.playerTarget = null; this.bossTarget = null
    this.bossRouteIndex = 0; this.currentBossRoute = []
    this.bossBehavior = 'resting'; this.bossScanElapsed = 0; this.lastBossArea = 'bossOffice'
    this.bossFacing = Math.PI / 2; this.exposureMs = 0
    this.fishPopup = 0; this.salaryPopup = 0; this.popupTimer = 0
    this.suspicion = 0; this.rhythmTimer = 0
    this.fakeReturning = false; this.lookBackDone = false; this.suddenStopping = false
    this.warningPaused = false; this.warningPauseDone = false
    this.exposurePercent = 0; this.currentStage = 'safe'; this.lingerFacingUntil = 0; this.bossLockOn = false
    this.bubbleTimer = 2700; this.playerBubbleAlpha = 0; this.bossBubbleAlpha = 0
    this.playerBubbleBg?.clear(); this.bossBubbleBg?.clear()
    this.playerBubbleText?.setAlpha(0).setText('')
    this.bossBubbleText?.setAlpha(0).setText('')
    this.playerSprite.setTexture('player-idle').setDisplaySize(64, 94).setFlipX(false)
    this.bossSprite.setTexture('boss-idle').setDisplaySize(78, 122).setFlipX(false)
    this.markerGraphics.clear(); this.vignetteGraphics.clear(); this.heartbeatGraphics.clear()
    this.doorBadge.setVisible(false)
    this.playerRing.setStrokeStyle(2.5, 0x66bb6a, 0.7)
    this.clearPatrolTimer()
    const store = useGameStore.getState()
    store.setArea('workstation'); store.setAction('idle', true)
    store.setBossStatus('resting'); store.setBossBehavior('resting')
    store.setSuspicion(0); store.setRhythmPhase('calm'); store.setRhythmTimer(0)
    store.updateDisguiseLevel(); store.setThreatText('休息中')
    if (startPatrol) this.scheduleBossWarning(GAME_CONFIG.timing.firstPatrolDelayMs)
  }

  // ── 玩家移动 ──

  private movePlayerTo(target: Point) {
    const state = useGameStore.getState()
    if (state.phase !== 'playing' || state.guideOpen || performance.now() < state.stunnedUntil) return
    const ta = this.detectArea(target)
    if (ta === 'bossOffice') { this.showFloatingText('老板办公室进不去', this.player.x, this.player.y - 72, '#fca5a5'); return }
    if (ta === 'restroom' && state.restroomEntries >= GAME_CONFIG.limits.restroomMaxEntries) { this.showFloatingText('卫生间次数已用完', this.player.x, this.player.y - 72, '#fca5a5'); return }
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
    if (area === 'restroom' && state.restroomEntries >= GAME_CONFIG.limits.restroomMaxEntries) { this.showFloatingText('卫生间次数已用完', this.player.x, this.player.y - 72, '#fca5a5'); return }
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
    if (area !== prevArea && area !== 'corridor') {
      this.sayP('arrive_' + area)
    }
    if (area === 'restroom' && prevArea !== 'restroom') {
      useGameStore.setState(s => ({ restroomEntries: s.restroomEntries + 1, restroomEntryStartMs: performance.now(), restroomLastWarningMs: 0 }))
    }
    if (next.arrived) {
      this.playerTarget = null; this.markerGraphics.clear()
      this.playerSprite.setTexture('player-idle').setDisplaySize(64, 94).setFlipX(false)
      store.setAction('idle', true)
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

  // ── 节奏系统 ──

  private updateRhythm(deltaMs: number) {
    const store = useGameStore.getState()
    this.rhythmTimer += deltaMs
    const phase = store.rhythmPhase
    const phaseCfg = GAME_CONFIG.rhythm.phases[phase]
    if (!phaseCfg) return

    if (this.rhythmTimer >= Phaser.Math.Between(phaseCfg.durationMin * 1000, phaseCfg.durationMax * 1000)) {
      const order = GAME_CONFIG.rhythm.phaseOrder
      const idx = order.indexOf(phase)
      const nextPhase = order[(idx + 1) % order.length]
      store.setRhythmPhase(nextPhase as RhythmPhase)
      this.rhythmTimer = 0

      if (nextPhase === 'pressure') {
        this.cameras.main.shake(300, 0.004)
        this.showFloatingText('⚠ 高压阶段！', this.player.x, this.player.y - 100, '#ef4444')
        this.sayP('rhythm_pressure')
        this.sayB('mood_suspicious')
      } else if (nextPhase === 'buffer') {
        this.showFloatingText('喘息中...', this.player.x, this.player.y - 100, '#86efac')
        this.sayP('rhythm_buffer')
      }
    }

    // Rhythm affects suspicion drain
    if (phaseCfg.suspicionDrain !== 0) {
      const drain = phaseCfg.suspicionDrain * (deltaMs / 1000)
      this.suspicion = Math.max(0, Math.min(GAME_CONFIG.suspicion.max, this.suspicion - drain))
      store.setSuspicion(this.suspicion)
    }
  }

  // ── 怀疑值系统 ──

  private updateSuspicion(ds: number) {
    const store = useGameStore.getState()
    const cfg = GAME_CONFIG.suspicion

    // Boss seeing player doing bad things increases suspicion
    if (store.bossStatus === 'patrolling' && this.exposureMs > 0) {
      this.suspicion = Math.min(cfg.max, this.suspicion + cfg.exposureGainPerTick * ds)
    }

    store.setSuspicion(this.suspicion)
  }

  private updateSuspicionBar() {
    const state = useGameStore.getState()
    this.suspicionBar.clear()
    const barW = 60, barH = 6
    const x = this.boss.x - barW / 2
    const y = this.boss.y - 95
    this.suspicionBar.fillStyle(0x333333, 0.5).fillRect(x, y, barW, barH)
    const pct = this.suspicion / GAME_CONFIG.suspicion.max
    const color = pct < 0.3 ? 0xfbbf24 : pct < 0.6 ? 0xf97316 : 0xef4444
    this.suspicionBar.fillStyle(color, 0.8).fillRect(x, y, barW * pct, barH)

    const mood = state.bossMood
    const moodLabel = { calm: '😊', suspicious: '🤨', angry: '😠', furious: '🤬' }[mood]
    this.moodBadge.setText(moodLabel).setPosition(this.boss.x, this.boss.y - 108).setColor(`#${bossMoodColor[mood].toString(16).padStart(6, '0')}`)
  }

  // ── Boss AI (增强) ──

  private getBossSpeed(): number {
    const base = GAME_CONFIG.movement.bossSpeed
    const mood = useGameStore.getState().bossMood
    const ai = GAME_CONFIG.bossAI
    if (mood === 'furious') return base + ai.furiousExtraSpeed
    if (mood === 'angry') return base + ai.angryExtraSpeed
    return base
  }

  private scheduleBossWarning(delay: number) {
    this.clearPatrolTimer()
    const mult = GAME_CONFIG.suspicion.patrolIntervalMultiplier(this.suspicion)
    this.patrolTimer = this.time.delayedCall(delay * mult, () => this.startBossWarning())
  }

  private startBossWarning() {
    const state = useGameStore.getState()
    if (state.phase !== 'playing') return
    state.setBossStatus('warning')
    state.setBossBehavior('warning')
    this.doorBadge.setVisible(true).setAlpha(1)
    this.showFloatingText('老板出门了！', BOSS_SPAWN.x, BOSS_SPAWN.y - 92, '#fef08a')
    this.tweens.add({ targets: this.doorBadge, scaleX: 1.08, scaleY: 1.08, yoyo: true, repeat: 3, duration: 120 })
    this.cameras.main.shake(GAME_CONFIG.feedback.screenShakeOnWarning.duration, GAME_CONFIG.feedback.screenShakeOnWarning.intensity)
    this.sayB('leave_office')
    this.sayP('boss_nearby')
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

  private checkedAreasThisPatrol: Set<string> = new Set()
  private patrolSpotDone = false

  private startPatrol() {
    const state = useGameStore.getState()
    if (state.phase !== 'playing') return
    this.bossBehavior = 'patrolling'
    state.setBossStatus('patrolling')
    state.setBossBehavior('patrolling')
    this.sayB('patrolling')
    this.doorBadge.setVisible(false)
    this.fakeReturning = false; this.lookBackDone = false; this.suddenStopping = false; this.patrolSpotDone = false
    this.checkedAreasThisPatrol = new Set()
    this.currentBossRoute = this.buildDynamicRoute()
    this.bossRouteIndex = 0
    this.bossTarget = this.currentBossRoute[0] ? { x: this.currentBossRoute[0].x, y: this.currentBossRoute[0].y } : null
  }

  private buildDynamicRoute(): Waypoint[] {
    const mk = (id: string, x: number, y: number, faceDirection: string, waitMs: number, action: string, visionEnabled = true): Waypoint => {
      const areaId = x < 467 ? 'workstation' : x >= 608 ? (y < 475 ? 'pantry' : y < 812 ? 'restroom' : 'bossOffice') : 'corridor'
      return { id, x, y, areaId, faceDirection, waitMs, visionEnabled, action }
    }
    const leave = mk('leave-office', 533, 805, 'up', 200, 'walk')
    const scanCorridorMid = mk('scan-corridor-mid', 533, 500, 'left', 500, 'scan')
    const scanCorridorTop = mk('scan-corridor-top', 533, 150, 'left', 500, 'scan')
    const checkWs1 = mk('check-ws-top', 380, 400, 'left', 2200, 'check')
    const checkWs2 = mk('check-ws-deep', 200, 600, 'left', 1800, 'check')
    const checkWs3 = mk('check-ws-bottom', 350, 900, 'left', 1500, 'check')
    const checkTea = mk('check-tea', 700, 232, 'right', 2200, 'check')
    const checkTeaDeep = mk('check-tea-deep', 900, 300, 'left', 1600, 'check')
    const checkRestroom = mk('check-restroom', 590, 635, 'right', 2000, 'check')
    const checkRestroomDeep = mk('check-restroom-deep', 590, 750, 'right', 1500, 'check')
    const returnPt = mk('return-door', 533, 805, 'down', 200, 'return')
    const rest = mk('rest', 844, 1053, 'down', 0, 'rest', false)

    type AreaCheck = { key: string; checks: Waypoint[]; scan: Waypoint }
    const areas: AreaCheck[] = [
      { key: 'workstation', checks: [checkWs1, checkWs2, checkWs3], scan: scanCorridorMid },
      { key: 'pantry', checks: [checkTea, checkTeaDeep], scan: scanCorridorTop },
    ]
    // restroom is a safe zone — boss never patrols there

    const state = useGameStore.getState()
    const mood = state.bossMood
    const playerArea = state.currentArea

    // Mood determines how many areas to check
    const checkCount = mood === 'furious' ? 2 : mood === 'angry' ? 2 : Math.random() < 0.35 ? 1 : 2

    // Sort: player's current area first (but skip restroom — boss doesn't go there)
    const sorted = [...areas].sort((a, b) => {
      if (a.key === playerArea && b.key !== playerArea) return -1
      if (b.key === playerArea && a.key !== playerArea) return 1
      return Math.random() - 0.5
    })
    const selected = sorted.slice(0, checkCount)

    const route: Waypoint[] = [leave]
    for (const area of selected) {
      route.push(area.scan)
      // Pick a random check point within the area
      route.push(area.checks[Math.floor(Math.random() * area.checks.length)]!)
    }
    route.push(returnPt, rest)
    return route
  }

  private updateBossAI(ds: number, deltaMs: number) {
    const state = useGameStore.getState()

    if (this.warningPaused) return

    // ── Hunting: boss walks toward player area when angry/furious ──
    if (this.bossBehavior === 'hunting') {
      if (!this.bossTarget) { this.enterBossRest(); return }
      const next = moveTowards({ x: this.boss.x, y: this.boss.y }, this.bossTarget, this.getBossSpeed() * ds)
      this.boss.setPosition(next.point.x, next.point.y)
      this.bossFacing = Number.isFinite(next.angle) ? next.angle : this.bossFacing
      this.updateMovingSprite(this.bossSprite, this.bossFacing, 'boss')
      if (next.arrived) {
        const mood = state.bossMood
        this.bossSprite.setTexture(mood === 'angry' || mood === 'furious' ? 'boss-scolding' : 'boss-checking').setDisplaySize(78, 122)
        this.showFloatingText('老板在找你！', this.boss.x, this.boss.y - 92, '#ef4444')
        this.sayB('hunting')
        this.sayP('boss_nearby')
        this.cameras.main.shake(200, 0.006)
        this.time.delayedCall(2000, () => {
          if (this.bossBehavior === 'hunting' && useGameStore.getState().phase === 'playing') {
            this.bossTarget = { x: BOSS_SPAWN.x, y: BOSS_SPAWN.y }
            this.bossBehavior = 'returning'
            state.setBossBehavior('returning')
          }
        })
      }
      return
    }

    if (this.bossBehavior === 'returning' || this.bossBehavior === 'fakeReturn') {
      if (!this.bossTarget) { this.enterBossRest(); return }
      const next = moveTowards({ x: this.boss.x, y: this.boss.y }, this.bossTarget, this.getBossSpeed() * ds)
      this.boss.setPosition(next.point.x, next.point.y)
      this.bossFacing = Number.isFinite(next.angle) ? next.angle : this.bossFacing
      this.updateMovingSprite(this.bossSprite, this.bossFacing, 'boss')
      if (next.arrived) {
        if (this.bossBehavior === 'fakeReturn') {
          this.bossBehavior = 'patrolling'
          state.setBossBehavior('patrolling')
          const mood = state.bossMood
          this.bossSprite.setTexture(mood === 'angry' || mood === 'furious' ? 'boss-scolding' : 'boss-checking').setDisplaySize(78, 122)
          this.showFloatingText('杀了个回马枪！', this.boss.x, this.boss.y - 92, '#ef4444')
          this.sayB('fakeReturn')
          this.sayP('boss_nearby')
          this.cameras.main.shake(200, 0.006)
          this.time.delayedCall(1500, () => {
            if (useGameStore.getState().phase !== 'playing') return
            this.bossSprite.setTexture('boss-idle').setDisplaySize(78, 122)
            this.advanceBossRoute()
          })
        } else {
          this.enterBossRest()
        }
      }
      return
    }

    if (state.bossStatus !== 'patrolling') return

    // Sudden stop
    if (this.suddenStopping) return

    // ── Boss lock-on: stopped and staring at player ──
    if (this.bossLockOn) {
      const angleToPlayer = Math.atan2(this.player.y - this.boss.y, this.player.x - this.boss.x)
      this.bossFacing = angleToPlayer
      this.updateBossFacing()
      this.bossSprite.setTexture('boss-checking').setDisplaySize(78, 122)
      // Release lock-on conditions handled in updateExposureCheck
      return
    }

    // Random look back — higher chance when angry/furious
    const lookBackChance = state.bossMood === 'furious' ? GAME_CONFIG.bossAI.lookBackChance * 2 : state.bossMood === 'angry' ? GAME_CONFIG.bossAI.lookBackChance * 1.5 : GAME_CONFIG.bossAI.lookBackChance
    if (!this.lookBackDone && Math.random() < lookBackChance * ds) {
      this.lookBackDone = true
      const origFacing = this.bossFacing
      this.bossFacing = origFacing + Math.PI
      this.updateBossFacing()
      this.bossSprite.setTexture('boss-checking').setDisplaySize(78, 122)
      this.showFloatingText('👀', this.boss.x, this.boss.y - 92, '#fef08a')
      this.cameras.main.shake(120, 0.003)
      this.time.delayedCall(GAME_CONFIG.bossAI.lookBackDurationMs, () => {
        this.bossFacing = origFacing
        this.updateBossFacing()
        if (this.bossBehavior === 'patrolling') this.bossSprite.setTexture('boss-walk-1').setDisplaySize(78, 122)
      })
      return
    }

    // Random sudden stop — higher chance when angry
    const stopChance = state.bossMood === 'furious' ? GAME_CONFIG.bossAI.suddenStopChance * 2 : GAME_CONFIG.bossAI.suddenStopChance
    if (Math.random() < stopChance * ds) {
      this.suddenStopping = true
      this.bossSprite.setTexture('boss-checking').setDisplaySize(78, 122)
      this.showFloatingText('?', this.boss.x, this.boss.y - 92, '#fbbf24')
      this.sayB('scanning')
      this.time.delayedCall(GAME_CONFIG.bossAI.suddenStopDurationMs, () => {
        this.suddenStopping = false
        if (this.bossBehavior === 'patrolling') this.bossSprite.setTexture('boss-walk-1').setDisplaySize(78, 122)
      })
      return
    }

    if (this.bossBehavior === 'scanning') {
      // Sweep is driven by timer created in handleWaypointArrival
      return
    }

    if (this.bossBehavior === 'opening') return

    if (this.bossBehavior === 'checking') return

    // ── Patrol spot: boss sees player while walking, stops and confronts (not for restroom) ──
    if (this.bossBehavior === 'patrolling' && this.exposurePercent > 15 && !this.patrolSpotDone && state.currentArea !== 'restroom') {
      this.patrolSpotDone = true
      this.bossBehavior = 'checking'
      this.bossSprite.setTexture('boss-checking').setDisplaySize(78, 122)
      this.showFloatingText('!', this.boss.x, this.boss.y - 92, '#f97316')
      this.cameras.main.shake(180, 0.005)
      this.time.delayedCall(2500, () => {
        if (this.bossBehavior === 'checking') {
          this.bossSprite.setTexture('boss-walk-1').setDisplaySize(78, 122)
          this.bossBehavior = 'patrolling'
        }
      })
      return
    }

    if (!this.bossTarget) return
    const next = moveTowards({ x: this.boss.x, y: this.boss.y }, this.bossTarget, this.getBossSpeed() * ds)
    this.boss.setPosition(next.point.x, next.point.y)
    // Keep facing the player when actively tracking or lingering
    const isLingering = performance.now() < this.lingerFacingUntil
    if (this.exposurePercent >= 3 || isLingering) {
      const angleToPlayer = Math.atan2(this.player.y - this.boss.y, this.player.x - this.boss.x)
      this.bossFacing = angleToPlayer
    } else {
      this.bossFacing = Number.isFinite(next.angle) ? next.angle : this.bossFacing
    }
    this.updateMovingSprite(this.bossSprite, this.bossFacing, 'boss')

    // ── Subtle drift toward player when they're slacking (not into restroom/bossOffice) ──
    if (!next.arrived) {
      const playerArea = useGameStore.getState().currentArea
      const playerAction = useGameStore.getState().currentAction
      const isIllegal = playerAction !== 'idle' && playerAction !== 'working' && playerAction !== 'moving'
      if (isIllegal && playerArea !== 'restroom') {
        const pdx = this.player.x - this.boss.x
        const pdy = this.player.y - this.boss.y
        const pdist = Math.hypot(pdx, pdy)
        if (pdist > 60 && pdist < 500) {
          const remaining = Math.hypot(this.bossTarget.x - this.boss.x, this.bossTarget.y - this.boss.y)
          const maxDrift = remaining * 0.4
          const drift = Math.min(18 * ds, maxDrift) / pdist
          const nx = this.boss.x + pdx * drift
          const ny = this.boss.y + pdy * drift
          // Don't drift into restroom or boss office
          const inRestroom = nx >= 608 && ny >= 475 && ny < 812
          const inBossOffice = nx >= 608 && ny >= 812
          if (!inRestroom && !inBossOffice) {
            this.boss.x = nx
            this.boss.y = ny
          }
        }
      }
    }

    if (next.arrived) this.handleWaypointArrival()
  }

  private applyWaypointFacing(wp: Waypoint) {
    const dirMap: Record<string, number> = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }
    this.bossFacing = dirMap[wp.faceDirection] ?? this.bossFacing
  }

  private handleWaypointArrival() {
    const wp = this.currentBossRoute[this.bossRouteIndex]
    if (!wp) { this.advanceBossRoute(); return }

    // Area-specific dialogue when boss enters a new zone
    if (wp.areaId && wp.areaId !== this.lastBossArea && wp.areaId !== 'restroom' && wp.areaId !== 'bossOffice') {
      this.sayB('arrive_' + wp.areaId)
    }
    if (wp.areaId) this.lastBossArea = wp.areaId

    // When actively tracking a player, skip scan/check and keep moving
    if (this.bossLockOn || (this.exposurePercent >= 3 && (wp.action === 'scan' || wp.action === 'check'))) {
      this.advanceBossRoute()
      return
    }

    this.applyWaypointFacing(wp)

    if (wp.action === 'scan') {
      this.bossBehavior = 'scanning'
      this.bossScanElapsed = 0
      this.sayB('scanning')
      const mood = useGameStore.getState().bossMood
      useGameStore.getState().setBossBehavior('scanning')
      this.bossSprite.setTexture(mood === 'angry' || mood === 'furious' ? 'boss-scolding' : 'boss-checking').setDisplaySize(78, 122)
      // Sweep from initial facing direction to the opposite side
      const startFacing = this.bossFacing
      const sweepAngle = Math.PI * 1.2
      const moodMult = GAME_CONFIG.bossAI.moodScanSpeedMultiplier[mood] ?? 1
      const sweepMs = GAME_CONFIG.boss.scanDurationMs
      const scanStep = () => {
        if (this.bossBehavior !== 'scanning') return
        const t = Math.min(1, this.bossScanElapsed / sweepMs)
        // Ease in-out sweep: left -> center -> right
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        this.bossFacing = startFacing - sweepAngle / 2 + sweepAngle * eased
        this.updateBossFacing()
      }
      const scanTimer = this.time.addEvent({ delay: 16, repeat: Math.ceil(sweepMs / 16), callback: scanStep })
      this.time.delayedCall(sweepMs, () => {
        scanTimer.remove(false)
        if (this.bossBehavior === 'scanning') this.advanceBossRoute()
      })
    } else if (wp.action === 'check') {
      this.bossBehavior = 'checking'
      this.bossSprite.setTexture('boss-checking').setDisplaySize(78, 122)
      this.sayB('checking')
      this.updateBossFacing()
      this.time.delayedCall(wp.waitMs, () => {
        this.bossSprite.setTexture('boss-idle').setDisplaySize(78, 122)
        this.advanceBossRoute()
      })
    } else {
      this.advanceBossRoute()
    }
  }

  private advanceBossRoute() {
    // Record checked/scanned area
    const prevWp = this.currentBossRoute[this.bossRouteIndex]
    if (prevWp && (prevWp.action === 'check' || prevWp.action === 'scan')) {
      const area = prevWp.x < 467 ? 'workstation' : prevWp.x >= 608 ? (prevWp.y < 475 ? 'pantry' : prevWp.y < 812 ? 'restroom' : 'bossOffice') : 'corridor'
      if (area !== 'corridor') this.checkedAreasThisPatrol.add(area)
    }

    this.bossRouteIndex += 1
    if (this.bossRouteIndex >= this.currentBossRoute.length) {
      this.finishPatrol()
    } else {
      const wp = this.currentBossRoute[this.bossRouteIndex]
      if (wp) this.bossTarget = { x: wp.x, y: wp.y }
    }
    if (this.bossBehavior !== 'resting' && this.bossBehavior !== 'returning' && this.bossBehavior !== 'fakeReturn') {
      this.bossBehavior = 'patrolling'
      useGameStore.getState().setBossBehavior('patrolling')
    }
  }

  private finishPatrol() {
    const store = useGameStore.getState()

    // Fake return: go back to an unchecked area instead of always the last checked one
    if (!this.fakeReturning && Math.random() < GAME_CONFIG.bossAI.fakeReturnChance) {
      this.fakeReturning = true
      const allAreas = ['workstation', 'pantry'] as const
      const unchecked = allAreas.filter(a => !this.checkedAreasThisPatrol.has(a))
      // 60% chance to go to unchecked area, 40% to last checked
      if (unchecked.length > 0 && Math.random() < 0.6) {
        const target = unchecked[Math.floor(Math.random() * unchecked.length)]!
        const areaConfig = LEVEL_AREAS[target]
        if (areaConfig) {
          this.bossTarget = { x: areaConfig.center.x, y: areaConfig.center.y }
          this.bossBehavior = 'fakeReturn'
          store.setBossBehavior('fakeReturn')
          this.showFloatingText('...?', this.boss.x, this.boss.y - 92, '#fbbf24')
          return
        }
      }
      const lastCheck = this.currentBossRoute.find(w => w.action === 'check')
      if (lastCheck) {
        this.bossTarget = { x: lastCheck.x, y: lastCheck.y }
        this.bossBehavior = 'fakeReturn'
        store.setBossBehavior('fakeReturn')
        return
      }
    }

    // Hunting: angry/furious boss goes toward player area (not into restroom/bossOffice)
    const huntChance = GAME_CONFIG.bossAI.huntChance[store.bossMood] ?? 0
    if (huntChance > 0 && Math.random() < huntChance) {
      const playerArea = store.currentArea
      const areaConfig = LEVEL_AREAS[playerArea]
      if (areaConfig && playerArea !== 'bossOffice' && playerArea !== 'restroom') {
        const huntTarget = { x: areaConfig.center.x, y: areaConfig.center.y }
        this.bossTarget = huntTarget
        this.bossBehavior = 'hunting'
        store.setBossBehavior('hunting')
        this.showFloatingText('老板感觉不对劲...', this.boss.x, this.boss.y - 92, '#f97316')
        return
      }
    }

    const dist = Math.hypot(this.boss.x - BOSS_SPAWN.x, this.boss.y - BOSS_SPAWN.y)
    if (dist < 20) {
      this.bossSprite.setTexture('boss-idle').setDisplaySize(78, 122).setFlipX(false)
      this.enterBossRest()
    } else {
      this.bossTarget = { x: BOSS_SPAWN.x, y: BOSS_SPAWN.y }
      this.bossBehavior = 'returning'
      store.setBossBehavior('returning')
    }
  }

  private enterBossRest() {
    this.boss.setPosition(BOSS_SPAWN.x, BOSS_SPAWN.y)
    this.bossTarget = null
    this.bossBehavior = 'resting'
    this.bossSprite.setTexture('boss-idle').setDisplaySize(78, 122).setFlipX(false)
    this.exposureMs = 0; this.exposurePercent = 0; this.currentStage = 'safe'
    this.warningPauseDone = false
    this.sayB('returning')
    const store = useGameStore.getState()
    store.setBossStatus('resting')
    store.setBossBehavior('resting')
    const baseDelay = Phaser.Math.Between(GAME_CONFIG.timing.bossRestMinMs, GAME_CONFIG.timing.bossRestMaxMs)
    this.scheduleBossWarning(baseDelay)
  }

  // ── 视野锥 (隐藏式：极低透明度暗示) ──

  private updateVisionGraphic() {
    const state = useGameStore.getState()
    this.visionGraphics.clear()
    if (state.bossStatus !== 'patrolling' && this.bossBehavior !== 'returning' && this.bossBehavior !== 'fakeReturn' && this.bossBehavior !== 'hunting') return
    const range = GAME_CONFIG.vision.distance
    const halfAngle = (GAME_CONFIG.vision.angleDegrees * Math.PI) / 360
    const segments = 24
    const fb = GAME_CONFIG.visionFeedback
    const bx = this.boss.x; const by = this.boss.y
    const pts = [new Phaser.Math.Vector2(bx, by)]
    for (let i = 0; i <= segments; i++) {
      const a = this.bossFacing - halfAngle + (i / segments) * halfAngle * 2
      pts.push(new Phaser.Math.Vector2(bx + Math.cos(a) * range, by + Math.sin(a) * range))
    }
    const baseAlpha = fb.coneAlpha
    const exposureAlpha = (this.exposurePercent / 100) * fb.coneExposureAlphaMax
    this.visionGraphics.fillStyle(0xff2626, baseAlpha + exposureAlpha)
    this.visionGraphics.fillPoints(pts, true)
  }

  // ── 暴露检测 (含伪装等级 + 群体掩护) ──

  private updateExposure(deltaMs: number) {
    const store = useGameStore.getState()
    if (performance.now() < store.stunnedUntil) return
    const isActive = store.bossStatus === 'patrolling' || this.bossBehavior === 'returning' || this.bossBehavior === 'fakeReturn' || this.bossBehavior === 'hunting'
    if (!isActive) return
    this.updateExposureCheck(deltaMs, store)
  }

  private updateExposureCheck(deltaMs: number, store: ReturnType<typeof useGameStore.getState>) {
    const result = checkVision(
      { x: this.boss.x, y: this.boss.y },
      { x: this.player.x, y: this.player.y },
      this.bossFacing,
      GAME_CONFIG.vision.distance,
      GAME_CONFIG.vision.angleDegrees,
      GAME_CONFIG.distanceFalloff.zones,
      [],
    )

    const fb = GAME_CONFIG.visionFeedback
    const stages = GAME_CONFIG.exposureStages

    if (!result.inCone) {
      // Release lock-on when player escapes vision
      if (this.bossLockOn) {
        this.bossLockOn = false
        this.bossSprite.setTexture('boss-walk-1').setDisplaySize(78, 122)
        this.sayP('exposure_safe')
      }
      const decayMult = fb.stageDecayMultipliers[this.currentStage] ?? 1
      this.exposureMs = Math.max(0, this.exposureMs - deltaMs * GAME_CONFIG.exposure.decayMultiplier * decayMult)
      this.exposurePercent = (this.exposureMs / GAME_CONFIG.exposure.thresholdMs) * 100
      this.updateStage(store)
      if (this.bossBehavior !== 'scanning') this.bossSprite.setTexture('boss-walk-1').setDisplaySize(78, 122)
      if (this.exposurePercent < 1) store.setThreatText('巡查中')
      else store.setThreatText(`暴露衰减 ${Math.round(this.exposurePercent)}%`)
      return
    }

    const info = this.getExposureInfo(store.currentArea, store.currentAction)
    if (info.safe) { store.setThreatText('安全区域'); return }
    if (info.legal) {
      // Release lock-on when player starts working or fake-working
      if (this.bossLockOn && (store.currentAction === 'working' || store.currentAction === 'fakeWorking')) {
        this.bossLockOn = false
        this.bossSprite.setTexture('boss-walk-1').setDisplaySize(78, 122)
        this.sayB('mood_calm')
        this.sayP('exposure_safe')
      }
      // FakeWorking actively reduces existing exposure (fooling the boss)
      if (store.currentAction === 'fakeWorking' && this.exposureMs > 0) {
        this.exposureMs = Math.max(0, this.exposureMs - deltaMs * 0.5)
        this.exposurePercent = (this.exposureMs / GAME_CONFIG.exposure.thresholdMs) * 100
        if (this.exposureMs <= 0) { this.currentStage = 'safe' }
        this.updateStage(store)
      } else if (this.exposurePercent >= 3) {
        this.lingerFacingUntil = performance.now() + 1500
      } else {
        this.exposureMs = 0; this.exposurePercent = 0; this.currentStage = 'safe'
      }
      store.setThreatText(store.currentAction === 'fakeWorking' ? '伪装中' : '老板看着你')
      return
    }

    // Idle during inspection: trigger dialogue once when exposure first starts
    if (store.currentAction === 'idle' && this.exposurePercent < 5) {
      this.sayP('idle_inspected')
      this.sayB('spot_idle')
    }

    const moodMult = GAME_CONFIG.bossAI.moodExposureMultiplier[store.bossMood] ?? 1
    const disguiseLv = store.disguiseLevel
    const disguiseMult = disguiseLv > 0 ? (GAME_CONFIG.disguise.levels[disguiseLv - 1]?.exposureMultiplier ?? 1) : 1

    this.exposureMs += deltaMs * info.multiplier * moodMult * disguiseMult * result.exposureRate
    this.exposurePercent = Math.min(100, (this.exposureMs / GAME_CONFIG.exposure.thresholdMs) * 100)
    this.updateStage(store)

    // Boss tracks player when noticed (check/scan/suddenStop) or while walking if exposure is building
    const canTrack = this.bossBehavior === 'checking' || this.bossBehavior === 'scanning' || this.bossBehavior === 'hunting' || (this.bossBehavior === 'patrolling' && (this.suddenStopping || this.exposurePercent > 3))
    if (canTrack) {
      const angleToPlayer = Math.atan2(this.player.y - this.boss.y, this.player.x - this.boss.x)
      const trackSpeed = this.currentStage === 'danger' ? 8 : this.currentStage === 'warning' ? 4 : 2
      const angleDiff = angleToPlayer - this.bossFacing
      const shortest = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff))
      this.bossFacing += shortest * Math.min(1, trackSpeed * deltaMs / 1000)
      this.updateBossFacing()

      // Lock-on: close enough to stop and stare
      if (result.distance < 180) {
        if (!this.bossLockOn) {
          this.bossLockOn = true
          this.sayB('spot_idle')
          this.bossSprite.setTexture('boss-checking').setDisplaySize(78, 122)
        }
      } else if (result.distance > 60) {
        // Approach but don't get too close
        const creepSpeed = this.currentStage === 'danger' ? 80 : this.currentStage === 'warning' ? 50 : 25
        const dds = deltaMs / 1000
        const ddx = this.player.x - this.boss.x
        const ddy = this.player.y - this.boss.y
        const ddist = Math.hypot(ddx, ddy)
        if (ddist > 0) {
          this.boss.x += (ddx / ddist) * creepSpeed * dds
          this.boss.y += (ddy / ddist) * creepSpeed * dds
        }
      }
    }

    const mood = store.bossMood
    const tex = this.currentStage === 'danger' && (mood === 'angry' || mood === 'furious') ? 'boss-scolding' : 'boss-checking'
    this.bossSprite.setTexture(tex).setDisplaySize(78, 122)

    if (this.currentStage === 'danger') store.setThreatText(`危险！${Math.round(this.exposurePercent)}%`)
    else if (this.currentStage === 'warning') store.setThreatText(`注意！${Math.round(this.exposurePercent)}%`)
    else store.setThreatText(`暴露中 ${Math.round(this.exposurePercent)}%`)

    if (this.exposureMs >= GAME_CONFIG.exposure.thresholdMs) this.catchPlayer()
  }

  private updateStage(store: ReturnType<typeof useGameStore.getState>) {
    const stages = GAME_CONFIG.exposureStages
    const prev = this.currentStage
    if (this.exposurePercent >= stages.danger.minPct) this.currentStage = 'danger'
    else if (this.exposurePercent >= stages.warning.minPct) this.currentStage = 'warning'
    else this.currentStage = 'safe'

    if (this.currentStage === 'warning' && prev === 'safe' && !this.warningPauseDone) {
      this.warningPauseDone = true
      this.triggerWarningPause()
      this.cameras.main.shake(150, 0.004)
      this.sayP('exposure_warning')
      this.sayB('spotted')
    }
    if (this.currentStage === 'danger' && prev === 'warning') {
      this.cameras.main.shake(250, 0.008)
      this.showFloatingText('！！', this.player.x, this.player.y - 80, '#ef4444')
      this.sayP('exposure_danger')
      this.sayB('mood_angry')
    }
    if (this.currentStage === 'safe' && prev !== 'safe') {
      this.warningPauseDone = false
      this.sayP('exposure_safe')
    }

    this.updatePlayerRing(this.currentStage)
    this.updateVignette(this.exposurePercent)
    this.updateHeartbeat(this.exposurePercent)
  }

  private triggerWarningPause() {
    if (this.bossBehavior !== 'patrolling' && this.bossBehavior !== 'checking') return
    this.warningPaused = true
    const dx = this.player.x - this.boss.x
    const dy = this.player.y - this.boss.y
    this.bossFacing = Math.atan2(dy, dx)
    this.bossSprite.setTexture('boss-checking').setDisplaySize(78, 122)
    this.updateBossFacing()
    this.showFloatingText('？', this.boss.x, this.boss.y - 92, '#fbbf24')
    this.time.delayedCall(GAME_CONFIG.visionFeedback.bossWarningTurnMs, () => {
      this.warningPaused = false
      if (this.bossBehavior === 'patrolling') this.bossSprite.setTexture('boss-walk-1').setDisplaySize(78, 122)
    })
  }

  private updatePlayerRing(stage: 'safe' | 'warning' | 'danger') {
    const colors = GAME_CONFIG.visionFeedback.ringColors[stage] ?? GAME_CONFIG.visionFeedback.ringColors.safe
    let alpha = colors.alpha
    if (stage === 'danger') alpha *= 0.7 + Math.sin(this.time.now / 150) * 0.3
    this.playerRing.setStrokeStyle(2.5, colors.stroke, alpha)
  }

  private updateVignette(pct: number) {
    this.vignetteGraphics.clear()
    if (pct < 5) return
    const maxAlpha = GAME_CONFIG.visionFeedback.vignetteMaxAlpha
    const alpha = Math.min(maxAlpha, (pct / 100) * maxAlpha * 1.2)
    const pulse = pct >= 70 ? Math.sin(this.time.now / 200) * 0.15 : 0
    const w = LAYERS.map.width, h = LAYERS.map.height
    const b = 120
    this.vignetteGraphics.fillStyle(0xcc0000, Math.min(1, alpha + pulse))
    this.vignetteGraphics.fillRect(0, 0, w, b)
    this.vignetteGraphics.fillRect(0, h - b, w, b)
    this.vignetteGraphics.fillRect(0, 0, b, h)
    this.vignetteGraphics.fillRect(w - b, 0, b, h)
    this.vignetteGraphics.fillStyle(0xcc0000, Math.min(1, alpha * 0.6 + pulse))
    this.vignetteGraphics.fillRect(b, b, w - 2 * b, b)
    this.vignetteGraphics.fillRect(b, h - 2 * b, w - 2 * b, b)
    this.vignetteGraphics.fillRect(b, b, b, h - 2 * b)
    this.vignetteGraphics.fillRect(w - 2 * b, b, b, h - 2 * b)
  }

  private updateHeartbeat(pct: number) {
    this.heartbeatGraphics.clear()
    if (pct < GAME_CONFIG.visionFeedback.heartbeatStartPct) return
    const intensity = Math.min(1, (pct - GAME_CONFIG.visionFeedback.heartbeatStartPct) / (100 - GAME_CONFIG.visionFeedback.heartbeatStartPct) * 1.5)
    const speed = GAME_CONFIG.visionFeedback.heartbeatSpeed
    const phase = (this.time.now / 1000 * speed * Math.PI * 2) % (Math.PI * 2)
    const pulse = Math.sin(phase)
    if (pulse > 0) {
      const r = 25 + pulse * 35
      this.heartbeatGraphics.lineStyle(4, 0xff4444, intensity * pulse * 0.7)
      this.heartbeatGraphics.strokeCircle(this.player.x, this.player.y, r)
    }
    const pulse2 = Math.sin(phase * 2 + 1)
    if (pulse2 > 0) {
      const r2 = 20 + pulse2 * 40
      this.heartbeatGraphics.lineStyle(2, 0xff6644, intensity * pulse2 * 0.4)
      this.heartbeatGraphics.strokeCircle(this.player.x, this.player.y, r2)
    }
  }

  private getExposureInfo(area: AreaId, action: PlayerAction) {
    if (area === 'restroom') return { safe: true, legal: false, multiplier: 0 }
    if (action === 'working') return { safe: false, legal: true, multiplier: 0 }
    // Moving: still exposed at low rate if boss is actively scanning/checking
    if (action === 'moving') {
      const isInspecting = this.bossBehavior === 'scanning' || this.bossBehavior === 'checking'
      return { safe: false, legal: !isInspecting, multiplier: isInspecting ? 0.1 : 0 }
    }
    if (action === 'idle') {
      const isInspecting = this.bossBehavior === 'scanning' || this.bossBehavior === 'checking'
      return { safe: false, legal: false, multiplier: isInspecting ? 0.35 : 0.22 }
    }
    // FakeWorking: boss thinks you're working (legal during patrol), but scanning/checking can see through it
    if (action === 'fakeWorking') {
      const isInspecting = this.bossBehavior === 'scanning' || this.bossBehavior === 'checking'
      return { safe: false, legal: !isInspecting, multiplier: isInspecting ? 0.3 : 0 }
    }
    const m = GAME_CONFIG.exposure.multipliers
    return { safe: false, legal: false, multiplier: (m as Record<string, number>)[area] ?? m.corridor }
  }

  private catchPlayer() {
    const store = useGameStore.getState()
    const { amount, title, message } = this.getPenalty(store.currentArea, store.currentAction)
    this.exposureMs = 0; this.exposurePercent = 0; this.currentStage = 'safe'; this.bossLockOn = false
    this.playerTarget = null
    this.markerGraphics.clear()
    this.sayP('caught')
    this.sayB('catch_player')
    store.applyCatch(amount, title, message)
    this.suspicion = Math.min(GAME_CONFIG.suspicion.max, this.suspicion + 20)
    store.setSuspicion(this.suspicion)
    this.showFloatingText(`${title} -${amount}`, this.player.x, this.player.y - 70, '#fb7185')
    this.showFloatingText('被抓了！', this.player.x, this.player.y - 100, '#fbbf24')
    this.cameras.main.shake(GAME_CONFIG.feedback.screenShakeOnCatch.duration, GAME_CONFIG.feedback.screenShakeOnCatch.intensity)
    this.cameras.main.flash(GAME_CONFIG.feedback.redFlashOnCatch.duration, 255, 60, 60)
  }

  private static readonly PENALTIES: Record<string, { titles: string[]; lines: string[] }> = {
    fakeWorking: {
      titles: ['伪装失败', '演技穿帮', '露馅了'],
      lines: ['你以为我看不出来你在演？', '装忙也是一门技术，你还没入门', '键盘敲得那么响，屏幕上啥也没有', '下次演像一点再来'],
    },
    watching: {
      titles: ['上班刷剧', '摸鱼现场', '视频时间'],
      lines: ['我让你带薪学习，不是带薪刷视频', '剧情精彩还是工作精彩？', '屏幕反光出卖了你', '追剧回家追去'],
    },
    chips: {
      titles: ['偷吃零食', '薯片警告', '嘴不停'],
      lines: ['薯片声比键盘声还响', '吃可以，别把键盘弄脏了', '嘎嘣嘎嘣的全公司都听见了', '下次分我一点'],
    },
    milkTea: {
      titles: ['茶水间摸鱼', '奶茶时间', '偷喝奶茶'],
      lines: ['奶茶比 KPI 还重要是吧？', '茶水间的监控我还没装，不过我亲自来了', '上班时间喝下午茶，你挺会享受', '这杯奶茶花的是公司的钱'],
    },
    chatting: {
      titles: ['上班闲聊', '茶话会现场', '八卦时间'],
      lines: ['好家伙，上班时间开茶话会呢？', '聊的什么这么开心？说出来听听', '上班摸鱼，下班加班，时间管理大师？', '公司给你工位是来表演葛优瘫的？'],
    },
    idle: {
      titles: ['上班发呆', '偷懒现场', '站着不动'],
      lines: ['不干活站着干嘛？', '发呆也算休息的话你比谁都勤快', '你这是在思考人生还是在摸鱼？', '站那别动，让我看看你在干嘛'],
    },
    default: {
      titles: ['离岗警告', '不在工位', '岗位空缺'],
      lines: ['你的摸鱼水平比工作水平高多了', '工位上没人，我还以为你辞职了', '上班不在工位，你去哪了？', '你这不是摸鱼，是开海鲜市场'],
    },
  }

  private pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]! }

  private getPenalty(area: AreaId, action: PlayerAction): { amount: number; title: string; message: string } {
    const p = GAME_CONFIG.penalties
    let amount: number
    let key: string
    if (action === 'fakeWorking') { amount = p.fakeWorkFail; key = 'fakeWorking' }
    else if (action === 'watching') { amount = p.workstationSlacking; key = 'watching' }
    else if (action === 'chips') { amount = p.minorSlacking; key = 'chips' }
    else if (action === 'milkTea') { amount = p.pantrySlacking; key = 'milkTea' }
    else if (action === 'chatting') { amount = p.pantrySlacking; key = 'chatting' }
    else if (action === 'idle') { amount = p.offSeat; key = 'idle' }
    else { amount = p.offSeat; key = 'default' }
    const pool = OfficeScene.PENALTIES[key] ?? OfficeScene.PENALTIES.default
    return { amount, title: this.pick(pool.titles), message: this.pick(pool.lines) }
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
    const disguiseTag = state.disguiseLevel > 0 ? ` [Lv.${state.disguiseLevel}]` : ''
    const label = state.currentAction === 'moving' ? '移动中' : state.currentAction === 'idle' ? '待机' : `${action?.icon ?? ''} ${action?.name ?? '待机'}`
    this.actionBadge.setText(action?.disguise ? `${label}～伪装中${disguiseTag}` : label).setPosition(this.player.x, this.player.y - 72)
    if (!this.playerTarget) this.updatePlayerActionSprite(state.currentAction)
  }

  private updateMovingSprite(sprite: Phaser.GameObjects.Image, angle: number, owner: 'player' | 'boss') {
    const frame = Math.floor(this.time.now / 180) % 2 === 0 ? 'walk-1' : 'walk-2'
    const horizontal = Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))
    if (owner === 'player') {
      sprite.setTexture(horizontal ? 'player-side' : `player-${frame}`).setDisplaySize(64, 94)
      sprite.setFlipX(horizontal && Math.cos(angle) < 0)
      return
    }
    sprite.setTexture(horizontal ? 'boss-side' : `boss-${frame}`).setDisplaySize(horizontal ? 64 : 70, 110)
    sprite.setFlipX(horizontal && Math.cos(angle) < 0)
  }

  private updateBossFacing() {
    const horizontal = Math.abs(Math.cos(this.bossFacing)) > Math.abs(Math.sin(this.bossFacing))
    this.bossSprite.setFlipX(horizontal && Math.cos(this.bossFacing) < 0)
  }

  private updatePlayerActionSprite(action: PlayerAction) {
    const texture = action === 'working' ? 'player-work'
      : action === 'chips' ? 'player-chips'
        : action === 'milkTea' || action === 'chatting' ? 'player-milk-tea'
          : action === 'fakeWorking' ? 'player-fake-work'
            : action === 'phone' ? 'player-phone'
              : 'player-idle'
    const large = texture !== 'player-idle'
    const phoneSprite = texture === 'player-phone'
    const deskSprite = large && !phoneSprite
    this.playerSprite.setTexture(texture).setFlipX(false).setDisplaySize(deskSprite ? 146 : phoneSprite ? 112 : 56, large ? 118 : 82)
  }

  // ── 工具 ──

  private detectArea(point: Point): AreaId {
    const exact = areaOrder.find(id => id !== 'corridor' && LEVEL_AREAS[id] && isInsideRect(point, LEVEL_AREAS[id].rect))
    return exact ?? 'corridor'
  }

  // ── 事件驱动对话气泡 ──

  private static readonly P_DIALOG: Record<string, string[]> = {
    arrive_workstation: ['回工位了', '键盘我来了', '继续搬砖', '工位还是这个味', '回来了回来了'],
    arrive_pantry: ['茶水间到', '闻到奶茶味了', '有人吗', '摸鱼好去处', '悄悄进来'],
    arrive_restroom: ['安全区！', '躲一波', '厕所摸鱼两不误', '清净了', '这里安全'],
    arrive_corridor: ['溜了溜了', '去哪摸好呢', '别碰到老板', '悄悄的', '快速通过'],
    act_working: ['努力工作中', '加油打工人', '先干会活', '绩效要紧', '假装认真'],
    act_watching: ['偷偷看视频', '刷会剧', '小声点', '别被发现', '打工人的电子榨菜'],
    act_chips: ['薯片真好吃', '咔嚓咔嚓', '来一口', '嘴停不下来'],
    act_milkTea: ['奶茶续命', '这杯好喝', '太爽了', '再来一杯'],
    act_chatting: ['聊八卦中', '你听说了吗', '小点声', '嘘——'],
    act_fakeWorking: ['假装很忙', '演技在线', '看上去在干活', '伪装大师'],
    act_phone: ['刷手机中', '这游戏好玩', '没人管真爽', '摸鱼圣地'],
    act_idle: ['发呆中', '接下来干啥', '好无聊', '摸还是不摸'],
    idle_inspected: ['他是不是在看我', '别发呆了快装忙', '被盯着的感觉好难受', '装作在思考的样子', '假装在找文件'],
    exposure_warning: ['不好，被注意到了', '心里慌', '冷静冷静', '他要过来了？', '完了心跳好快'],
    exposure_danger: ['完了完了', '要被抓了', '跑不掉', '快停下！', '完了完了完了'],
    exposure_safe: ['安全了', '呼~', '躲过一劫', '吓死我了', '安全第一'],
    caught: ['被发现了！', '完了', '不是我的错', '下次一定小心', '我错了老板'],
    boss_nearby: ['老板在附近', '小心', '别乱动', '装作很忙', '别看我别看我'],
    encounter_workstation: ['老板来工位了', '赶紧装忙', '他在看这边', '淡定淡定', '打字打字'],
    encounter_pantry: ['老板来茶水间了', '快躲', '别让他看见', '藏起来', '假装在接水'],
    encounter_corridor: ['走廊碰到老板', '不妙', '假装路过', '问好问好', '微笑点头快走'],
    rhythm_pressure: ['高压来了', '小心点', '老板要发飙', '别摸鱼了', '赶紧装起来'],
    rhythm_buffer: ['安全时间', '放心摸', '老板休息了', '可以摸一会', '趁现在'],
    random_idle: ['好无聊', '摸鱼摸鱼', '今天啥时候下班', '肚子饿了', '想喝奶茶', '打工人的崩溃都是静音的', '如果摸鱼有罪那全公司都是罪犯', '班味越来越重了', 'PPT可以装作在忙一下午', '要不要辞职开奶茶店'],
    random_working: ['认真搬砖中', '键盘敲冒烟了', '工作使我快乐（假的）', '加油', '我不是在加班是在等下班', '努力到让老板失去兴趣'],
  }

  private static readonly B_DIALOG: Record<string, string[]> = {
    leave_office: ['出去看看', '突击检查', '别想蒙我', '走一圈', '该巡视了'],
    patrolling: ['不要以为我不知道', '总觉得有人在摸', '这层楼不太对', '走走看看', '重点检查一下'],
    scanning: ['仔细看看', '总觉得不对', '让我瞧瞧', '有问题', '嗯？'],
    checking: ['都在干活吗', '别偷懒', '在忙？', '检查一下', '这工位...'],
    spotted: ['嗯？那个是', '我发现你了', '有点可疑', '在干嘛呢', '表情出卖了你'],
    spot_idle: ['那个怎么不动', '在发呆？', '不干活站着干嘛', '让我多看两眼', '有点不对劲'],
    catch_player: ['抓到了！', '你完了', '跟我到办公室', '工资没了', '这回跑不了'],
    returning: ['回去歇会', '这圈查完了', '先回去', '下次再来'],
    mood_calm: ['今天还行', '员工都挺自觉', '喝口水', '不用太紧', '大家状态不错'],
    mood_suspicious: ['总觉得有人摸鱼', '得盯紧点', '有问题', '不能放松', '刚才那是谁'],
    mood_angry: ['谁在摸鱼！', '都给我干活', '今天谁也别想摸', '抓住就扣工资'],
    mood_furious: ['忍无可忍！', '都给我站住', '今天别想下班', '全部扣工资'],
    hunting: ['我听到声音了', '别想跑', '往哪躲', '找到你了', '给我出来'],
    fakeReturn: ['走远了，安全', '没人了吧', '应该走了', '可以放心了'],
    random_resting: ['歇一会', '喝口水', '等下再查', '今天要盯紧点', '不知道他们在干嘛', '再歇一会吧'],
    arrive_workstation: ['工位区，都在干活吧', '看看键盘热不热', '工位转一圈', '重点检查'],
    arrive_pantry: ['茶水间有人吗', '奶茶味好重', '摸鱼重灾区', '来查查茶水间'],
    arrive_corridor: ['走廊看看', '有没有人在溜达', '走廊巡逻中', '四处转转'],
    arrive_bossOffice: ['回到办公室了', '先回去坐会', '查完了回去'],
  }

  private sayP(key: string) {
    const now = performance.now()
    if (now - this.lastPlayerBubbleMs < 1500) return
    const pool = OfficeScene.P_DIALOG[key] ?? OfficeScene.P_DIALOG.random_idle
    this.playerBubbleText.setText(pool[Math.floor(Math.random() * pool.length)]!)
    this.playerBubbleAlpha = 1
    this.lastPlayerBubbleMs = now
    this.bubbleTimer = 0
  }

  private sayB(key: string) {
    const now = performance.now()
    if (now - this.lastBossBubbleMs < 1500) return
    const pool = OfficeScene.B_DIALOG[key] ?? OfficeScene.B_DIALOG.patrolling
    this.bossBubbleText.setText(pool[Math.floor(Math.random() * pool.length)]!)
    this.bossBubbleAlpha = 1
    this.lastBossBubbleMs = now
    this.bubbleTimer = 0
  }

  private updateAutoBubble(deltaMs: number) {
    const state = useGameStore.getState()
    if (state.phase !== 'playing') {
      this.playerBubbleAlpha = 0; this.bossBubbleAlpha = 0
      return
    }

    this.bubbleTimer += deltaMs

    // --- Periodic fallback: every 4s show random line ---
    if (this.bubbleTimer >= 4000) {
      this.bubbleTimer = 0
      const action = state.currentAction
      const pKey = (action === 'working' || action === 'idle') ? 'random_working' : 'random_idle'
      this.sayP(pKey)

      if (state.bossStatus === 'patrolling') {
        const mood = state.bossMood
        const bKey = mood === 'furious' ? 'mood_furious' : mood === 'angry' ? 'mood_angry' : mood === 'suspicious' ? 'mood_suspicious' : this.bossBehavior === 'hunting' ? 'hunting' : this.bossBehavior === 'scanning' || this.bossBehavior === 'checking' ? 'scanning' : 'patrolling'
        this.sayB(bKey)
      } else if (state.bossStatus === 'resting') {
        this.sayB('random_resting')
      }
    }

    // --- Proximity encounter check ---
    if (this.bubbleTimer % 2000 < 20) {
      const playerArea = state.currentArea
      const bossArea = this.detectArea({ x: this.boss.x, y: this.boss.y })
      if (playerArea === bossArea && playerArea !== 'restroom' && state.bossStatus === 'patrolling') {
        this.sayP('encounter_' + playerArea)
        this.sayB('spotted')
      }
    }

    // --- Fade out after 2.5s visible ---
    if (this.playerBubbleAlpha > 0 && this.bubbleTimer > 2500) {
      this.playerBubbleAlpha = Math.max(0, 1 - (this.bubbleTimer - 2500) / 800)
    }
    if (this.bossBubbleAlpha > 0 && this.bubbleTimer > 2500) {
      this.bossBubbleAlpha = Math.max(0, 1 - (this.bubbleTimer - 2500) / 800)
    }

    // --- Position & draw ---
    this.drawBubble(this.playerBubbleBg, this.playerBubbleText, this.player.x, this.player.y - 108, this.playerBubbleAlpha)
    this.drawBubble(this.bossBubbleBg, this.bossBubbleText, this.boss.x, this.boss.y - 118, this.bossBubbleAlpha)
  }

  private drawBubble(bg: Phaser.GameObjects.Graphics, txt: Phaser.GameObjects.Text, cx: number, cy: number, alpha: number) {
    if (alpha <= 0 || txt.text === '') {
      bg.clear(); txt.setAlpha(0)
      return
    }
    txt.setAlpha(alpha)
    txt.setPosition(cx, cy)
    const tw = txt.width + 28
    const th = txt.height + 18
    const bx = cx - tw / 2
    const by = cy - th / 2

    bg.clear().setAlpha(alpha)
    bg.fillStyle(0x1a1610, 0.9)
    bg.fillRoundedRect(bx, by, tw, th, 10)
    // tail
    bg.fillTriangle(cx - 6, by + th, cx + 6, by + th, cx, by + th + 9)
    bg.lineStyle(1.5, 0x3a3228, 0.5)
    bg.strokeRoundedRect(bx, by, tw, th, 10)
  }

  private showFloatingText(text: string, x: number, y: number, color: string) {
    const label = this.add.text(x, y, text, { ...textStyle, fontSize: '22px', color }).setOrigin(0.5).setDepth(50)
    this.tweens.add({ targets: label, y: y - 34, alpha: 0, duration: 900, ease: 'Sine.easeOut', onComplete: () => label.destroy() })
  }

  private clearPatrolTimer() {
    if (this.patrolTimer) { this.patrolTimer.remove(false); this.patrolTimer = null }
  }
}

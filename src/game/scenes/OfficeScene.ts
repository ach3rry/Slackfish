import Phaser from 'phaser'
import { LEVEL_ACTIONS, LEVEL_AREAS, BOSS_ROUTE, BOSS_SPAWN, PLAYER_SPAWN } from '../../data/level1'
import { GAME_CONFIG } from '../config'
import { isPointInVisionCone } from '../vision'
import { useGameStore } from '../../store/gameStore'
import type { AreaId, PlayerAction, Point, Rect } from '../../types/game'

const areaOrder: AreaId[] = ['bossOffice', 'workstation', 'pantry', 'restroom', 'corridor']
const textStyle = { fontFamily: 'Microsoft YaHei, SimHei, sans-serif', color: '#f8fafc', stroke: '#10131a', strokeThickness: 5 }

const isInsideRect = (point: Point, rect: Rect) =>
  point.x >= rect.x && point.x <= rect.x + rect.width &&
  point.y >= rect.y && point.y <= rect.y + rect.height

const moveTowards = (from: Point, to: Point, distance: number) => {
  const dx = to.x - from.x; const dy = to.y - from.y; const length = Math.hypot(dx, dy)
  if (length <= distance || length === 0) return { point: to, arrived: true, angle: Math.atan2(dy, dx) }
  const ratio = distance / length
  return { point: { x: from.x + dx * ratio, y: from.y + dy * ratio }, arrived: false, angle: Math.atan2(dy, dx) }
}

export class OfficeScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container
  private boss!: Phaser.GameObjects.Container
  private visionGraphics!: Phaser.GameObjects.Graphics
  private markerGraphics!: Phaser.GameObjects.Graphics
  private actionBadge!: Phaser.GameObjects.Text
  private doorBadge!: Phaser.GameObjects.Text
  private playerTarget: Point | null = null
  private bossTarget: Point | null = null
  private bossRouteIndex = 0
  private bossFacing = Math.PI / 2
  private patrolTimer: Phaser.Time.TimerEvent | null = null
  private exposureMs = 0
  private fishPopup = 0
  private salaryPopup = 0
  private popupTimer = 0

  constructor() { super('OfficeScene') }

  preload() {
    this.load.image('scene-bg', 'images2d/各场景总视图.png')
    this.load.image('player-sprite', 'images2d/员工.png')
    this.load.image('boss-sprite', 'images2d/老板.png')
  }

  create() {
    this.cameras.main.setBackgroundColor(GAME_CONFIG.canvas.background)
    this.add.image(540, 380, 'scene-bg').setDisplaySize(1080, 760).setDepth(0)
    this.createCharacters(); this.createOverlays()
    this.registerCommands(); this.resetScene()
  }

  update(_time: number, delta: number) {
    const state = useGameStore.getState()
    this.updateVisionGraphic(); this.updateActionBadge()
    if (state.phase !== 'playing' || state.guideOpen) return
    const ds = delta / 1000
    this.updatePlayerMovement(ds); this.updateBossMovement(ds)
    this.updateEconomy(ds); this.updateExposure(delta)
  }

  private createCharacters() {
    // 玩家角色 - 使用像素风精灵图
    this.player = this.add.container(PLAYER_SPAWN.x, PLAYER_SPAWN.y).setDepth(20)
    const playerSprite = this.add.image(0, 0, 'player-sprite').setDisplaySize(44, 56).setDepth(1)
    const pl = this.add.text(0, 40, '你', { ...textStyle, fontSize: '20px', color: '#bbf7d0' }).setOrigin(0.5).setDepth(2)
    // 底部光圈
    const playerShadow = this.add.ellipse(0, 24, 36, 12, 0x000000, 0.25).setDepth(0)
    this.player.add([playerShadow, playerSprite, pl])

    // 老板角色 - 使用像素风精灵图
    this.boss = this.add.container(BOSS_SPAWN.x, BOSS_SPAWN.y).setDepth(22)
    const bossSprite = this.add.image(0, 0, 'boss-sprite').setDisplaySize(48, 60).setDepth(1)
    const bl = this.add.text(0, 44, '老板', { ...textStyle, fontSize: '18px', color: '#fecaca' }).setOrigin(0.5).setDepth(2)
    const bossShadow = this.add.ellipse(0, 26, 40, 14, 0x000000, 0.25).setDepth(0)
    this.boss.add([bossShadow, bossSprite, bl])
  }

  private createOverlays() {
    this.visionGraphics = this.add.graphics().setDepth(14)
    this.markerGraphics = this.add.graphics().setDepth(12)
    this.actionBadge = this.add.text(PLAYER_SPAWN.x, PLAYER_SPAWN.y - 48, '待机', { ...textStyle, fontSize: '18px', color: '#e0f2fe' }).setOrigin(0.5).setDepth(30)
    this.doorBadge = this.add.text(BOSS_SPAWN.x, BOSS_SPAWN.y + 76, '老板开门了！', { ...textStyle, fontSize: '28px', color: '#fef08a' }).setOrigin(0.5).setDepth(40).setVisible(false)
  }

  private registerCommands() {
    window.addEventListener('slackfish:start', this.handleStart)
    window.addEventListener('slackfish:restart', this.handleRestart)
    window.addEventListener('slackfish:move-area', this.handleMoveArea)
    window.addEventListener('slackfish:set-action', this.handleSetAction)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.removeCommands, this)
    this.events.once(Phaser.Scenes.Events.DESTROY, this.removeCommands, this)
    this.input.on('pointerdown', this.handlePointerDown, this)
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
    const target = LEVEL_AREAS[area]?.center
    if (target) this.movePlayerTo(target)
  }
  private handleSetAction = (event: Event) => {
    const action = (event as CustomEvent<{ action: PlayerAction }>).detail.action
    const state = useGameStore.getState()
    const config = LEVEL_ACTIONS.find(item => item.id === action)
    if (!config || config.area !== state.currentArea || state.currentAction === 'moving') return
    useGameStore.getState().setAction(action)
  }
  private handlePointerDown(pointer: Phaser.Input.Pointer) { this.movePlayerTo({ x: pointer.worldX, y: pointer.worldY }) }

  private resetScene(startPatrol = false) {
    this.player.setPosition(PLAYER_SPAWN.x, PLAYER_SPAWN.y)
    this.boss.setPosition(BOSS_SPAWN.x, BOSS_SPAWN.y)
    this.playerTarget = null; this.bossTarget = null; this.bossRouteIndex = 0
    this.bossFacing = Math.PI / 2; this.exposureMs = 0; this.fishPopup = 0; this.salaryPopup = 0; this.popupTimer = 0
    this.markerGraphics.clear(); this.doorBadge.setVisible(false); this.clearPatrolTimer()
    const store = useGameStore.getState()
    store.setArea('workstation'); store.setAction('idle', true); store.setBossStatus('resting'); store.setThreatText('休息中')
    if (startPatrol) this.scheduleBossWarning(GAME_CONFIG.timing.firstPatrolDelayMs)
  }

  private movePlayerTo(target: Point) {
    const state = useGameStore.getState()
    if (state.phase !== 'playing' || state.guideOpen || performance.now() < state.stunnedUntil || state.currentAction === 'moving') return
    const ta = this.detectArea(target)
    if (ta === 'bossOffice' || target.y < 28 || target.y > 730 || target.x < 28 || target.x > 1052) {
      this.showFloatingText('老板办公室进不去', this.player.x, this.player.y - 72, '#fca5a5'); return
    }
    this.playerTarget = target; useGameStore.getState().setAction('moving', true); this.drawMoveMarker(target)
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
    useGameStore.getState().setArea(this.detectArea(next.point))
    if (next.arrived) { this.playerTarget = null; this.markerGraphics.clear(); useGameStore.getState().setAction('idle', true) }
  }

  private scheduleBossWarning(delay: number) {
    this.clearPatrolTimer()
    this.patrolTimer = this.time.delayedCall(delay, () => this.startBossWarning())
  }

  private startBossWarning() {
    const state = useGameStore.getState()
    if (state.phase !== 'playing') return
    state.setBossStatus('warning')
    this.doorBadge.setVisible(true).setAlpha(1)
    this.showFloatingText('老板开门了！', BOSS_SPAWN.x, BOSS_SPAWN.y + 92, '#fef08a')
    this.tweens.add({ targets: this.doorBadge, scaleX: 1.08, scaleY: 1.08, yoyo: true, repeat: 3, duration: 120 })
    this.cameras.main.flash(160, 255, 230, 120)
    this.patrolTimer = this.time.delayedCall(GAME_CONFIG.timing.bossWarningMs, () => this.startPatrol())
  }

  private startPatrol() {
    const state = useGameStore.getState()
    if (state.phase !== 'playing') return
    state.setBossStatus('patrolling'); this.doorBadge.setVisible(false)
    this.bossRouteIndex = 0; this.bossTarget = BOSS_ROUTE[0]
  }

  private updateBossMovement(ds: number) {
    const state = useGameStore.getState()
    if (state.bossStatus !== 'patrolling' || !this.bossTarget) return
    const next = moveTowards({ x: this.boss.x, y: this.boss.y }, this.bossTarget, GAME_CONFIG.movement.bossSpeed * ds)
    this.boss.setPosition(next.point.x, next.point.y)
    this.bossFacing = Number.isFinite(next.angle) ? next.angle : this.bossFacing
    // 精灵图旋转面向移动方向
    const sprite = this.boss.getAt(1) as Phaser.GameObjects.Image
    if (sprite) sprite.setRotation(this.bossFacing - Math.PI / 2)
    if (next.arrived) {
      this.bossRouteIndex += 1
      if (this.bossRouteIndex >= BOSS_ROUTE.length) this.finishPatrol()
      else this.bossTarget = BOSS_ROUTE[this.bossRouteIndex]
    }
  }

  private finishPatrol() {
    this.boss.setPosition(BOSS_SPAWN.x, BOSS_SPAWN.y)
    const sprite = this.boss.getAt(1) as Phaser.GameObjects.Image
    if (sprite) sprite.setRotation(0)
    this.bossTarget = null; this.exposureMs = 0
    useGameStore.getState().setBossStatus('resting')
    this.scheduleBossWarning(Phaser.Math.Between(GAME_CONFIG.timing.bossRestMinMs, GAME_CONFIG.timing.bossRestMaxMs))
  }

  private updateVisionGraphic() {
    const state = useGameStore.getState()
    this.visionGraphics.clear()
    if (state.bossStatus !== 'patrolling') return
    const range = GAME_CONFIG.vision.distance
    const halfAngle = (GAME_CONFIG.vision.angleDegrees * Math.PI) / 360
    const points: Point[] = [{ x: this.boss.x, y: this.boss.y }]
    for (let i = 0; i <= 18; i++) {
      const angle = this.bossFacing - halfAngle + (i / 18) * halfAngle * 2
      points.push({ x: this.boss.x + Math.cos(angle) * range, y: this.boss.y + Math.sin(angle) * range })
    }
    this.visionGraphics.fillStyle(0xff2626, 0.34); this.visionGraphics.fillPoints(points, true)
    this.visionGraphics.lineStyle(3, 0xff8a8a, 0.72); this.visionGraphics.strokePoints(points, true)
  }

  private updateExposure(deltaMs: number) {
    const store = useGameStore.getState()
    if (performance.now() < store.stunnedUntil || store.bossStatus !== 'patrolling') { this.exposureMs = 0; return }
    const visible = isPointInVisionCone({ viewer: { x: this.boss.x, y: this.boss.y }, target: { x: this.player.x, y: this.player.y }, facingRadians: this.bossFacing, distance: GAME_CONFIG.vision.distance, angleDegrees: GAME_CONFIG.vision.angleDegrees })
    const illegal = this.isIllegalState(store.currentArea, store.currentAction)
    if (visible && illegal) {
      this.exposureMs += deltaMs
      const pct = Math.min(100, Math.round((this.exposureMs / GAME_CONFIG.timing.illegalExposureMs) * 100))
      store.setThreatText(`暴露中 ${pct}%`)
      if (this.exposureMs >= GAME_CONFIG.timing.illegalExposureMs) this.catchPlayer()
      return
    }
    this.exposureMs = 0
    store.setThreatText(visible && !illegal ? '老板看着你' : store.bossStatus === 'patrolling' ? '巡查中' : '休息中')
  }

  private isIllegalState(area: AreaId, action: PlayerAction) {
    if (area === 'restroom' || action === 'working') return false
    if (area !== 'workstation') return true
    return action === 'watching' || action === 'chips'
  }

  private catchPlayer() {
    const store = useGameStore.getState()
    const { amount, title } = this.getPenalty(store.currentArea, store.currentAction)
    this.exposureMs = 0; this.playerTarget = null; this.markerGraphics.clear()
    store.applyCatch(amount, title)
    this.showFloatingText(`-${amount} 工资`, this.player.x, this.player.y - 70, '#fb7185')
    this.cameras.main.shake(230, 0.008)
  }

  private getPenalty(area: AreaId, action: PlayerAction) {
    if (area === 'workstation' && (action === 'watching' || action === 'chips')) return { amount: GAME_CONFIG.penalties.workstationFish, title: '轻度警告' }
    if (area === 'pantry') return { amount: GAME_CONFIG.penalties.pantryFish, title: '中度处罚' }
    return { amount: GAME_CONFIG.penalties.awayFromDesk, title: '离岗警告' }
  }

  private updateEconomy(ds: number) {
    const gains = useGameStore.getState().tickEconomy(ds)
    this.fishPopup += gains.fishGain; this.salaryPopup += gains.salaryGain; this.popupTimer += ds
    if (this.popupTimer < 1) return
    if (this.fishPopup >= 0.8) this.showFloatingText(`+${Math.round(this.fishPopup)} 摸鱼`, this.player.x, this.player.y - 62, '#fef3c7')
    if (this.salaryPopup >= 0.8) this.showFloatingText(`+${Math.round(this.salaryPopup)} 工资`, this.player.x, this.player.y - 88, '#86efac')
    this.popupTimer = 0; this.fishPopup = 0; this.salaryPopup = 0
  }

  private updateActionBadge() {
    const state = useGameStore.getState()
    const action = LEVEL_ACTIONS.find(item => item.id === state.currentAction)
    const label = state.currentAction === 'moving' ? '移动中' : state.currentAction === 'idle' ? '待机' : `${action?.icon ?? ''} ${action?.name ?? '待机'}`
    this.actionBadge.setText(action?.disguise ? `${label}｜伪装中` : label).setPosition(this.player.x, this.player.y - 50)
  }

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

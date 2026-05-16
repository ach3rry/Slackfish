import Phaser from 'phaser'
import { LEVEL_ACTIONS, LEVEL_AREAS, BOSS_ROUTE, BOSS_SPAWN, PLAYER_SPAWN } from '../../data/level1'
import { GAME_CONFIG } from '../config'
import { isPointInVisionCone } from '../vision'
import { useGameStore } from '../../store/gameStore'
import type { AreaConfig, AreaId, PlayerAction, Point, Rect } from '../../types/game'

const areaOrder: AreaId[] = ['bossOffice', 'workstation', 'pantry', 'restroom', 'corridor']

const textStyle = {
  fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
  color: '#f8fafc',
  stroke: '#10131a',
  strokeThickness: 5,
}

const isInsideRect = (point: Point, rect: Rect) =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height

const moveTowards = (from: Point, to: Point, distance: number) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)

  if (length <= distance || length === 0) {
    return { point: to, arrived: true, angle: Math.atan2(dy, dx) }
  }

  const ratio = distance / length
  return {
    point: { x: from.x + dx * ratio, y: from.y + dy * ratio },
    arrived: false,
    angle: Math.atan2(dy, dx),
  }
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

  constructor() {
    super('OfficeScene')
  }

  create() {
    this.cameras.main.setBackgroundColor(GAME_CONFIG.canvas.background)
    this.drawMap()
    this.createCharacters()
    this.createOverlays()
    this.registerCommands()
    this.resetScene()
  }

  update(_time: number, delta: number) {
    const state = useGameStore.getState()
    this.updateVisionGraphic()
    this.updateActionBadge()

    if (state.phase !== 'playing' || state.guideOpen) {
      return
    }

    const deltaSeconds = delta / 1000
    this.updatePlayerMovement(deltaSeconds)
    this.updateBossMovement(deltaSeconds)
    this.updateEconomy(deltaSeconds)
    this.updateExposure(delta)
  }

  private drawMap() {
    const graphics = this.add.graphics()

    graphics.fillStyle(0x171d28, 1)
    graphics.fillRoundedRect(18, 18, 1044, 724, 18)
    graphics.lineStyle(4, 0x2f4058, 1)
    graphics.strokeRoundedRect(18, 18, 1044, 724, 18)

    this.drawFloorPattern(graphics)

    areaOrder.forEach((id) => {
      const area = LEVEL_AREAS[id]
      this.drawArea(graphics, area)
    })

    this.drawOfficeProps(graphics)
    this.drawDoor(438, 198, 60, '⬇')
    this.drawDoor(430, 410, 54, '➡')
    this.drawDoor(650, 330, 54, '➡')
    this.drawDoor(696, 552, 54, '↘')
  }

  private drawFloorPattern(graphics: Phaser.GameObjects.Graphics) {
    graphics.lineStyle(1, 0x2b3442, 0.38)
    for (let x = 46; x < GAME_CONFIG.canvas.width - 36; x += 42) {
      graphics.lineBetween(x, 34, x, 724)
    }
    for (let y = 48; y < GAME_CONFIG.canvas.height - 34; y += 42) {
      graphics.lineBetween(34, y, 1040, y)
    }
  }

  private drawArea(graphics: Phaser.GameObjects.Graphics, area: AreaConfig) {
    const { rect } = area
    graphics.fillStyle(area.fill, area.id === 'corridor' ? 0.56 : 0.9)
    graphics.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 10)
    graphics.lineStyle(4, area.stroke, 0.92)
    graphics.strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 10)

    const labelColor = area.safe ? '#86efac' : area.id === 'pantry' ? '#fdba74' : '#f8fafc'
    this.add
      .text(rect.x + 18, rect.y + 16, area.label, {
        ...textStyle,
        fontSize: '30px',
        color: labelColor,
      })
      .setDepth(2)

    this.add
      .text(rect.x + 20, rect.y + 54, area.riskLabel, {
        ...textStyle,
        fontSize: '19px',
        color: area.safe ? '#bbf7d0' : area.id === 'pantry' ? '#fed7aa' : '#cbd5e1',
      })
      .setDepth(2)
  }

  private drawOfficeProps(graphics: Phaser.GameObjects.Graphics) {
    this.drawWorkstations(graphics)
    this.drawPantry(graphics)
    this.drawRestroom(graphics)
    this.drawBossOffice(graphics)

    this.add
      .text(504, 686, '中央走廊', {
        ...textStyle,
        fontSize: '24px',
        color: '#fca5a5',
      })
      .setOrigin(0.5)
      .setDepth(2)
  }

  private drawWorkstations(graphics: Phaser.GameObjects.Graphics) {
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const x = 78 + col * 116
        const y = 284 + row * 92
        graphics.fillStyle(0xc59b6d, 1)
        graphics.fillRoundedRect(x, y, 86, 46, 6)
        graphics.fillStyle(0x111827, 1)
        graphics.fillRoundedRect(x + 22, y + 6, 42, 18, 3)
        graphics.fillStyle(0x334155, 1)
        graphics.fillRoundedRect(x + 8, y + 52, 48, 28, 6)
        graphics.fillStyle(0x3f7f5f, 1)
        graphics.fillCircle(x + 74, y + 14, 6)
      }
    }
  }

  private drawPantry(graphics: Phaser.GameObjects.Graphics) {
    graphics.fillStyle(0xf3c47e, 1)
    graphics.fillRoundedRect(742, 368, 160, 48, 22)
    graphics.fillStyle(0x765039, 1)
    graphics.fillCircle(765, 424, 10)
    graphics.fillCircle(882, 424, 10)
    graphics.fillStyle(0xdad7c8, 1)
    graphics.fillRoundedRect(724, 252, 72, 92, 8)
    graphics.fillStyle(0x1f2937, 1)
    graphics.fillRoundedRect(826, 250, 136, 38, 6)
    this.add.text(846, 255, '☕ 🧋 🍪', { fontSize: '25px' }).setDepth(3)
  }

  private drawRestroom(graphics: Phaser.GameObjects.Graphics) {
    graphics.fillStyle(0xd5eef7, 1)
    graphics.fillRoundedRect(750, 548, 70, 90, 8)
    graphics.fillRoundedRect(872, 548, 70, 90, 8)
    graphics.fillStyle(0x64748b, 1)
    graphics.fillRoundedRect(750, 632, 70, 10, 4)
    graphics.fillRoundedRect(872, 632, 70, 10, 4)
    this.add.text(792, 520, '100% SAFE', { ...textStyle, fontSize: '22px', color: '#86efac' }).setDepth(3)
  }

  private drawBossOffice(graphics: Phaser.GameObjects.Graphics) {
    graphics.fillStyle(0x8b5a32, 1)
    graphics.fillRoundedRect(352, 120, 190, 45, 8)
    graphics.fillStyle(0x2b170f, 1)
    graphics.fillRoundedRect(326, 58, 92, 44, 6)
    graphics.fillRoundedRect(472, 58, 92, 44, 6)
    this.add.text(346, 64, '📚📁', { fontSize: '24px' }).setDepth(3)
    this.add.text(492, 64, '🏆📊', { fontSize: '24px' }).setDepth(3)
  }

  private drawDoor(x: number, y: number, size: number, label: string) {
    this.add
      .rectangle(x, y, size, 18, 0x0f172a, 0.95)
      .setStrokeStyle(2, 0xfacc15, 0.82)
      .setDepth(3)
    this.add
      .text(x, y - 24, label, { ...textStyle, fontSize: '26px', color: '#38bdf8' })
      .setOrigin(0.5)
      .setDepth(4)
  }

  private createCharacters() {
    this.player = this.add.container(PLAYER_SPAWN.x, PLAYER_SPAWN.y).setDepth(20)
    const playerBody = this.add.circle(0, 0, 22, 0xf7d08a, 1).setStrokeStyle(4, 0x0f172a)
    const playerHair = this.add.rectangle(0, -15, 36, 16, 0x111827, 1)
    const playerSuit = this.add.triangle(0, 22, -18, 8, 18, 8, 0, 38, 0x2563eb, 1)
    const playerLabel = this.add
      .text(0, 48, '你', { ...textStyle, fontSize: '22px', color: '#bbf7d0' })
      .setOrigin(0.5)
    this.player.add([playerSuit, playerBody, playerHair, playerLabel])

    this.boss = this.add.container(BOSS_SPAWN.x, BOSS_SPAWN.y).setDepth(22)
    const bossBody = this.add.circle(0, 0, 24, 0xffdfaa, 1).setStrokeStyle(4, 0x1f0f0f)
    const bossSuit = this.add.triangle(0, 25, -22, 6, 22, 6, 0, 42, 0x8f1d1d, 1)
    const bossBrows = this.add.rectangle(0, -8, 35, 6, 0x111111, 1)
    const bossLabel = this.add
      .text(0, 52, '老板', { ...textStyle, fontSize: '20px', color: '#fecaca' })
      .setOrigin(0.5)
    this.boss.add([bossSuit, bossBody, bossBrows, bossLabel])
  }

  private createOverlays() {
    this.visionGraphics = this.add.graphics().setDepth(14)
    this.markerGraphics = this.add.graphics().setDepth(12)
    this.actionBadge = this.add
      .text(PLAYER_SPAWN.x, PLAYER_SPAWN.y - 48, '待机', {
        ...textStyle,
        fontSize: '18px',
        color: '#e0f2fe',
      })
      .setOrigin(0.5)
      .setDepth(30)
    this.doorBadge = this.add
      .text(BOSS_SPAWN.x, BOSS_SPAWN.y + 76, '老板开门了！', {
        ...textStyle,
        fontSize: '28px',
        color: '#fef08a',
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setVisible(false)
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
    if (target) {
      this.movePlayerTo(target)
    }
  }

  private handleSetAction = (event: Event) => {
    const action = (event as CustomEvent<{ action: PlayerAction }>).detail.action
    const state = useGameStore.getState()
    const config = LEVEL_ACTIONS.find((item) => item.id === action)

    if (!config || config.area !== state.currentArea || state.currentAction === 'moving') {
      return
    }

    useGameStore.getState().setAction(action)
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    this.movePlayerTo({ x: pointer.worldX, y: pointer.worldY })
  }

  private resetScene(startPatrol = false) {
    this.player.setPosition(PLAYER_SPAWN.x, PLAYER_SPAWN.y)
    this.boss.setPosition(BOSS_SPAWN.x, BOSS_SPAWN.y)
    this.playerTarget = null
    this.bossTarget = null
    this.bossRouteIndex = 0
    this.bossFacing = Math.PI / 2
    this.exposureMs = 0
    this.fishPopup = 0
    this.salaryPopup = 0
    this.popupTimer = 0
    this.markerGraphics.clear()
    this.doorBadge.setVisible(false)
    this.clearPatrolTimer()

    const store = useGameStore.getState()
    store.setArea('workstation')
    store.setAction('idle', true)
    store.setBossStatus('resting')
    store.setThreatText('休息中')

    if (startPatrol) {
      this.scheduleBossWarning(GAME_CONFIG.timing.firstPatrolDelayMs)
    }
  }

  private movePlayerTo(target: Point) {
    const state = useGameStore.getState()
    const timestamp = performance.now()

    if (
      state.phase !== 'playing' ||
      state.guideOpen ||
      timestamp < state.stunnedUntil ||
      state.currentAction === 'moving'
    ) {
      return
    }

    const targetArea = this.detectArea(target)
    if (targetArea === 'bossOffice' || target.y < 28 || target.y > 730 || target.x < 28 || target.x > 1052) {
      this.showFloatingText('老板办公室进不去', this.player.x, this.player.y - 72, '#fca5a5')
      return
    }

    this.playerTarget = target
    useGameStore.getState().setAction('moving', true)
    this.drawMoveMarker(target)
  }

  private drawMoveMarker(target: Point) {
    this.markerGraphics.clear()
    this.markerGraphics.lineStyle(3, 0x38bdf8, 0.88)
    this.markerGraphics.strokeCircle(target.x, target.y, 13)
    this.markerGraphics.lineBetween(this.player.x, this.player.y, target.x, target.y)
  }

  private updatePlayerMovement(deltaSeconds: number) {
    if (!this.playerTarget) {
      return
    }

    const next = moveTowards(
      { x: this.player.x, y: this.player.y },
      this.playerTarget,
      GAME_CONFIG.movement.playerSpeed * deltaSeconds,
    )

    this.player.setPosition(next.point.x, next.point.y)
    const currentArea = this.detectArea(next.point)
    useGameStore.getState().setArea(currentArea)

    if (next.arrived) {
      this.playerTarget = null
      this.markerGraphics.clear()
      useGameStore.getState().setAction('idle', true)
    }
  }

  private scheduleBossWarning(delay: number) {
    this.clearPatrolTimer()
    this.patrolTimer = this.time.delayedCall(delay, () => this.startBossWarning())
  }

  private startBossWarning() {
    const state = useGameStore.getState()
    if (state.phase !== 'playing') {
      return
    }

    state.setBossStatus('warning')
    this.doorBadge.setVisible(true).setAlpha(1)
    this.showFloatingText('老板开门了！', BOSS_SPAWN.x, BOSS_SPAWN.y + 92, '#fef08a')
    this.tweens.add({
      targets: this.doorBadge,
      scaleX: 1.08,
      scaleY: 1.08,
      yoyo: true,
      repeat: 3,
      duration: 120,
    })
    this.cameras.main.flash(160, 255, 230, 120)
    this.patrolTimer = this.time.delayedCall(GAME_CONFIG.timing.bossWarningMs, () => this.startPatrol())
  }

  private startPatrol() {
    const state = useGameStore.getState()
    if (state.phase !== 'playing') {
      return
    }

    state.setBossStatus('patrolling')
    this.doorBadge.setVisible(false)
    this.bossRouteIndex = 0
    this.bossTarget = BOSS_ROUTE[0]
  }

  private updateBossMovement(deltaSeconds: number) {
    const state = useGameStore.getState()
    if (state.bossStatus !== 'patrolling' || !this.bossTarget) {
      return
    }

    const next = moveTowards(
      { x: this.boss.x, y: this.boss.y },
      this.bossTarget,
      GAME_CONFIG.movement.bossSpeed * deltaSeconds,
    )

    this.boss.setPosition(next.point.x, next.point.y)
    this.bossFacing = Number.isFinite(next.angle) ? next.angle : this.bossFacing
    this.boss.setRotation(this.bossFacing - Math.PI / 2)

    if (next.arrived) {
      this.bossRouteIndex += 1
      if (this.bossRouteIndex >= BOSS_ROUTE.length) {
        this.finishPatrol()
      } else {
        this.bossTarget = BOSS_ROUTE[this.bossRouteIndex]
      }
    }
  }

  private finishPatrol() {
    this.boss.setPosition(BOSS_SPAWN.x, BOSS_SPAWN.y)
    this.boss.setRotation(0)
    this.bossTarget = null
    this.exposureMs = 0
    useGameStore.getState().setBossStatus('resting')
    this.scheduleBossWarning(
      Phaser.Math.Between(GAME_CONFIG.timing.bossRestMinMs, GAME_CONFIG.timing.bossRestMaxMs),
    )
  }

  private updateVisionGraphic() {
    const state = useGameStore.getState()
    this.visionGraphics.clear()

    if (state.bossStatus !== 'patrolling') {
      return
    }

    const range = GAME_CONFIG.vision.distance
    const halfAngle = (GAME_CONFIG.vision.angleDegrees * Math.PI) / 360
    const points: Point[] = [{ x: this.boss.x, y: this.boss.y }]

    for (let index = 0; index <= 18; index += 1) {
      const angle = this.bossFacing - halfAngle + (index / 18) * halfAngle * 2
      points.push({
        x: this.boss.x + Math.cos(angle) * range,
        y: this.boss.y + Math.sin(angle) * range,
      })
    }

    this.visionGraphics.fillStyle(0xff2626, 0.34)
    this.visionGraphics.fillPoints(points, true)
    this.visionGraphics.lineStyle(3, 0xff8a8a, 0.72)
    this.visionGraphics.strokePoints(points, true)
  }

  private updateExposure(deltaMs: number) {
    const store = useGameStore.getState()

    if (performance.now() < store.stunnedUntil || store.bossStatus !== 'patrolling') {
      this.exposureMs = 0
      return
    }

    const playerPoint = { x: this.player.x, y: this.player.y }
    const visible = isPointInVisionCone({
      viewer: { x: this.boss.x, y: this.boss.y },
      target: playerPoint,
      facingRadians: this.bossFacing,
      distance: GAME_CONFIG.vision.distance,
      angleDegrees: GAME_CONFIG.vision.angleDegrees,
    })

    const illegal = this.isIllegalState(store.currentArea, store.currentAction)

    if (visible && illegal) {
      this.exposureMs += deltaMs
      const percent = Math.min(100, Math.round((this.exposureMs / GAME_CONFIG.timing.illegalExposureMs) * 100))
      store.setThreatText(`暴露中 ${percent}%`)

      if (this.exposureMs >= GAME_CONFIG.timing.illegalExposureMs) {
        this.catchPlayer()
      }
      return
    }

    this.exposureMs = 0
    if (visible && !illegal) {
      store.setThreatText('老板看着你')
    } else {
      store.setThreatText(store.bossStatus === 'patrolling' ? '巡查中' : '休息中')
    }
  }

  private isIllegalState(area: AreaId, action: PlayerAction) {
    if (area === 'restroom' || action === 'working') {
      return false
    }

    if (area !== 'workstation') {
      return true
    }

    return action === 'watching' || action === 'chips'
  }

  private catchPlayer() {
    const store = useGameStore.getState()
    const { amount, title } = this.getPenalty(store.currentArea, store.currentAction)

    this.exposureMs = 0
    this.playerTarget = null
    this.markerGraphics.clear()
    store.applyCatch(amount, title)
    this.showFloatingText(`-${amount} 工资`, this.player.x, this.player.y - 70, '#fb7185')
    this.cameras.main.shake(230, 0.008)
  }

  private getPenalty(area: AreaId, action: PlayerAction) {
    if (area === 'workstation' && (action === 'watching' || action === 'chips')) {
      return { amount: GAME_CONFIG.penalties.workstationFish, title: '轻度警告' }
    }

    if (area === 'pantry') {
      return { amount: GAME_CONFIG.penalties.pantryFish, title: '中度处罚' }
    }

    return { amount: GAME_CONFIG.penalties.awayFromDesk, title: '离岗警告' }
  }

  private updateEconomy(deltaSeconds: number) {
    const gains = useGameStore.getState().tickEconomy(deltaSeconds)
    this.fishPopup += gains.fishGain
    this.salaryPopup += gains.salaryGain
    this.popupTimer += deltaSeconds

    if (this.popupTimer < 1) {
      return
    }

    if (this.fishPopup >= 0.8) {
      this.showFloatingText(`+${Math.round(this.fishPopup)} 摸鱼`, this.player.x, this.player.y - 62, '#fef3c7')
    }
    if (this.salaryPopup >= 0.8) {
      this.showFloatingText(`+${Math.round(this.salaryPopup)} 工资`, this.player.x, this.player.y - 88, '#86efac')
    }

    this.popupTimer = 0
    this.fishPopup = 0
    this.salaryPopup = 0
  }

  private updateActionBadge() {
    const state = useGameStore.getState()
    const action = LEVEL_ACTIONS.find((item) => item.id === state.currentAction)
    const label =
      state.currentAction === 'moving'
        ? '移动中'
        : state.currentAction === 'idle'
          ? '待机'
          : `${action?.icon ?? ''} ${action?.name ?? '待机'}`

    this.actionBadge
      .setText(action?.disguise ? `${label}｜伪装中` : label)
      .setPosition(this.player.x, this.player.y - 50)
  }

  private detectArea(point: Point): AreaId {
    const exactArea = areaOrder.find((id) => id !== 'corridor' && isInsideRect(point, LEVEL_AREAS[id].rect))
    if (exactArea) {
      return exactArea
    }

    return isInsideRect(point, LEVEL_AREAS.corridor.rect) ? 'corridor' : 'corridor'
  }

  private showFloatingText(text: string, x: number, y: number, color: string) {
    const label = this.add
      .text(x, y, text, { ...textStyle, fontSize: '22px', color })
      .setOrigin(0.5)
      .setDepth(50)

    this.tweens.add({
      targets: label,
      y: y - 34,
      alpha: 0,
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => label.destroy(),
    })
  }

  private clearPatrolTimer() {
    if (this.patrolTimer) {
      this.patrolTimer.remove(false)
      this.patrolTimer = null
    }
  }
}

import Phaser from 'phaser'
import { level1Config } from '../data/level1'
import type { Zone, PlayerAction } from '../types/game'
import { useGameStore } from '../store/gameStore'
import { isInVisionCone, shouldPlayerBeCaught, angleBetween } from './vision'

export class GameScene extends Phaser.Scene {
  private zoneOverlays: Map<string, Phaser.GameObjects.Rectangle> = new Map()
  private player!: Phaser.GameObjects.Container
  private playerBody!: Phaser.GameObjects.Graphics
  private playerLabel!: Phaser.GameObjects.Text
  private playerActionIcon!: Phaser.GameObjects.Text
  private playerShadow!: Phaser.GameObjects.Ellipse
  private targetPos: { x: number; y: number } | null = null
  private isMoving = false

  private boss!: Phaser.GameObjects.Container
  private bossBody!: Phaser.GameObjects.Graphics
  private bossLabel!: Phaser.GameObjects.Text
  private bossShadow!: Phaser.GameObjects.Ellipse
  private bossVision!: Phaser.GameObjects.Graphics
  private bossAngle = Math.PI / 2
  private patrolIndex = 0
  private isPatrolling = false
  private bossRestTimer = 0
  private firstPatrolDone = false
  private bossWaitTime = 0

  private alertTime = 0
  private alertGraphic!: Phaser.GameObjects.Graphics
  private gameActive = false
  private stunned = false
  private stunTimer = 0
  private earningsAccumulator = 0
  private bossDoorTimer = 0
  private currentHighlightZone: string | null = null

  constructor() {
    super({ key: 'GameScene' })
  }

  preload() {
    this.load.image('bg_workstation', '/images/workstation.png')
    this.load.image('bg_breakroom', '/images/breakroom.png')
    this.load.image('bg_restroom', '/images/restroom.png')
    this.load.image('bg_bossOffice', '/images/bossOffice.png')
  }

  create() {
    this.cameras.main.setBackgroundColor('#161b22')
    this.drawMap()
    this.createPlayer()
    this.createBoss()
    this.createAlertIndicator()

    this.gameActive = true
    this.stunned = false
    this.patrolIndex = 0
    this.isPatrolling = false
    this.firstPatrolDone = false
    this.bossRestTimer = level1Config.bossFirstDelay
    this.alertTime = 0

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-ESC', () => {
        this.targetPos = null
        this.isMoving = false
      })
    }
  }

  update(_time: number, delta: number) {
    if (!this.gameActive) return
    const dt = delta / 1000
    const store = useGameStore.getState()
    if (store.phase !== 'playing') return

    store.setElapsedTime((Date.now() - store.startTime) / 1000)

    if (store.slacking >= level1Config.targetSlacking && store.salary > 0) {
      this.gameActive = false
      store.saveToLeaderboard()
      store.setPhase('won')
      return
    }
    if (store.salary <= 0) {
      this.gameActive = false
      store.setPhase('lost')
      return
    }

    if (this.stunned) {
      this.stunTimer -= dt
      if (this.stunTimer <= 0) {
        this.stunned = false
        store.setPlayerStunned(false)
        store.setPlayerAction('idle')
      }
      return
    }

    this.updatePlayerMovement(dt)
    this.updateBoss(dt)
    this.updateBossAngle(dt)
    this.updateVisionCheck(dt)
    this.updateEarnings(dt)
    this.drawBossVision()
    this.updatePlayerIcon()
    this.updateZoneHighlights()
  }

  // ==================== 无缝地图 ====================

  private drawMap() {
    const { zones, mapWidth, mapHeight } = level1Config

    // 底色填满整个画布
    const bg = this.add.graphics()
    bg.fillStyle(0x161b22, 1)
    bg.fillRect(0, 0, mapWidth, mapHeight)

    // 图片映射
    const imgMap: Record<string, string> = {
      bossOffice: 'bg_bossOffice',
      workstation: 'bg_workstation',
      breakroom: 'bg_breakroom',
      restroom: 'bg_restroom',
    }

    for (const zone of zones) {
      const zx = zone.x
      const zy = zone.y
      const zw = zone.width
      const zh = zone.height
      const cx = zx + zw / 2
      const cy = zy + zh / 2

      // 区域底色（无缝填满）
      this.add.rectangle(cx, cy, zw, zh, zone.color, 1).setDepth(0)

      // 产品图背景（半透明叠加）
      const imgKey = imgMap[zone.id]
      if (imgKey && this.textures.exists(imgKey)) {
        const img = this.add.image(cx, cy, imgKey)
        img.setDisplaySize(zw, zh)
        img.setAlpha(0.35)
        img.setDepth(1)
      }

      // 内部细边框（不占额外空间，纯视觉分区）
      const innerBorder = this.add.rectangle(cx, cy, zw, zh)
      innerBorder.setStrokeStyle(2, zone.borderColor, 0.5)
      innerBorder.setFillStyle(0x000000, 0)
      innerBorder.setDepth(2)

      // 玩家可进入区域的高亮叠加层
      if (zone.playerCanEnter && zone.id !== 'corridor' && zone.id !== 'corridorBottom') {
        const overlay = this.add.rectangle(cx, cy, zw, zh, 0x000000, 0)
        overlay.setDepth(3)
        this.zoneOverlays.set(zone.id, overlay)
      }

      // 区域标签（半透明底条）
      if (zone.id !== 'corridor' && zone.id !== 'corridorBottom') {
        this.add.text(zx + 8, zy + 6, zone.label, {
          fontSize: '12px',
          fontFamily: 'system-ui, sans-serif',
          color: '#ffffff',
          fontStyle: 'bold',
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: { x: 4, y: 2 },
        }).setDepth(6)
      }

      // 区域特殊标识
      if (zone.safeZone) {
        this.add.text(zx + zw - 10, zy + zh - 10, '🛡️', {
          fontSize: '14px',
        }).setOrigin(1, 1).setDepth(6)
      }
      if (zone.id === 'breakroom') {
        this.add.text(zx + zw - 10, zy + 6, '⚠️ 高风险', {
          fontSize: '10px', color: '#d29922', fontFamily: 'system-ui, sans-serif',
          backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 3, y: 1 },
        }).setOrigin(1, 0).setDepth(6)
      }
      if (!zone.playerCanEnter) {
        this.add.text(zx + zw - 10, zy + 6, '🚫', {
          fontSize: '12px',
        }).setOrigin(1, 0).setDepth(6)
      }
    }

    // 走廊装饰
    const corridorZone = zones.find(z => z.id === 'corridor')!
    this.add.text(corridorZone.x + corridorZone.width / 2, corridorZone.y + 100, '🪴', { fontSize: '16px' }).setOrigin(0.5).setDepth(4)
    this.add.text(corridorZone.x + corridorZone.width / 2, corridorZone.y + 220, '💧', { fontSize: '14px' }).setOrigin(0.5).setDepth(4)
  }

  private updateZoneHighlights() {
    const store = useGameStore.getState()
    const pz = store.playerZone
    if (this.currentHighlightZone === pz) return
    this.currentHighlightZone = pz

    for (const [zoneId, overlay] of this.zoneOverlays) {
      if (zoneId === pz) {
        const zone = level1Config.zones.find(z => z.id === zoneId)
        overlay.setFillStyle(zone!.borderColor, 0.08)
      } else {
        overlay.setFillStyle(0x000000, 0)
      }
    }
  }

  // ==================== 玩家 ====================

  private createPlayer() {
    const spawn = level1Config.zones.find(z => z.id === 'workstation')!.playerSpawn

    this.playerShadow = this.add.ellipse(0, 4, 22, 8, 0x000000, 0.25).setDepth(14)
    this.playerBody = this.add.graphics()
    this.drawPlayerBody(0x4488ff)
    this.playerLabel = this.add.text(0, -22, '我', {
      fontSize: '9px', color: '#fff', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
      backgroundColor: '#3366cc99', padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setDepth(16)
    this.playerActionIcon = this.add.text(0, -35, '😐', { fontSize: '12px' }).setOrigin(0.5).setDepth(16)

    this.player = this.add.container(spawn.x, spawn.y)
    this.player.add([this.playerShadow, this.playerBody, this.playerLabel, this.playerActionIcon])
    this.player.setDepth(15).setSize(20, 20)
  }

  private drawPlayerBody(color: number) {
    this.playerBody.clear()
    this.playerBody.fillStyle(0xffffff, 0.9)
    this.playerBody.fillCircle(0, 0, 11)
    this.playerBody.fillStyle(color, 0.85)
    this.playerBody.fillCircle(0, 2, 3)
    this.playerBody.lineStyle(1.5, color, 0.5)
    this.playerBody.strokeCircle(0, 0, 12)
    this.playerBody.fillStyle(0x222222, 1)
    this.playerBody.slice(0, -2, 7, -Math.PI, 0, false)
    this.playerBody.fillPath()
  }

  private updatePlayerMovement(dt: number) {
    if (!this.targetPos || !this.isMoving) return

    const speed = 200
    const dx = this.targetPos.x - this.player.x
    const dy = this.targetPos.y - this.player.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 5) {
      this.player.setPosition(this.targetPos.x, this.targetPos.y)
      this.isMoving = false
      this.targetPos = null
      useGameStore.getState().setPlayerAction('idle')
      return
    }

    this.player.x += (dx / dist) * speed * dt
    this.player.y += (dy / dist) * speed * dt
    this.playerShadow.setScale(1 + Math.sin(Date.now() / 80) * 0.08, 1)

    const zone = this.getPlayerZone(this.player.x, this.player.y)
    if (zone) useGameStore.getState().setPlayerZone(zone)
  }

  private getPlayerZone(x: number, y: number): Zone | null {
    for (const z of level1Config.zones) {
      if (x >= z.x && x <= z.x + z.width && y >= z.y && y <= z.y + z.height) return z.id
    }
    return null
  }

  movePlayerToZone(zoneId: Zone) {
    if (this.stunned || this.isMoving) return
    const zone = level1Config.zones.find(z => z.id === zoneId)
    if (!zone || !zone.playerCanEnter) return
    this.targetPos = { x: zone.playerSpawn.x, y: zone.playerSpawn.y }
    this.isMoving = true
    const store = useGameStore.getState()
    store.setPlayerAction('moving')
    store.setPlayerZone(zoneId)
  }

  setPlayerAction(action: PlayerAction) {
    if (this.stunned || this.isMoving) return
    const store = useGameStore.getState()
    if (!store.canAct()) return
    store.setPlayerAction(action)
    store.setLastActionTime(Date.now())
  }

  private updatePlayerIcon() {
    const icons: Record<string, string> = {
      idle: '😐', moving: '🏃', working: '💻', watching: '📺',
      chips: '🍟', milkTea: '🧋', chatting: '💬', fakeWorking: '🖥️', phone: '📱',
    }
    this.playerActionIcon.setText(icons[useGameStore.getState().playerAction] || '😐')
  }

  // ==================== 老板 ====================

  private createBoss() {
    const spawn = level1Config.zones.find(z => z.id === 'bossOffice')!.playerSpawn

    this.bossShadow = this.add.ellipse(0, 4, 24, 10, 0x000000, 0.3).setDepth(11)
    this.bossBody = this.add.graphics()
    this.drawBossBody()
    this.bossLabel = this.add.text(0, -22, '老板', {
      fontSize: '9px', color: '#ff7b72', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
      backgroundColor: '#cc000099', padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setDepth(14)
    this.bossVision = this.add.graphics().setDepth(8)

    this.boss = this.add.container(spawn.x, spawn.y)
    this.boss.add([this.bossShadow, this.bossVision, this.bossBody, this.bossLabel])
    this.boss.setDepth(12).setSize(20, 20)
  }

  private drawBossBody() {
    this.bossBody.clear()
    this.bossBody.fillStyle(0x1a1a1a, 0.95)
    this.bossBody.fillCircle(0, 0, 13)
    this.bossBody.fillStyle(0xcc0000, 1)
    this.bossBody.fillTriangle(-2.5, -1, 2.5, -1, 0, 8)
    this.bossBody.lineStyle(1.5, 0xff4444, 0.4)
    this.bossBody.strokeCircle(0, 0, 15)
    this.bossBody.fillStyle(0xffcc00, 1)
    this.bossBody.fillCircle(-4, -3, 1.5)
    this.bossBody.fillCircle(4, -3, 1.5)
    this.bossBody.fillStyle(0x333333, 1)
    this.bossBody.slice(0, -2, 8, -Math.PI, 0, false)
    this.bossBody.fillPath()
  }

  private updateBoss(dt: number) {
    const store = useGameStore.getState()
    if (!this.isPatrolling) {
      this.bossRestTimer -= dt
      if (this.bossRestTimer <= 0) {
        this.isPatrolling = true
        this.patrolIndex = 0
        store.setBossState('patrolling')
        store.setBossLeaving(true)
        this.bossDoorTimer = 1.5
        this.firstPatrolDone = true
      } else {
        if (this.bossRestTimer < 1.5 && !store.bossLeaving) {
          store.setBossLeaving(true)
          this.bossDoorTimer = 1.5
        }
        store.setBossState('resting')
      }
    }
    if (store.bossLeaving && this.bossDoorTimer > 0) {
      this.bossDoorTimer -= dt
      if (this.bossDoorTimer <= 0) store.setBossLeaving(false)
    }
    if (this.isPatrolling) this.updatePatrol(dt)
  }

  private updatePatrol(dt: number) {
    const route = level1Config.patrolRoute
    if (this.patrolIndex >= route.length) {
      this.isPatrolling = false
      useGameStore.getState().setBossState('resting')
      this.bossRestTimer = level1Config.bossPatrolCooldownMin +
        Math.random() * (level1Config.bossPatrolCooldownMax - level1Config.bossPatrolCooldownMin)
      return
    }
    const wp = route[this.patrolIndex]
    const dx = wp.x - this.boss.x
    const dy = wp.y - this.boss.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 5) {
      if (wp.waitTime && wp.waitTime > 0) {
        if (this.bossWaitTime <= 0) this.bossWaitTime = wp.waitTime
        this.bossWaitTime -= dt
        if (this.bossWaitTime > 0) return
      }
      this.bossWaitTime = 0
      this.patrolIndex++
    } else {
      const speed = 90
      this.boss.x += (dx / dist) * speed * dt
      this.boss.y += (dy / dist) * speed * dt
    }
  }

  private updateBossAngle() {
    if (this.isPatrolling && this.patrolIndex < level1Config.patrolRoute.length) {
      const wp = level1Config.patrolRoute[this.patrolIndex]
      this.bossAngle = angleBetween(this.boss.x, this.boss.y, wp.x, wp.y)
    } else {
      this.bossAngle = Math.PI / 2
    }
  }

  private drawBossVision() {
    this.bossVision.clear()
    const store = useGameStore.getState()
    if (store.bossState === 'resting' && !this.isPatrolling) return

    const { bossVisionAngle: angle, bossVisionDistance: dist } = level1Config
    const half = (angle / 2) * (Math.PI / 180)
    const segs = 24

    this.bossVision.fillStyle(0xff0000, 0.15)
    this.bossVision.beginPath()
    this.bossVision.moveTo(0, 0)
    for (let i = 0; i <= segs; i++) {
      const a = this.bossAngle - half + (i / segs) * half * 2
      this.bossVision.lineTo(Math.cos(a) * dist, Math.sin(a) * dist)
    }
    this.bossVision.lineTo(0, 0).fillPath()

    this.bossVision.lineStyle(1.5, 0xff4444, 0.3)
    this.bossVision.beginPath()
    this.bossVision.moveTo(0, 0)
    for (let i = 0; i <= segs; i++) {
      const a = this.bossAngle - half + (i / segs) * half * 2
      this.bossVision.lineTo(Math.cos(a) * dist, Math.sin(a) * dist)
    }
    this.bossVision.lineTo(0, 0).strokePath()
  }

  // ==================== 视野判定 ====================

  private createAlertIndicator() {
    this.alertGraphic = this.add.graphics().setDepth(20)
  }

  private updateVisionCheck(dt: number) {
    const store = useGameStore.getState()
    const pa = store.playerAction
    const slackingActions: PlayerAction[] = ['watching', 'chips', 'milkTea', 'chatting', 'fakeWorking', 'phone']
    const isSlacking = slackingActions.includes(pa)
    const notAtDesk = store.playerZone !== 'workstation'

    const inVision = isInVisionCone(
      this.boss.x, this.boss.y, this.bossAngle,
      this.player.x, this.player.y,
      level1Config.bossVisionAngle, level1Config.bossVisionDistance
    )
    const shouldCatch = shouldPlayerBeCaught(
      this.boss.x, this.boss.y, this.bossAngle,
      this.player.x, this.player.y,
      store.playerZone, pa === 'working',
      level1Config.bossVisionAngle, level1Config.bossVisionDistance
    )

    if (!this.isPatrolling) {
      this.alertTime = 0
      store.setBossAlert(0)
      this.alertGraphic.clear()
      return
    }

    if (shouldCatch && (isSlacking || notAtDesk)) {
      this.alertTime += dt
      store.setBossAlert(this.alertTime / level1Config.bossVisionAlertTime)
      this.alertGraphic.clear()
      const al = Math.min(1, this.alertTime / level1Config.bossVisionAlertTime)
      const pulse = 1 + Math.sin(Date.now() / 100) * 0.15
      this.alertGraphic.fillStyle(0xff0000, al * 0.35)
      this.alertGraphic.fillCircle(this.player.x, this.player.y, (20 + al * 10) * pulse)
      this.alertGraphic.lineStyle(2, 0xff4444, al * 0.8)
      this.alertGraphic.strokeCircle(this.player.x, this.player.y, (20 + al * 10) * pulse)
      this.alertGraphic.lineStyle(2, 0xff0000, al)
      this.alertGraphic.strokeCircle(this.player.x, this.player.y, 14)
      if (this.alertTime >= level1Config.bossVisionAlertTime) this.triggerCaught()
    } else {
      this.alertTime = Math.max(0, this.alertTime - dt * 2)
      store.setBossAlert(this.alertTime / level1Config.bossVisionAlertTime)
      this.alertGraphic.clear()
      if (inVision && pa === 'working') {
        this.alertGraphic.fillStyle(0x3fb950, 0.12)
        this.alertGraphic.fillCircle(this.player.x, this.player.y, 16)
      }
    }
  }

  private triggerCaught() {
    const store = useGameStore.getState()
    let penalty = 0
    const sa: PlayerAction[] = ['watching', 'chips', 'milkTea', 'chatting', 'fakeWorking', 'phone']
    if (sa.includes(store.playerAction)) {
      if (store.playerZone === 'workstation') penalty = level1Config.caughtPenalty.workstation
      else if (store.playerZone === 'breakroom') penalty = level1Config.caughtPenalty.breakroom
    } else {
      penalty = level1Config.caughtPenalty.notAtDesk
    }
    const taunt = level1Config.bossTaunts[Math.floor(Math.random() * level1Config.bossTaunts.length)]
    store.deductSalary(penalty)
    store.setCaughtEvent({ penalty, taunt, timestamp: Date.now() })
    this.stunned = true
    this.stunTimer = level1Config.caughtStunTime
    store.setPlayerStunned(true)
    store.setPlayerAction('idle')
    this.isMoving = false
    this.targetPos = null
    this.alertTime = 0
    this.cameras.main.shake(300, 0.012)
    this.drawPlayerBody(0xff2222)
    this.time.delayedCall(500, () => { if (this.gameActive) this.drawPlayerBody(0x4488ff) })
  }

  // ==================== 收益 ====================

  private updateEarnings(dt: number) {
    const store = useGameStore.getState()
    if (store.playerAction === 'idle' || store.playerAction === 'moving') return
    const action = level1Config.actions.find(a => a.id === store.playerAction)
    if (!action || !action.availableIn.includes(store.playerZone)) return
    this.earningsAccumulator += dt
    if (this.earningsAccumulator >= 0.1) {
      const f = this.earningsAccumulator
      this.earningsAccumulator = 0
      if (action.slackingPerSec > 0) store.addSlacking(action.slackingPerSec * f)
      if (action.salaryPerSec > 0) store.addSalary(action.salaryPerSec * f)
    }
  }

  cleanup() { this.gameActive = false }
}

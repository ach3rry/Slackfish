import Phaser from 'phaser'
import { level1Config } from '../data/level1'
import type { Zone, PlayerAction } from '../types/game'
import { useGameStore } from '../store/gameStore'
import { isInVisionCone, shouldPlayerBeCaught, angleBetween } from './vision'

export class GameScene extends Phaser.Scene {
  // 区域图片
  private zoneImages: Map<string, Phaser.GameObjects.Image> = new Map()
  private zoneOverlays: Map<string, Phaser.GameObjects.Rectangle> = new Map()
  private zoneLabels: Map<string, Phaser.GameObjects.Container> = new Map()

  // 玩家
  private player!: Phaser.GameObjects.Container
  private playerBody!: Phaser.GameObjects.Graphics
  private playerLabel!: Phaser.GameObjects.Text
  private playerActionIcon!: Phaser.GameObjects.Text
  private playerShadow!: Phaser.GameObjects.Ellipse
  private targetPos: { x: number; y: number } | null = null
  private isMoving = false

  // 老板
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

  // 视野追踪
  private alertTime = 0
  private alertGraphic!: Phaser.GameObjects.Graphics

  // 游戏状态
  private gameActive = false
  private stunned = false
  private stunTimer = 0

  // 收益计时器
  private earningsAccumulator = 0

  // 老板出门提示
  private bossDoorTimer = 0

  // 区域动画标记
  private currentHighlightZone: string | null = null

  constructor() {
    super({ key: 'GameScene' })
  }

  preload() {
    // 加载产品图片
    this.load.image('bg_workstation', '/images/workstation.png')
    this.load.image('bg_breakroom', '/images/breakroom.png')
    this.load.image('bg_restroom', '/images/restroom.png')
    this.load.image('bg_bossOffice', '/images/bossOffice.png')
    this.load.image('bg_overview', '/images/overview.png')
    this.load.image('bg_employee', '/images/employee.png')
  }

  create() {
    this.cameras.main.setBackgroundColor('#0d1117')

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

  // ==================== 地图绘制 ====================

  private drawMap() {
    const { zones, mapWidth, mapHeight } = level1Config

    // 深色背景
    const bg = this.add.graphics()
    bg.fillStyle(0x0d1117, 1)
    bg.fillRect(0, 0, mapWidth, mapHeight)

    // 地板纹理 - 灰色格子
    bg.fillStyle(0x161b22, 0.8)
    bg.fillRect(0, 0, mapWidth, mapHeight)
    bg.lineStyle(1, 0x21262d, 0.5)
    for (let x = 0; x < mapWidth; x += 32) {
      bg.moveTo(x, 0).lineTo(x, mapHeight)
    }
    for (let y = 0; y < mapHeight; y += 32) {
      bg.moveTo(0, y).lineTo(mapWidth, y)
    }
    bg.strokePath()

    // 各区域
    const imageKeys: Record<string, string> = {
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

      // 区域底色
      const baseRect = this.add.rectangle(cx, cy, zw - 2, zh - 2, zone.color, 0.35)

      // 加载产品图片
      const imgKey = imageKeys[zone.id]
      if (imgKey && this.textures.exists(imgKey)) {
        const img = this.add.image(cx, cy, imgKey)
        img.setDisplaySize(zw - 4, zh - 4)
        img.setAlpha(0.45)
        img.setDepth(1)
        this.zoneImages.set(zone.id, img)
      }

      // 区域边框 - 发光效果
      const border = this.add.rectangle(cx, cy, zw - 2, zh - 2)
      border.setStrokeStyle(2, zone.borderColor, 0.7)
      border.setFillStyle(0x000000, 0)
      border.setDepth(2)

      // 可交互区域的叠加层（用于高亮）
      if (zone.playerCanEnter) {
        const overlay = this.add.rectangle(cx, cy, zw - 4, zh - 4, 0x000000, 0)
        overlay.setDepth(3)
        this.zoneOverlays.set(zone.id, overlay)
      }

      // 区域标签容器
      const labelContainer = this.add.container(cx, zy + 20).setDepth(6)

      // 标签背景
      const labelBg = this.add.rectangle(0, 0, 0, 0, 0x000000, 0.7)
      const labelText = this.add.text(0, 0, zone.label, {
        fontSize: '13px',
        fontFamily: 'system-ui, Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5)

      // 根据区域类型添加额外标签
      const padding = 10
      const textWidth = labelText.width + padding * 2
      const textHeight = labelText.height + padding
      labelBg.setSize(textWidth + 4, textHeight + 4)
      labelBg.setStrokeStyle(1, zone.borderColor, 0.6)

      labelContainer.add([labelBg, labelText])

      // 安全区标识
      if (zone.safeZone) {
        const safeTag = this.add.text(cx, zy + zh - 18, '🛡️ 安全区', {
          fontSize: '11px', color: '#3fb950', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
          backgroundColor: '#0d111788', padding: { x: 4, y: 2 },
        }).setOrigin(0.5).setDepth(6)
      }

      // 高风险区标识
      if (zone.id === 'breakroom') {
        this.add.text(cx, zy + zh - 18, '⚠️ 高收益·高风险', {
          fontSize: '11px', color: '#d29922', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
          backgroundColor: '#0d111788', padding: { x: 4, y: 2 },
        }).setOrigin(0.5).setDepth(6)
      }

      // 禁入标识
      if (!zone.playerCanEnter && zone.id === 'bossOffice') {
        this.add.text(cx, zy + zh - 18, '🚫 禁入', {
          fontSize: '11px', color: '#f85149', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
          backgroundColor: '#0d111788', padding: { x: 4, y: 2 },
        }).setOrigin(0.5).setDepth(6)
      }
    }

    // 走廊装饰
    this.add.text(490, 250, '🪴', { fontSize: '20px' }).setOrigin(0.5).setDepth(4)
    this.add.text(490, 400, '🪴', { fontSize: '20px' }).setOrigin(0.5).setDepth(4)
    this.add.text(490, 550, '💧', { fontSize: '16px' }).setOrigin(0.5).setDepth(4)
  }

  private updateZoneHighlights() {
    const store = useGameStore.getState()
    const playerZone = store.playerZone

    if (this.currentHighlightZone === playerZone) return
    this.currentHighlightZone = playerZone

    for (const [zoneId, overlay] of this.zoneOverlays) {
      if (zoneId === playerZone) {
        const zone = level1Config.zones.find(z => z.id === zoneId)
        overlay.setFillStyle(zone!.borderColor, 0.08)
      } else {
        overlay.setFillStyle(0x000000, 0)
      }
    }
  }

  // ==================== 玩家 ====================

  private createPlayer() {
    const spawnZone = level1Config.zones.find(z => z.id === 'workstation')!

    // 阴影
    this.playerShadow = this.add.ellipse(0, 4, 24, 10, 0x000000, 0.3).setDepth(14)

    this.playerBody = this.add.graphics()
    this.drawPlayerBody(0x4488ff)

    this.playerLabel = this.add.text(0, -24, '我', {
      fontSize: '10px', color: '#ffffff', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
      backgroundColor: '#3366cc88', padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setDepth(16)

    this.playerActionIcon = this.add.text(0, -38, '😐', {
      fontSize: '14px',
    }).setOrigin(0.5).setDepth(16)

    this.player = this.add.container(spawnZone.playerSpawn.x, spawnZone.playerSpawn.y)
    this.player.add([this.playerShadow, this.playerBody, this.playerLabel, this.playerActionIcon])
    this.player.setDepth(15)
    this.player.setSize(24, 24)
  }

  private drawPlayerBody(color: number) {
    this.playerBody.clear()
    // 白衬衫身体
    this.playerBody.fillStyle(0xffffff, 0.95)
    this.playerBody.fillCircle(0, 0, 13)
    // 蓝色领带/标记
    this.playerBody.fillStyle(color, 0.9)
    this.playerBody.fillCircle(0, 2, 4)
    // 外圈光环
    this.playerBody.lineStyle(2, color, 0.6)
    this.playerBody.strokeCircle(0, 0, 14)
    // 头发（黑色圆弧）
    this.playerBody.fillStyle(0x222222, 1)
    this.playerBody.slice(0, -2, 8, -Math.PI, 0, false)
    this.playerBody.fillPath()
  }

  private updatePlayerMovement(dt: number) {
    if (!this.targetPos || !this.isMoving) return

    const speed = 180
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

    const moveX = (dx / dist) * speed * dt
    const moveY = (dy / dist) * speed * dt
    this.player.x += moveX
    this.player.y += moveY

    // 移动时微弹跳
    this.playerShadow.setScale(1 + Math.sin(Date.now() / 80) * 0.1, 1)

    const currentZone = this.getPlayerZone(this.player.x, this.player.y)
    if (currentZone) {
      useGameStore.getState().setPlayerZone(currentZone)
    }
  }

  private getPlayerZone(x: number, y: number): Zone | null {
    for (const zone of level1Config.zones) {
      if (x >= zone.x && x <= zone.x + zone.width &&
          y >= zone.y && y <= zone.y + zone.height) {
        return zone.id
      }
    }
    return null
  }

  movePlayerToZone(zoneId: Zone) {
    if (this.stunned || this.isMoving) return
    const zone = level1Config.zones.find(z => z.id === zoneId)
    if (!zone || !zone.playerCanEnter) return

    this.targetPos = { x: zone.playerSpawn.x, y: zone.playerSpawn.y }
    this.isMoving = true
    useGameStore.getState().setPlayerAction('moving')
    useGameStore.getState().setPlayerZone(zoneId)
  }

  setPlayerAction(action: PlayerAction) {
    if (this.stunned || this.isMoving) return
    const store = useGameStore.getState()
    if (!store.canAct()) return
    store.setPlayerAction(action)
    store.setLastActionTime(Date.now())
  }

  private updatePlayerIcon() {
    const store = useGameStore.getState()
    const icons: Record<string, string> = {
      idle: '😐', moving: '🏃', working: '💻', watching: '📺',
      chips: '🍟', milkTea: '🧋', chatting: '💬', fakeWorking: '🖥️', phone: '📱',
    }
    this.playerActionIcon.setText(icons[store.playerAction] || '😐')
  }

  // ==================== 老板 ====================

  private createBoss() {
    this.bossBody = this.add.graphics()
    this.drawBossBody()

    this.bossShadow = this.add.ellipse(0, 4, 26, 12, 0x000000, 0.4).setDepth(11)

    this.bossLabel = this.add.text(0, -24, '老板', {
      fontSize: '10px', color: '#ff6666', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
      backgroundColor: '#cc000088', padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setDepth(14)

    this.bossVision = this.add.graphics().setDepth(8)

    const boZone = level1Config.zones.find(z => z.id === 'bossOffice')!
    this.boss = this.add.container(boZone.playerSpawn.x, boZone.playerSpawn.y)
    this.boss.add([this.bossShadow, this.bossVision, this.bossBody, this.bossLabel])
    this.boss.setDepth(12)
    this.boss.setSize(24, 24)
  }

  private drawBossBody() {
    this.bossBody.clear()
    // 黑西装身体
    this.bossBody.fillStyle(0x1a1a1a, 0.95)
    this.bossBody.fillCircle(0, 0, 15)
    // 红色领带
    this.bossBody.fillStyle(0xcc0000, 1)
    this.bossBody.fillTriangle(-3, -1, 3, -1, 0, 10)
    // 红色外圈（危险光环）
    this.bossBody.lineStyle(2, 0xff4444, 0.5)
    this.bossBody.strokeCircle(0, 0, 17)
    // 愤怒表情
    this.bossBody.fillStyle(0xffcc00, 1)
    this.bossBody.fillCircle(-5, -4, 2)
    this.bossBody.fillCircle(5, -4, 2)
    // 头发
    this.bossBody.fillStyle(0x333333, 1)
    this.bossBody.slice(0, -3, 9, -Math.PI, 0, false)
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
      if (this.bossDoorTimer <= 0) {
        store.setBossLeaving(false)
      }
    }

    if (this.isPatrolling) {
      this.updatePatrol(dt)
    }
  }

  private updatePatrol(dt: number) {
    const route = level1Config.patrolRoute
    if (this.patrolIndex >= route.length) {
      this.isPatrolling = false
      const store = useGameStore.getState()
      store.setBossState('resting')
      this.bossRestTimer = level1Config.bossPatrolCooldownMin +
        Math.random() * (level1Config.bossPatrolCooldownMax - level1Config.bossPatrolCooldownMin)
      return
    }

    const waypoint = route[this.patrolIndex]
    const dx = waypoint.x - this.boss.x
    const dy = waypoint.y - this.boss.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 5) {
      if (waypoint.waitTime && waypoint.waitTime > 0) {
        if (this.bossWaitTime <= 0) this.bossWaitTime = waypoint.waitTime
        this.bossWaitTime -= dt
        if (this.bossWaitTime > 0) return
      }
      this.bossWaitTime = 0
      this.patrolIndex++
    } else {
      const speed = 85
      this.boss.x += (dx / dist) * speed * dt
      this.boss.y += (dy / dist) * speed * dt
    }
  }

  private updateBossAngle(_dt: number) {
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

    const { bossVisionAngle, bossVisionDistance } = level1Config
    const halfAngle = (bossVisionAngle / 2) * (Math.PI / 180)
    const segments = 24

    // 渐变扇形 - 从内到外逐渐透明
    this.bossVision.fillStyle(0xff0000, 0.18)
    this.bossVision.beginPath()
    this.bossVision.moveTo(0, 0)
    for (let i = 0; i <= segments; i++) {
      const angle = this.bossAngle - halfAngle + (i / segments) * halfAngle * 2
      this.bossVision.lineTo(
        Math.cos(angle) * bossVisionDistance,
        Math.sin(angle) * bossVisionDistance
      )
    }
    this.bossVision.lineTo(0, 0)
    this.bossVision.fillPath()

    // 扇形边线
    this.bossVision.lineStyle(1.5, 0xff4444, 0.35)
    this.bossVision.beginPath()
    this.bossVision.moveTo(0, 0)
    for (let i = 0; i <= segments; i++) {
      const angle = this.bossAngle - halfAngle + (i / segments) * halfAngle * 2
      this.bossVision.lineTo(
        Math.cos(angle) * bossVisionDistance,
        Math.sin(angle) * bossVisionDistance
      )
    }
    this.bossVision.lineTo(0, 0)
    this.bossVision.strokePath()
  }

  // ==================== 视野判定 ====================

  private createAlertIndicator() {
    this.alertGraphic = this.add.graphics().setDepth(20)
  }

  private updateVisionCheck(dt: number) {
    const store = useGameStore.getState()
    const playerAction = store.playerAction

    const slackingActions: PlayerAction[] = ['watching', 'chips', 'milkTea', 'chatting', 'fakeWorking', 'phone']
    const isSlacking = slackingActions.includes(playerAction)
    const notAtDesk = store.playerZone !== 'workstation'

    const inVision = isInVisionCone(
      this.boss.x, this.boss.y, this.bossAngle,
      this.player.x, this.player.y,
      level1Config.bossVisionAngle, level1Config.bossVisionDistance
    )

    const shouldCatch = shouldPlayerBeCaught(
      this.boss.x, this.boss.y, this.bossAngle,
      this.player.x, this.player.y,
      store.playerZone, playerAction === 'working',
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
      const alertLevel = Math.min(1, this.alertTime / level1Config.bossVisionAlertTime)
      // 外圈脉冲
      const pulse = 1 + Math.sin(Date.now() / 100) * 0.2
      this.alertGraphic.fillStyle(0xff0000, alertLevel * 0.4)
      this.alertGraphic.fillCircle(this.player.x, this.player.y, (22 + alertLevel * 12) * pulse)
      this.alertGraphic.lineStyle(2, 0xff4444, alertLevel * 0.8)
      this.alertGraphic.strokeCircle(this.player.x, this.player.y, (22 + alertLevel * 12) * pulse)
      // 内圈
      this.alertGraphic.lineStyle(3, 0xff0000, alertLevel)
      this.alertGraphic.strokeCircle(this.player.x, this.player.y, 16)

      if (this.alertTime >= level1Config.bossVisionAlertTime) {
        this.triggerCaught()
      }
    } else {
      this.alertTime = Math.max(0, this.alertTime - dt * 2)
      store.setBossAlert(this.alertTime / level1Config.bossVisionAlertTime)
      this.alertGraphic.clear()

      if (inVision && playerAction === 'working') {
        this.alertGraphic.fillStyle(0x3fb950, 0.15)
        this.alertGraphic.fillCircle(this.player.x, this.player.y, 18)
        this.alertGraphic.lineStyle(1, 0x3fb950, 0.3)
        this.alertGraphic.strokeCircle(this.player.x, this.player.y, 18)
      }
    }
  }

  private triggerCaught() {
    const store = useGameStore.getState()
    const zone = store.playerZone

    let penalty = 0
    const slackingActions: PlayerAction[] = ['watching', 'chips', 'milkTea', 'chatting', 'fakeWorking', 'phone']
    if (slackingActions.includes(store.playerAction)) {
      if (zone === 'workstation') penalty = level1Config.caughtPenalty.workstation
      else if (zone === 'breakroom') penalty = level1Config.caughtPenalty.breakroom
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

    this.cameras.main.shake(300, 0.015)

    // 闪红
    this.drawPlayerBody(0xff2222)
    this.time.delayedCall(600, () => {
      if (this.gameActive) this.drawPlayerBody(0x4488ff)
    })
  }

  // ==================== 收益 ====================

  private updateEarnings(dt: number) {
    const store = useGameStore.getState()
    if (store.playerAction === 'idle' || store.playerAction === 'moving') return

    const action = level1Config.actions.find(a => a.id === store.playerAction)
    if (!action || !action.availableIn.includes(store.playerZone)) return

    this.earningsAccumulator += dt
    if (this.earningsAccumulator >= 0.1) {
      const fraction = this.earningsAccumulator
      this.earningsAccumulator = 0
      if (action.slackingPerSec > 0) store.addSlacking(action.slackingPerSec * fraction)
      if (action.salaryPerSec > 0) store.addSalary(action.salaryPerSec * fraction)
    }
  }

  cleanup() {
    this.gameActive = false
  }
}

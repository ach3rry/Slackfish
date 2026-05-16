import Phaser from 'phaser'
import { level1Config } from '../data/level1'
import type { Zone, PlayerAction, ActionConfig } from '../types/game'
import { useGameStore } from '../store/gameStore'
import { isInVisionCone, shouldPlayerBeCaught, angleBetween } from './vision'

export class GameScene extends Phaser.Scene {
  // 地图元素
  private zoneRects: Map<string, Phaser.GameObjects.Rectangle> = new Map()
  private zoneLabels: Map<string, Phaser.GameObjects.Text> = new Map()

  // 玩家
  private player!: Phaser.GameObjects.Container
  private playerBody!: Phaser.GameObjects.Graphics
  private playerLabel!: Phaser.GameObjects.Text
  private playerActionIcon!: Phaser.GameObjects.Text
  private targetPos: { x: number; y: number } | null = null
  private isMoving = false

  // 老板
  private boss!: Phaser.GameObjects.Container
  private bossBody!: Phaser.GameObjects.Graphics
  private bossLabel!: Phaser.GameObjects.Text
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
  private bossDoorText!: Phaser.GameObjects.Text
  private bossDoorTimer = 0

  // 区域装饰
  private decorations: Phaser.GameObjects.GameObject[] = []

  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    const { mapWidth, mapHeight } = level1Config
    this.cameras.main.setBackgroundColor('#1a1a2e')

    this.drawMap()
    this.drawDecorations()
    this.createPlayer()
    this.createBoss()
    this.createAlertIndicator()
    this.createBossDoorText()

    this.gameActive = true
    this.stunned = false
    this.patrolIndex = 0
    this.isPatrolling = false
    this.firstPatrolDone = false
    this.bossRestTimer = level1Config.bossFirstDelay
    this.alertTime = 0

    // 键盘输入
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

    // 检查游戏结束
    if (store.phase !== 'playing') return

    // 更新计时
    store.setElapsedTime((Date.now() - store.startTime) / 1000)

    // 检查胜利/失败条件
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

    // 僵直恢复
    if (this.stunned) {
      this.stunTimer -= dt
      if (this.stunTimer <= 0) {
        this.stunned = false
        store.setPlayerStunned(false)
        store.setPlayerAction('idle')
      }
      return
    }

    // 玩家移动
    this.updatePlayerMovement(dt)

    // 老板 AI
    this.updateBoss(dt)

    // 更新老板面朝方向
    this.updateBossAngle(dt)

    // 视野判定
    this.updateVisionCheck(dt)

    // 收益计算
    this.updateEarnings(dt)

    // 更新视野绘制
    this.drawBossVision()

    // 更新角色表情
    this.updatePlayerIcon()
  }

  // ==================== 地图绘制 ====================

  private drawMap() {
    const { zones } = level1Config

    // 先画背景格子
    const bg = this.add.graphics()
    bg.fillStyle(0x1a1a2e, 1)
    bg.fillRect(0, 0, level1Config.mapWidth, level1Config.mapHeight)

    // 画网格
    bg.lineStyle(1, 0x252545, 0.3)
    for (let x = 0; x < level1Config.mapWidth; x += 40) {
      bg.moveTo(x, 0)
      bg.lineTo(x, level1Config.mapHeight)
    }
    for (let y = 0; y < level1Config.mapHeight; y += 40) {
      bg.moveTo(0, y)
      bg.lineTo(level1Config.mapWidth, y)
    }
    bg.strokePath()

    // 画各区域
    for (const zone of zones) {
      // 区域背景
      const rect = this.add.rectangle(
        zone.x + zone.width / 2,
        zone.y + zone.height / 2,
        zone.width - 4,
        zone.height - 4,
        zone.color,
        0.6
      )
      rect.setStrokeStyle(2, zone.borderColor, 0.8)

      this.zoneRects.set(zone.id, rect)

      // 区域标签
      const label = this.add.text(
        zone.x + zone.width / 2,
        zone.y + 18,
        zone.label,
        {
          fontSize: '14px',
          fontFamily: 'Arial',
          color: '#ffffff',
          fontStyle: 'bold',
          backgroundColor: `#${zone.borderColor.toString(16).padStart(6, '0')}88`,
          padding: { x: 6, y: 2 },
        }
      ).setOrigin(0.5, 0.5).setDepth(5)

      this.zoneLabels.set(zone.id, label)

      // 安全区标识
      if (zone.safeZone) {
        this.add.text(
          zone.x + zone.width / 2,
          zone.y + zone.height - 16,
          '🛡️ 安全区',
          { fontSize: '12px', color: '#44ff44', fontFamily: 'Arial' }
        ).setOrigin(0.5).setDepth(5)
      }

      // 危险区标识
      if (zone.id === 'breakroom') {
        this.add.text(
          zone.x + zone.width / 2,
          zone.y + zone.height - 16,
          '⚠️ 高收益·高风险',
          { fontSize: '12px', color: '#ffaa44', fontFamily: 'Arial' }
        ).setOrigin(0.5).setDepth(5)
      }
    }
  }

  private drawDecorations() {
    // 工位区 - 画几个小桌子
    const wsZone = level1Config.zones.find(z => z.id === 'workstation')!
    const deskPositions = [
      { x: wsZone.x + 60, y: wsZone.y + 80 },
      { x: wsZone.x + 160, y: wsZone.y + 80 },
      { x: wsZone.x + 260, y: wsZone.y + 80 },
      { x: wsZone.x + 60, y: wsZone.y + 180 },
      { x: wsZone.x + 160, y: wsZone.y + 180 },
      { x: wsZone.x + 260, y: wsZone.y + 180 },
    ]
    for (const pos of deskPositions) {
      const desk = this.add.rectangle(pos.x, pos.y, 50, 30, 0x445566, 0.5)
      desk.setStrokeStyle(1, 0x667788, 0.4)
      // 椅子
      this.add.rectangle(pos.x, pos.y + 25, 20, 15, 0x334455, 0.4)
      // 小电脑图标
      this.add.text(pos.x, pos.y, '🖥️', { fontSize: '16px' }).setOrigin(0.5)
    }

    // 茶水间 - 画设施
    const brZone = level1Config.zones.find(z => z.id === 'breakroom')!
    this.add.rectangle(brZone.x + 40, brZone.y + 80, 40, 30, 0x554422, 0.5).setStrokeStyle(1, 0x886644, 0.4)
    this.add.text(brZone.x + 40, brZone.y + 80, '☕', { fontSize: '16px' }).setOrigin(0.5)
    this.add.rectangle(brZone.x + 120, brZone.y + 80, 40, 30, 0x554422, 0.5).setStrokeStyle(1, 0x886644, 0.4)
    this.add.text(brZone.x + 120, brZone.y + 80, '🧋', { fontSize: '16px' }).setOrigin(0.5)
    this.add.rectangle(brZone.x + 200, brZone.y + 80, 50, 30, 0x554422, 0.5).setStrokeStyle(1, 0x886644, 0.4)
    this.add.text(brZone.x + 200, brZone.y + 80, '🛋️', { fontSize: '16px' }).setOrigin(0.5)

    // 卫生间 - 画设施
    const rrZone = level1Config.zones.find(z => z.id === 'restroom')!
    this.add.rectangle(rrZone.x + 60, rrZone.y + 80, 35, 30, 0x224466, 0.5).setStrokeStyle(1, 0x4488aa, 0.4)
    this.add.text(rrZone.x + 60, rrZone.y + 80, '🚻', { fontSize: '16px' }).setOrigin(0.5)
    this.add.rectangle(rrZone.x + 160, rrZone.y + 80, 40, 30, 0x224466, 0.5).setStrokeStyle(1, 0x4488aa, 0.4)
    this.add.text(rrZone.x + 160, rrZone.y + 80, '🚿', { fontSize: '16px' }).setOrigin(0.5)
    this.add.rectangle(rrZone.x + 280, rrZone.y + 80, 40, 30, 0x224466, 0.5).setStrokeStyle(1, 0x4488aa, 0.4)
    this.add.text(rrZone.x + 280, rrZone.y + 80, '🪞', { fontSize: '16px' }).setOrigin(0.5)

    // 老板办公室 - 画大桌子和椅子
    const boZone = level1Config.zones.find(z => z.id === 'bossOffice')!
    this.add.rectangle(boZone.x + 130, boZone.y + 65, 80, 40, 0x662222, 0.5).setStrokeStyle(1, 0xaa4444, 0.4)
    this.add.text(boZone.x + 130, boZone.y + 65, '👔', { fontSize: '18px' }).setOrigin(0.5)
    this.add.rectangle(boZone.x + 220, boZone.y + 65, 30, 30, 0x553333, 0.4)
    this.add.text(boZone.x + 220, boZone.y + 65, '🏆', { fontSize: '14px' }).setOrigin(0.5)
  }

  // ==================== 玩家 ====================

  private createPlayer() {
    const spawnZone = level1Config.zones.find(z => z.id === 'workstation')!

    this.playerBody = this.add.graphics()
    this.drawPlayerBody(0x4488ff)

    this.playerLabel = this.add.text(0, -20, '我', {
      fontSize: '10px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10)

    this.playerActionIcon = this.add.text(0, -32, '😐', {
      fontSize: '12px',
    }).setOrigin(0.5).setDepth(10)

    this.player = this.add.container(spawnZone.playerSpawn.x, spawnZone.playerSpawn.y)
    this.player.add([this.playerBody, this.playerLabel, this.playerActionIcon])
    this.player.setDepth(15)
    this.player.setSize(24, 24)
  }

  private drawPlayerBody(color: number) {
    this.playerBody.clear()
    this.playerBody.fillStyle(color, 0.9)
    this.playerBody.fillCircle(0, 0, 14)
    this.playerBody.lineStyle(2, 0xffffff, 0.8)
    this.playerBody.strokeCircle(0, 0, 14)
    // 小帽子效果
    this.playerBody.fillStyle(0x3366cc, 1)
    this.playerBody.fillRect(-8, -14, 16, 4)
  }

  private updatePlayerMovement(dt: number) {
    if (!this.targetPos || !this.isMoving) return

    const speed = 150 // 像素/秒
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

    // 更新所在区域
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

  /** 供外部 React 调用：移动玩家到指定区域 */
  movePlayerToZone(zoneId: Zone) {
    if (this.stunned || this.isMoving) return
    const zone = level1Config.zones.find(z => z.id === zoneId)
    if (!zone || !zone.playerCanEnter) return

    this.targetPos = { x: zone.playerSpawn.x, y: zone.playerSpawn.y }
    this.isMoving = true
    useGameStore.getState().setPlayerAction('moving')
    useGameStore.getState().setPlayerZone(zoneId)
  }

  /** 供外部 React 调用：设置行为 */
  setPlayerAction(action: PlayerAction) {
    if (this.stunned || this.isMoving) return
    const store = useGameStore.getState()
    if (!store.canAct()) return

    store.setPlayerAction(action)
    store.setLastActionTime(Date.now())
  }

  private updatePlayerIcon() {
    const store = useGameStore.getState()
    const actionIcons: Record<string, string> = {
      idle: '😐',
      moving: '🏃',
      working: '💻',
      watching: '📺',
      chips: '🍟',
      milkTea: '🧋',
      chatting: '💬',
      fakeWorking: '🖥️',
      phone: '📱',
    }
    this.playerActionIcon.setText(actionIcons[store.playerAction] || '😐')
  }

  // ==================== 老板 ====================

  private createBoss() {
    this.bossBody = this.add.graphics()
    this.drawBossBody()

    this.bossLabel = this.add.text(0, -20, '老板', {
      fontSize: '10px', color: '#ff4444', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10)

    this.bossVision = this.add.graphics().setDepth(8)

    const boZone = level1Config.zones.find(z => z.id === 'bossOffice')!
    this.boss = this.add.container(boZone.playerSpawn.x, boZone.playerSpawn.y)
    this.boss.add([this.bossVision, this.bossBody, this.bossLabel])
    this.boss.setDepth(12)
    this.boss.setSize(24, 24)
  }

  private drawBossBody() {
    this.bossBody.clear()
    this.bossBody.fillStyle(0xff2222, 0.9)
    this.bossBody.fillCircle(0, 0, 16)
    this.bossBody.lineStyle(2, 0xffaaaa, 0.8)
    this.bossBody.strokeCircle(0, 0, 16)
    // 领带效果
    this.bossBody.fillStyle(0xcc0000, 1)
    this.bossBody.fillTriangle(-3, 0, 3, 0, 0, 12)
    // 愤怒的眉毛
    this.bossBody.lineStyle(2, 0x000000, 1)
    this.bossBody.beginPath()
    this.bossBody.moveTo(-8, -8)
    this.bossBody.lineTo(-3, -5)
    this.bossBody.strokePath()
    this.bossBody.beginPath()
    this.bossBody.moveTo(8, -8)
    this.bossBody.lineTo(3, -5)
    this.bossBody.strokePath()
  }

  private updateBoss(dt: number) {
    const store = useGameStore.getState()

    if (!this.isPatrolling) {
      // 休息状态
      this.bossRestTimer -= dt
      if (this.bossRestTimer <= 0) {
        // 开始巡逻
        this.isPatrolling = true
        this.patrolIndex = 0
        store.setBossState('patrolling')

        // 显示出门警告
        if (!this.firstPatrolDone || true) {
          store.setBossLeaving(true)
          this.bossDoorTimer = 1.5
          this.firstPatrolDone = true
        }
      } else {
        // 即将出门提示
        if (this.bossRestTimer < 1.5 && !store.bossLeaving) {
          store.setBossLeaving(true)
          this.bossDoorTimer = 1.5
        }
        store.setBossState('resting')
      }
    }

    // 出门警告倒计时
    if (store.bossLeaving && this.bossDoorTimer > 0) {
      this.bossDoorTimer -= dt
      if (this.bossDoorTimer <= 0) {
        store.setBossLeaving(false)
      }
    }

    if (this.isPatrolling) {
      // 巡逻中
      this.updatePatrol(dt)
    }
  }

  private updatePatrol(dt: number) {
    const route = level1Config.patrolRoute
    if (this.patrolIndex >= route.length) {
      // 巡逻结束
      this.isPatrolling = false
      const store = useGameStore.getState()
      store.setBossState('resting')
      // 随机等待 3-5 秒
      this.bossRestTimer = level1Config.bossPatrolCooldownMin +
        Math.random() * (level1Config.bossPatrolCooldownMax - level1Config.bossPatrolCooldownMin)
      return
    }

    const waypoint = route[this.patrolIndex]
    const dx = waypoint.x - this.boss.x
    const dy = waypoint.y - this.boss.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 5) {
      // 到达路径点
      if (waypoint.waitTime && waypoint.waitTime > 0) {
        if (this.bossWaitTime <= 0) {
          this.bossWaitTime = waypoint.waitTime
        }
        this.bossWaitTime -= dt
        if (this.bossWaitTime > 0) return
      }
      this.bossWaitTime = 0
      this.patrolIndex++
    } else {
      const speed = 80
      const mx = (dx / dist) * speed * dt
      const my = (dy / dist) * speed * dt
      this.boss.x += mx
      this.boss.y += my
    }
  }

  private updateBossAngle(_dt: number) {
    if (this.isPatrolling && this.patrolIndex < level1Config.patrolRoute.length) {
      const waypoint = level1Config.patrolRoute[this.patrolIndex]
      this.bossAngle = angleBetween(this.boss.x, this.boss.y, waypoint.x, waypoint.y)
    } else {
      // 休息时朝下看
      this.bossAngle = Math.PI / 2
    }
  }

  private drawBossVision() {
    this.bossVision.clear()

    const store = useGameStore.getState()
    if (store.bossState === 'resting' && !this.isPatrolling) {
      return
    }

    const { bossVisionAngle, bossVisionDistance } = level1Config
    const halfAngle = (bossVisionAngle / 2) * (Math.PI / 180)

    // 画扇形
    this.bossVision.fillStyle(0xff0000, 0.15)
    this.bossVision.beginPath()
    this.bossVision.moveTo(0, 0)

    const segments = 20
    for (let i = 0; i <= segments; i++) {
      const angle = this.bossAngle - halfAngle + (i / segments) * halfAngle * 2
      const x = Math.cos(angle) * bossVisionDistance
      const y = Math.sin(angle) * bossVisionDistance
      if (i === 0) {
        this.bossVision.lineTo(x, y)
      } else {
        this.bossVision.lineTo(x, y)
      }
    }

    this.bossVision.lineTo(0, 0)
    this.bossVision.fillPath()

    // 扇形边框
    this.bossVision.lineStyle(1, 0xff0000, 0.3)
    this.bossVision.beginPath()
    this.bossVision.moveTo(0, 0)
    const startX = Math.cos(this.bossAngle - halfAngle) * bossVisionDistance
    const startY = Math.sin(this.bossAngle - halfAngle) * bossVisionDistance
    this.bossVision.lineTo(startX, startY)
    for (let i = 1; i <= segments; i++) {
      const angle = this.bossAngle - halfAngle + (i / segments) * halfAngle * 2
      const x = Math.cos(angle) * bossVisionDistance
      const y = Math.sin(angle) * bossVisionDistance
      this.bossVision.lineTo(x, y)
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

    // 判断是否在视野内且在做违规行为
    const slackingActions: PlayerAction[] = ['watching', 'chips', 'milkTea', 'chatting', 'fakeWorking', 'phone']
    const isSlacking = slackingActions.includes(playerAction)
    const notAtDesk = store.playerZone !== 'workstation'

    const inVision = isInVisionCone(
      this.boss.x, this.boss.y, this.bossAngle,
      this.player.x, this.player.y,
      level1Config.bossVisionAngle,
      level1Config.bossVisionDistance
    )

    const shouldCatch = shouldPlayerBeCaught(
      this.boss.x, this.boss.y, this.bossAngle,
      this.player.x, this.player.y,
      store.playerZone,
      playerAction === 'working',
      level1Config.bossVisionAngle,
      level1Config.bossVisionDistance
    )

    // 老板不在巡逻时不算
    if (!this.isPatrolling) {
      this.alertTime = 0
      store.setBossAlert(0)
      this.alertGraphic.clear()
      return
    }

    if (shouldCatch && (isSlacking || notAtDesk)) {
      this.alertTime += dt
      store.setBossAlert(this.alertTime / level1Config.bossVisionAlertTime)

      // 画警告指示器
      this.alertGraphic.clear()
      const alertLevel = Math.min(1, this.alertTime / level1Config.bossVisionAlertTime)
      this.alertGraphic.fillStyle(0xff0000, alertLevel * 0.5)
      this.alertGraphic.fillCircle(this.player.x, this.player.y, 20 + alertLevel * 10)
      this.alertGraphic.lineStyle(2, 0xff0000, alertLevel)
      this.alertGraphic.strokeCircle(this.player.x, this.player.y, 20 + alertLevel * 10)

      if (this.alertTime >= level1Config.bossVisionAlertTime) {
        this.triggerCaught()
      }
    } else {
      this.alertTime = Math.max(0, this.alertTime - dt * 2)
      store.setBossAlert(this.alertTime / level1Config.bossVisionAlertTime)
      this.alertGraphic.clear()

      // 在视野但安全时画黄色指示
      if (inVision && playerAction === 'working') {
        this.alertGraphic.clear()
        this.alertGraphic.fillStyle(0xffff00, 0.2)
        this.alertGraphic.fillCircle(this.player.x, this.player.y, 18)
      }
    }
  }

  private triggerCaught() {
    const store = useGameStore.getState()
    const zone = store.playerZone

    let penalty = 0
    const slackingActions: PlayerAction[] = ['watching', 'chips', 'milkTea', 'chatting', 'fakeWorking', 'phone']
    if (slackingActions.includes(store.playerAction)) {
      if (zone === 'workstation') {
        penalty = level1Config.caughtPenalty.workstation
      } else if (zone === 'breakroom') {
        penalty = level1Config.caughtPenalty.breakroom
      }
    } else {
      penalty = level1Config.caughtPenalty.notAtDesk
    }

    // 随机吐槽文案
    const taunt = level1Config.bossTaunts[Math.floor(Math.random() * level1Config.bossTaunts.length)]

    store.deductSalary(penalty)
    store.setCaughtEvent({
      penalty,
      taunt,
      timestamp: Date.now(),
    })

    // 僵直
    this.stunned = true
    this.stunTimer = level1Config.caughtStunTime
    store.setPlayerStunned(true)
    store.setPlayerAction('idle')
    this.isMoving = false
    this.targetPos = null
    this.alertTime = 0

    // 屏幕抖动
    this.cameras.main.shake(300, 0.01)

    // 玩家闪红
    this.drawPlayerBody(0xff2222)
    this.time.delayedCall(500, () => {
      if (this.gameActive) this.drawPlayerBody(0x4488ff)
    })
  }

  // ==================== 收益 ====================

  private updateEarnings(dt: number) {
    const store = useGameStore.getState()
    if (store.playerAction === 'idle' || store.playerAction === 'moving') return

    const action = level1Config.actions.find(a => a.id === store.playerAction)
    if (!action) return

    // 检查行为是否在当前区域可用
    if (!action.availableIn.includes(store.playerZone)) return

    this.earningsAccumulator += dt

    // 每 0.1 秒更新一次，平滑增长
    if (this.earningsAccumulator >= 0.1) {
      const fraction = this.earningsAccumulator
      this.earningsAccumulator = 0

      if (action.slackingPerSec > 0) {
        store.addSlacking(action.slackingPerSec * fraction)
      }
      if (action.salaryPerSec > 0) {
        store.addSalary(action.salaryPerSec * fraction)
      }
    }
  }

  // ==================== 老板出门提示 ====================

  private createBossDoorText() {
    this.bossDoorText = this.add.text(
      level1Config.mapWidth / 2,
      60,
      '',
      {
        fontSize: '20px',
        color: '#ff4444',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        backgroundColor: '#000000cc',
        padding: { x: 12, y: 6 },
      }
    ).setOrigin(0.5).setDepth(50).setAlpha(0)
  }

  /** 清理资源 */
  cleanup() {
    this.gameActive = false
  }
}

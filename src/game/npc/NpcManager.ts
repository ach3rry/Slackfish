import Phaser from 'phaser'
import { GAME_CONFIG } from '../config'
import { LEVEL_AREAS } from '../../data/level1'
import { isPointInVisionCone } from '../vision'
import type { AreaId, NpcData, NpcPersonality, NpcState, Point } from '../../types/game'

const CFG = GAME_CONFIG.npc
const textStyle = { fontFamily: 'Microsoft YaHei, SimHei, sans-serif', fontSize: '16px', color: '#a0b8d0' }
const bubbleStyle = { fontFamily: 'Microsoft YaHei, SimHei, sans-serif', fontSize: '15px', color: '#f0f0f0', stroke: '#1a1a2e', strokeThickness: 3 }

type NpcRender = {
  container: Phaser.GameObjects.Container
  sprite: Phaser.GameObjects.Image
  label: Phaser.GameObjects.Text
  bubble: Phaser.GameObjects.Text
  shadow: Phaser.GameObjects.Ellipse
  stateIcon: Phaser.GameObjects.Text
}

type DoorDef = { x: number; y: number; targetArea: AreaId }

const DOORS: DoorDef[] = [
  { x: 380, y: 232, targetArea: 'pantry' },
  { x: 380, y: 630, targetArea: 'restroom' },
  { x: 533, y: 400, targetArea: 'corridor' },
  { x: 533, y: 700, targetArea: 'corridor' },
]

const AREA_CENTERS: Record<string, Point> = {
  workstation: { x: 229, y: 500 },
  pantry: { x: 844, y: 232 },
  restroom: { x: 844, y: 634 },
  corridor: { x: 533, y: 500 },
}

const randRange = (min: number, max: number) => min + Math.random() * (max - min)
const randInt = (min: number, max: number) => Math.floor(randRange(min, max + 1))
const pickRandom = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

function detectArea(point: Point): AreaId {
  const x = point.x, y = point.y
  if (x < 458) return 'workstation'
  if (x >= 608) {
    if (y < 464) return 'pantry'
    if (y < 805) return 'restroom'
    return 'bossOffice'
  }
  return 'corridor'
}

export class NpcManager {
  private scene: Phaser.Scene
  private npcs: NpcData[] = []
  private renders: Map<number, NpcRender> = new Map()
  private bossRef: { x: number; y: number; facing: number; isPatrolling: boolean } = { x: 844, y: 1053, facing: Math.PI / 2, isPatrolling: false }

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  init() {
    this.npcs = []
    this.renders.forEach(r => r.container.destroy())
    this.renders.clear()

    for (let i = 0; i < CFG.count; i++) {
      const pos = CFG.spawnPositions[i] ?? { x: 200 + i * 40, y: 400 }
      const personality = CFG.personalities[i % CFG.personalities.length]
      const npc: NpcData = {
        id: i,
        name: CFG.namePool[i] ?? `同事${i}`,
        personality: personality as NpcPersonality,
        state: 'working',
        x: pos.x, y: pos.y,
        targetX: pos.x, targetY: pos.y,
        areaId: detectArea(pos),
        tint: CFG.tints[personality] ?? 0xcccccc,
        decisionTimer: randRange(1000, 3000),
        stateTimer: randRange(5000, 12000),
        reactionSpeed: CFG.reactionSpeeds[personality] ?? 0.5,
        fishTendency: CFG.fishTendency[personality] ?? 0.2,
        socialTendency: CFG.socialTendency[personality] ?? 0.2,
        stunnedUntil: 0,
      }
      this.npcs.push(npc)
      this.createRender(npc)
    }
  }

  update(deltaMs: number) {
    for (const npc of this.npcs) {
      npc.decisionTimer -= deltaMs
      npc.stateTimer -= deltaMs

      if (performance.now() < npc.stunnedUntil) continue

      if (npc.decisionTimer <= 0) {
        this.makeDecision(npc)
        npc.decisionTimer = randRange(CFG.decisionIntervalMs[0], CFG.decisionIntervalMs[1])
      }

      if (npc.stateTimer <= 0 && (npc.state === 'working' || npc.state === 'fishWorking' || npc.state === 'chatting' || npc.state === 'pantryRelax')) {
        this.makeDecision(npc)
      }

      this.updateMovement(npc, deltaMs / 1000)
      this.updateRender(npc)
    }
  }

  updateBossRef(bx: number, by: number, facing: number, isPatrolling: boolean) {
    this.bossRef = { x: bx, y: by, facing, isPatrolling }
  }

  onBossNear() {
    for (const npc of this.npcs) {
      if (performance.now() < npc.stunnedUntil) continue
      const dist = Math.hypot(npc.x - this.bossRef.x, npc.y - this.bossRef.y)
      if (dist > GAME_CONFIG.vision.distance * 1.2) continue
      if (Math.random() > npc.reactionSpeed) continue
      if (npc.state === 'fishWorking' || npc.state === 'chatting' || npc.state === 'pantryRelax') {
        npc.state = 'fakeWorking'
        npc.stateTimer = randRange(3000, 6000)
      }
    }
  }

  onBossScan(): number {
    let caughtCount = 0
    const catchRadius = GAME_CONFIG.bossAI.npcCatchRadius
    for (const npc of this.npcs) {
      if (performance.now() < npc.stunnedUntil) continue
      const dist = Math.hypot(npc.x - this.bossRef.x, npc.y - this.bossRef.y)
      if (dist > catchRadius) continue
      const visible = isPointInVisionCone({
        viewer: { x: this.bossRef.x, y: this.bossRef.y },
        target: { x: npc.x, y: npc.y },
        facingRadians: this.bossRef.facing,
        distance: GAME_CONFIG.vision.distance,
        angleDegrees: GAME_CONFIG.vision.angleDegrees,
      })
      if (!visible) continue
      if (npc.state === 'fishWorking' || npc.state === 'chatting' || npc.state === 'pantryRelax') {
        if (Math.random() < (1 - npc.reactionSpeed) * 0.6) {
          this.stunNpc(npc)
          caughtCount++
        } else {
          npc.state = 'fakeWorking'
          npc.stateTimer = randRange(3000, 6000)
        }
      }
    }
    return caughtCount
  }

  getCrowdCount(area: AreaId): number {
    return this.npcs.filter(n => n.areaId === area && n.state !== 'stunned').length
  }

  getPlayerExposureMultiplier(area: AreaId): number {
    const crowd = this.getCrowdCount(area)
    if (crowd <= 1) return 1
    return Math.max(0.3, 1 - (crowd - 1) * CFG.crowdExposureReduction)
  }

  tryPlayerBubble(playerX: number, playerY: number): string | null {
    for (const npc of this.npcs) {
      if (npc.state !== 'chatting' && npc.state !== 'fakeWorking') continue
      const dist = Math.hypot(npc.x - playerX, npc.y - playerY)
      if (dist < 80 && Math.random() < 0.003) {
        return pickRandom(CFG.bubbleTexts.friendly)
      }
    }
    return null
  }

  getNpcs() { return this.npcs }
  getNpc(id: number) { return this.npcs.find(n => n.id === id) }

  private stunNpc(npc: NpcData) {
    npc.state = 'stunned'
    npc.stunnedUntil = performance.now() + randRange(2000, 3000)
    this.showBubble(npc.id, '被抓了！')
  }

  private makeDecision(npc: NpcData) {
    const prevArea = npc.areaId

    if (npc.state === 'walking') return

    const roll = Math.random()
    const fishT = npc.fishTendency
    const socialT = npc.socialTendency

    if (npc.areaId === 'bossOffice') {
      this.moveToArea(npc, 'corridor')
      return
    }

    if (roll < fishT) {
      npc.state = 'fishWorking'
      npc.stateTimer = randRange(CFG.stateTimers.fishWorking[0] * 1000, CFG.stateTimers.fishWorking[1] * 1000)
    } else if (roll < fishT + socialT * 0.5) {
      if (npc.areaId !== 'pantry') {
        this.moveToArea(npc, 'pantry')
        return
      }
      npc.state = 'chatting'
      npc.stateTimer = randRange(CFG.stateTimers.chatting[0] * 1000, CFG.stateTimers.chatting[1] * 1000)
    } else if (roll < fishT + socialT * 0.5 + 0.1) {
      if (npc.areaId !== 'restroom') {
        if (Math.random() < 0.3) {
          this.moveToArea(npc, 'restroom')
          return
        }
      }
      npc.state = 'restroomBreak'
      npc.stateTimer = randRange(CFG.stateTimers.restroomBreak[0] * 1000, CFG.stateTimers.restroomBreak[1] * 1000)
    } else {
      npc.state = Math.random() < 0.7 ? 'working' : 'idle'
      npc.stateTimer = randRange(CFG.stateTimers.working[0] * 1000, CFG.stateTimers.working[1] * 1000)
    }

    if (Math.random() < 0.08 && prevArea !== 'pantry' && prevArea !== 'restroom') {
      const texts = Math.random() < 0.5 ? CFG.bubbleTexts.random : CFG.bubbleTexts.slacker
      this.showBubble(npc.id, pickRandom(texts))
    }
  }

  private moveToArea(npc: NpcData, area: AreaId) {
    const center = AREA_CENTERS[area]
    if (!center) return
    npc.state = 'walking'
    npc.targetX = center.x + randRange(-60, 60)
    npc.targetY = center.y + randRange(-60, 60)
    npc.stateTimer = randRange(CFG.stateTimers.walking[0] * 1000, CFG.stateTimers.walking[1] * 1000)
  }

  private updateMovement(npc: NpcData, ds: number) {
    if (npc.state !== 'walking') return

    const dx = npc.targetX - npc.x
    const dy = npc.targetY - npc.y
    const dist = Math.hypot(dx, dy)
    const speed = CFG.speed * ds

    if (dist <= speed || dist === 0) {
      npc.x = npc.targetX
      npc.y = npc.targetY
      npc.areaId = detectArea({ x: npc.x, y: npc.y })
      const newState: NpcState = npc.areaId === 'pantry' ? 'chatting' : npc.areaId === 'restroom' ? 'restroomBreak' : 'working'
      npc.state = newState
      npc.stateTimer = randRange(4000, 10000)
      return
    }

    const r = speed / dist
    npc.x += dx * r
    npc.y += dy * r

    // Separation from other NPCs
    for (const other of this.npcs) {
      if (other.id === npc.id) continue
      const sx = npc.x - other.x
      const sy = npc.y - other.y
      const sd = Math.hypot(sx, sy)
      if (sd < CFG.separationRadius && sd > 0) {
        const force = CFG.separationForce * ds / sd
        npc.x += sx * force
        npc.y += sy * force
      }
    }

    npc.areaId = detectArea({ x: npc.x, y: npc.y })
  }

  private createRender(npc: NpcData) {
    const container = this.scene.add.container(npc.x, npc.y).setDepth(10)

    const shadow = this.scene.add.ellipse(0, 8, 30, 9, 0x000000, 0.2).setDepth(0)
    const sprite = this.scene.add.image(0, 0, 'player-idle').setDisplaySize(50, 74).setOrigin(0.5, 0.9).setDepth(1).setTint(npc.tint)
    const label = this.scene.add.text(0, 22, npc.name, { ...textStyle, fontSize: '14px' }).setOrigin(0.5).setDepth(2).setAlpha(0.8)
    const bubble = this.scene.add.text(0, -55, '', { ...bubbleStyle, backgroundColor: '#1a1a2ecc', padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(3).setVisible(false)
    const stateIcon = this.scene.add.text(0, -38, '', { fontSize: '14px' }).setOrigin(0.5).setDepth(2).setAlpha(0.7)

    container.add([shadow, sprite, label, bubble, stateIcon])
    this.renders.set(npc.id, { container, sprite, label, bubble, shadow, stateIcon })
  }

  private updateRender(npc: NpcData) {
    const r = this.renders.get(npc.id)
    if (!r) return

    r.container.setPosition(npc.x, npc.y)

    const texture = this.getTextureForState(npc.state)
    const isLarge = texture !== 'player-idle' && texture !== 'player-walk-1' && texture !== 'player-side'
    r.sprite.setTexture(texture).setDisplaySize(isLarge ? 110 : 50, isLarge ? 98 : 74)

    if (npc.state === 'stunned') {
      r.sprite.setAlpha(0.6)
      r.label.setColor('#fca5a5')
    } else {
      r.sprite.setAlpha(0.85)
      r.label.setColor('#a0b8d0')
    }

    const icon = this.getStateIcon(npc.state)
    r.stateIcon.setText(icon).setVisible(!!icon)
  }

  private getTextureForState(state: NpcState): string {
    switch (state) {
      case 'working': case 'fakeWorking': return 'player-work'
      case 'fishWorking': return Math.random() < 0.5 ? 'player-chips' : 'player-phone'
      case 'chatting': case 'pantryRelax': return 'player-milk-tea'
      case 'restroomBreak': return 'player-phone'
      case 'walking': return Math.floor(this.scene.time.now / 200) % 2 === 0 ? 'player-walk-1' : 'player-walk-2'
      default: return 'player-idle'
    }
  }

  private getStateIcon(state: NpcState): string {
    switch (state) {
      case 'fishWorking': return '🐟'
      case 'chatting': return '💬'
      case 'pantryRelax': return '☕'
      case 'stunned': return '😵'
      case 'fakeWorking': return '👀'
      case 'restroomBreak': return '📱'
      default: return ''
    }
  }

  private showBubble(id: number, text: string) {
    const r = this.renders.get(id)
    if (!r) return
    r.bubble.setText(text).setVisible(true).setAlpha(1)
    this.scene.tweens.add({
      targets: r.bubble, y: r.bubble.y - 20, alpha: 0, duration: 2500, ease: 'Sine.easeOut',
      onComplete: () => { r.bubble.setVisible(false).setY(-55) },
    })
  }

  destroy() {
    this.renders.forEach(r => r.container.destroy())
    this.renders.clear()
    this.npcs = []
  }
}

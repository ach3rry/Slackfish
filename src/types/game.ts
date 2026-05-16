/** 玩家行为枚举 */
export type PlayerAction =
  | 'idle'
  | 'moving'
  | 'working'
  | 'watching'
  | 'chips'
  | 'milkTea'
  | 'chatting'
  | 'fakeWorking'
  | 'phone'

/** 地图区域枚举 */
export type Zone = 'workstation' | 'breakroom' | 'restroom' | 'bossOffice' | 'corridor' | 'corridorBottom'

/** 老板状态 */
export type BossState = 'resting' | 'patrolling' | 'leaving'

/** 行为配置 */
export interface ActionConfig {
  id: PlayerAction
  label: string
  emoji: string
  slackingPerSec: number
  salaryPerSec: number
  riskLevel: 'none' | 'veryLow' | 'low' | 'medium' | 'high' | 'veryHigh'
  availableIn: Zone[]
}

/** 区域配置 */
export interface ZoneConfig {
  id: Zone
  label: string
  color: number
  borderColor: number
  x: number
  y: number
  width: number
  height: number
  playerSpawn: { x: number; y: number }
  safeZone: boolean
  playerCanEnter: boolean
}

/** 老板路线点 */
export interface PatrolWaypoint {
  x: number
  y: number
  zone: Zone
  waitTime?: number
}

/** 关卡配置 */
export interface LevelConfig {
  initialSalary: number
  targetSlacking: number
  actionCooldown: number
  caughtStunTime: number
  bossPatrolCooldownMin: number
  bossPatrolCooldownMax: number
  bossVisionAngle: number
  bossVisionDistance: number
  bossVisionAlertTime: number
  bossFirstDelay: number
  mapWidth: number
  mapHeight: number
  caughtPenalty: Record<string, number>
  bossTaunts: string[]
  actions: ActionConfig[]
  zones: ZoneConfig[]
  patrolRoute: PatrolWaypoint[]
}

/** 游戏阶段 */
export type GamePhase = 'menu' | 'playing' | 'won' | 'lost'

/** 排行榜记录 */
export interface LeaderboardEntry {
  time: number
  salary: number
  slacking: number
  rank: string
  date: string
}

/** 段位配置 */
export interface RankConfig {
  name: string
  minSlacking: number
  minSalary: number
}

/** 被抓事件 */
export interface CaughtEvent {
  penalty: number
  taunt: string
  timestamp: number
}

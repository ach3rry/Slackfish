export type AreaId = 'workstation' | 'pantry' | 'restroom' | 'bossOffice' | 'corridor'

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

export type BossStatus = 'resting' | 'warning' | 'patrolling'

export type BossBehavior = 'resting' | 'warning' | 'opening' | 'patrolling' | 'scanning' | 'checking' | 'returning' | 'fakeReturn' | 'hunting'

export type BossMood = 'calm' | 'suspicious' | 'angry' | 'furious'

export type RhythmPhase = 'calm' | 'patrol' | 'pressure' | 'buffer'

export type DisguiseLevel = 0 | 1 | 2 | 3

export type GamePhase = 'start' | 'playing' | 'won' | 'lost'

export type RiskLevel = 'none' | 'zero' | 'veryLow' | 'low' | 'medium' | 'high' | 'extreme'

export type Point = { x: number; y: number }

export type Rect = Point & { width: number; height: number }

export type AreaConfig = {
  id: AreaId
  name: string
  label: string
  rect: Rect
  center: Point
  fill: number
  stroke: number
  riskLabel: string
  safe?: boolean
  playerBlocked?: boolean
}

export type ActionConfig = {
  id: PlayerAction
  name: string
  icon: string
  area: AreaId
  fishPerSecond: number
  salaryPerSecond: number
  risk: RiskLevel
  disguise?: boolean
  description: string
}

export type LeaderboardEntry = {
  id: string
  finishedAt: string
  elapsedSeconds: number
  salary: number
  fish: number
  title: string
}

export type CatchNotice = {
  id: number
  amount: number
  title: string
  message: string
}

export type NpcPersonality = 'serious' | 'slacker' | 'social' | 'loner'

export type NpcState = 'working' | 'fishWorking' | 'chatting' | 'pantryRelax' | 'restroomBreak' | 'walking' | 'idle' | 'fakeWorking' | 'stunned'

export type NpcData = {
  id: number
  name: string
  personality: NpcPersonality
  state: NpcState
  x: number
  y: number
  targetX: number
  targetY: number
  areaId: AreaId
  tint: number
  decisionTimer: number
  stateTimer: number
  reactionSpeed: number
  fishTendency: number
  socialTendency: number
  stunnedUntil: number
}

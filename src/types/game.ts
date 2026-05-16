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

export type BossBehavior = 'resting' | 'warning' | 'opening' | 'patrolling' | 'scanning'

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

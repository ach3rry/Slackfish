import { AREAS, BOSS_SPAWN_AND_PATROL, PLAYER_SPAWN_AND_TARGETS } from './mobileLevelLayout'
import type { ActionConfig, AreaConfig, Point } from '../types/game'

type Waypoint = { id: string; x: number; y: number; areaId: string; faceDirection: string; waitMs: number; visionEnabled: boolean; action: string }

export const pickRandomRoute = (): Point[] => {
  const routes = BOSS_SPAWN_AND_PATROL.patrolRoutes
  const route = routes[Math.floor(Math.random() * routes.length)]!
  return route.map(({ x, y }) => ({ x, y }))
}

export const pickRandomRouteFull = (): Waypoint[] => {
  const routes = BOSS_SPAWN_AND_PATROL.patrolRoutes
  return [...routes[Math.floor(Math.random() * routes.length)]!]
}

export const LEVEL_AREAS: Record<string, AreaConfig> = {
  workstation: {
    id: 'workstation', name: '工位区', label: '工位区',
    rect: { x: AREAS.workstation.x, y: AREAS.workstation.y, width: AREAS.workstation.width, height: AREAS.workstation.height },
    center: AREAS.workstation.actionPoint,
    fill: 0x26384d, stroke: 0x39d98a, riskLabel: '低风险',
  },
  pantry: {
    id: 'pantry', name: '茶水间', label: '茶水间',
    rect: { x: AREAS.teaRoom.x, y: AREAS.teaRoom.y, width: AREAS.teaRoom.width, height: AREAS.teaRoom.height },
    center: AREAS.teaRoom.actionPoint,
    fill: 0x344b3e, stroke: 0xff9f43, riskLabel: '高收益 高风险',
  },
  restroom: {
    id: 'restroom', name: '卫生间', label: '卫生间',
    rect: { x: AREAS.restroom.x, y: AREAS.restroom.y, width: AREAS.restroom.width, height: AREAS.restroom.height },
    center: AREAS.restroom.actionPoint,
    fill: 0x1c4d59, stroke: 0x35e08b, riskLabel: '绝对安全', safe: true,
  },
  bossOffice: {
    id: 'bossOffice', name: '老板办公室', label: '老板办公室',
    rect: { x: AREAS.bossOffice.x, y: AREAS.bossOffice.y, width: AREAS.bossOffice.width, height: AREAS.bossOffice.height },
    center: AREAS.bossOffice.actionPoint,
    fill: 0x5b321f, stroke: 0xf2b76b, riskLabel: '老板专属', playerBlocked: true,
  },
  corridor: {
    id: 'corridor', name: '主走廊', label: '主走廊',
    rect: { x: AREAS.mainCorridor.x, y: AREAS.mainCorridor.y, width: AREAS.mainCorridor.width, height: AREAS.mainCorridor.height },
    center: AREAS.mainCorridor.actionPoint,
    fill: 0x3a3340, stroke: 0xff5f57, riskLabel: '离岗风险',
  },
}

export const LEVEL_ACTIONS: ActionConfig[] = [
  { id: 'working', name: '认真工作', icon: '💻', area: 'workstation', fishPerSecond: -1.5, salaryPerSecond: 2, risk: 'none', description: '摸鱼进度 -1.5/秒，工资 +2/秒' },
  { id: 'watching', name: '看视频', icon: '📺', area: 'workstation', fishPerSecond: 3, salaryPerSecond: 0, risk: 'low', description: '摸鱼收益 +3/秒' },
  { id: 'chips', name: '吃薯片', icon: '🍟', area: 'workstation', fishPerSecond: 2, salaryPerSecond: 0, risk: 'veryLow', description: '摸鱼收益 +2/秒' },
  { id: 'milkTea', name: '喝奶茶', icon: '🧋', area: 'pantry', fishPerSecond: 8, salaryPerSecond: 0, risk: 'extreme', description: '摸鱼收益 +8/秒' },
  { id: 'chatting', name: '闲聊摸鱼', icon: '💬', area: 'pantry', fishPerSecond: 7, salaryPerSecond: 0, risk: 'extreme', description: '摸鱼收益 +7/秒' },
  { id: 'fakeWorking', name: '假装工作', icon: '👩‍💻', area: 'pantry', fishPerSecond: -1, salaryPerSecond: 0, risk: 'medium', disguise: true, description: '摸鱼进度 -1/秒，伪装中降低暴露' },
  { id: 'phone', name: '玩手机', icon: '📱', area: 'restroom', fishPerSecond: 5, salaryPerSecond: 0, risk: 'zero', description: '摸鱼收益 +5/秒，绝对安全' },
]

export const PLAYER_SPAWN: Point = PLAYER_SPAWN_AND_TARGETS.initialSpawn
export const BOSS_SPAWN: Point = BOSS_SPAWN_AND_PATROL.bossSpawn

export const BOSS_ROUTE: Point[] = BOSS_SPAWN_AND_PATROL.patrolRoutes[0]!.map(({ x, y }) => ({ x, y }))

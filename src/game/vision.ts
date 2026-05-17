import type { Point } from '../types/game'

// ── 基础视野锥检测 ──

export type VisionInput = {
  viewer: Point
  target: Point
  facingRadians: number
  distance: number
  angleDegrees: number
}

const normalizeRadians = (angle: number) => {
  const circle = Math.PI * 2
  return ((angle % circle) + circle) % circle
}

const shortestAngleDistance = (a: number, b: number) => {
  const diff = Math.abs(normalizeRadians(a) - normalizeRadians(b))
  return Math.min(diff, Math.PI * 2 - diff)
}

export const isPointInVisionCone = ({
  viewer, target, facingRadians, distance, angleDegrees,
}: VisionInput) => {
  const dx = target.x - viewer.x
  const dy = target.y - viewer.y
  const squaredDistance = dx * dx + dy * dy
  if (squaredDistance > distance * distance) return false
  const angleToTarget = Math.atan2(dy, dx)
  const halfAngle = (angleDegrees * Math.PI) / 360
  return shortestAngleDistance(facingRadians, angleToTarget) <= halfAngle
}

// ── 墙壁遮挡系统 ──

export type WallSegment = { x1: number; y1: number; x2: number; y2: number }

export const WALL_SEGMENTS: WallSegment[] = [
  // x=467 墙 (工位右墙，门洞 y=320..360, y=560..600)
  { x1: 467, y1: 0, x2: 467, y2: 320 },
  { x1: 467, y1: 360, x2: 467, y2: 560 },
  { x1: 467, y1: 600, x2: 467, y2: 1300 },
  // x=608 墙 (右侧房间左墙，门洞 y=212..252, y=615..655, y=880..920)
  { x1: 608, y1: 0, x2: 608, y2: 212 },
  { x1: 608, y1: 252, x2: 608, y2: 615 },
  { x1: 608, y1: 655, x2: 608, y2: 880 },
  { x1: 608, y1: 920, x2: 608, y2: 1300 },
  // y=475 水平墙 (茶水间/卫生间分隔)
  { x1: 608, y1: 475, x2: 1080, y2: 475 },
  // y=812 水平墙 (卫生间/老板办分隔)
  { x1: 608, y1: 812, x2: 1080, y2: 812 },
]

function rayHitsSegment(
  ox: number, oy: number, dx: number, dy: number,
  seg: WallSegment,
): number | null {
  const sx = seg.x2 - seg.x1
  const sy = seg.y2 - seg.y1
  const denom = dx * sy - dy * sx
  if (Math.abs(denom) < 1e-10) return null
  const t = ((seg.x1 - ox) * sy - (seg.y1 - oy) * sx) / denom
  const u = ((seg.x1 - ox) * dy - (seg.y1 - oy) * dx) / denom
  if (t >= 0.001 && u >= 0 && u <= 1) return t
  return null
}

export function hasLineOfSight(from: Point, to: Point, walls: WallSegment[]): boolean {
  const dx = to.x - from.x
  const dy = to.y - from.y
  for (const seg of walls) {
    const t = rayHitsSegment(from.x, from.y, dx, dy, seg)
    if (t !== null && t < 0.999) return false
  }
  return true
}

// ── 距离衰减 ──

export type DistanceZone = { maxDistance: number; rate: number }

export function getDistanceFalloff(distance: number, zones: DistanceZone[]): number {
  for (const zone of zones) {
    if (distance <= zone.maxDistance) return zone.rate
  }
  return 0
}

// ── 统一视觉检测 ──

export type VisionCheckResult = {
  inCone: boolean
  blocked: boolean
  distance: number
  exposureRate: number
}

export function checkVision(
  viewer: Point, target: Point, facingRadians: number,
  visionDistance: number, visionAngleDeg: number,
  falloffZones: DistanceZone[],
  walls: WallSegment[],
): VisionCheckResult {
  const dx = target.x - viewer.x
  const dy = target.y - viewer.y
  const distance = Math.hypot(dx, dy)

  const inCone = isPointInVisionCone({
    viewer, target, facingRadians, distance: visionDistance, angleDegrees: visionAngleDeg,
  })

  if (!inCone) {
    return { inCone: false, blocked: false, distance, exposureRate: 0 }
  }

  const blocked = !hasLineOfSight(viewer, target, walls)
  const exposureRate = blocked ? 0 : getDistanceFalloff(distance, falloffZones)

  return { inCone: true, blocked, distance, exposureRate }
}

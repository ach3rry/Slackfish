import type { Point } from '../types/game'

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
  viewer,
  target,
  facingRadians,
  distance,
  angleDegrees,
}: VisionInput) => {
  const dx = target.x - viewer.x
  const dy = target.y - viewer.y
  const squaredDistance = dx * dx + dy * dy

  if (squaredDistance > distance * distance) {
    return false
  }

  const angleToTarget = Math.atan2(dy, dx)
  const halfAngle = (angleDegrees * Math.PI) / 360

  return shortestAngleDistance(facingRadians, angleToTarget) <= halfAngle
}

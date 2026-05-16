import type { Zone } from '../types/game'

/** 计算两点之间角度（弧度） */
export function angleBetween(fromX: number, fromY: number, toX: number, toY: number): number {
  return Math.atan2(toY - fromY, toX - fromX)
}

/** 计算两点之间的距离 */
export function distanceBetween(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

/** 标准化角度到 [-PI, PI] 范围 */
function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI
  while (angle < -Math.PI) angle += 2 * Math.PI
  return angle
}

/**
 * 判断目标是否在扇形视野内
 * @param bossX 老板位置 X
 * @param bossY 老板位置 Y
 * @param bossAngle 老板面朝方向（弧度）
 * @param targetX 目标位置 X
 * @param targetY 目标位置 Y
 * @param visionAngle 视野角度（度数，如 90）
 * @param visionDistance 视野距离（像素）
 */
export function isInVisionCone(
  bossX: number, bossY: number, bossAngle: number,
  targetX: number, targetY: number,
  visionAngle: number, visionDistance: number
): boolean {
  const dist = distanceBetween(bossX, bossY, targetX, targetY)
  if (dist > visionDistance) return false

  const angleToTarget = angleBetween(bossX, bossY, targetX, targetY)
  const halfAngle = (visionAngle / 2) * (Math.PI / 180)
  const diff = normalizeAngle(angleToTarget - bossAngle)

  return Math.abs(diff) <= halfAngle
}

/** 判断玩家是否应该被抓 */
export function shouldPlayerBeCaught(
  bossX: number, bossY: number, bossAngle: number,
  playerX: number, playerY: number,
  playerZone: Zone,
  isWorking: boolean,
  visionAngle: number,
  visionDistance: number
): boolean {
  // 卫生间内永远安全
  if (playerZone === 'restroom') return false
  // 正在工作不会被抓
  if (isWorking) return false
  // 在老板视野内且处于违规状态
  return isInVisionCone(bossX, bossY, bossAngle, playerX, playerY, visionAngle, visionDistance)
}

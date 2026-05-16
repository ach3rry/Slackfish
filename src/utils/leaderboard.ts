import { GAME_CONFIG, RANK_TITLES } from '../game/config'
import type { LeaderboardEntry } from '../types/game'

const storageKey = GAME_CONFIG.timing.leaderboardStorageKey

export const getRankTitle = (fish: number, salary: number) =>
  RANK_TITLES.find((rank) => fish >= rank.minFish && salary >= rank.minSalary)?.title ?? '摸鱼新手'

export const loadLeaderboard = (): LeaderboardEntry[] => {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as LeaderboardEntry[]
    return Array.isArray(parsed) ? parsed.slice(0, GAME_CONFIG.economy.maxLeaderboardEntries) : []
  } catch {
    return []
  }
}

export const saveLeaderboardEntry = (entry: LeaderboardEntry) => {
  const next = [entry, ...loadLeaderboard()].slice(0, GAME_CONFIG.economy.maxLeaderboardEntries)
  window.localStorage.setItem(storageKey, JSON.stringify(next))
  return next
}

import { GAME_CONFIG, RANK_TITLES } from '../game/config'
import type { LeaderboardEntry } from '../types/game'

const STORAGE_KEY = GAME_CONFIG.timing.leaderboardStorageKey

export const loadLeaderboard = (): LeaderboardEntry[] => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]') as LeaderboardEntry[]
  } catch { return [] }
}

export const saveLeaderboardEntry = (entry: LeaderboardEntry): LeaderboardEntry[] => {
  const board = loadLeaderboard()
  board.unshift(entry)
  if (board.length > GAME_CONFIG.economy.maxLeaderboardEntries) board.length = GAME_CONFIG.economy.maxLeaderboardEntries
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board))
  return board
}

export const getRankTitle = (fish: number, salary: number): string => {
  for (const rank of RANK_TITLES) {
    if (fish >= rank.minFish && salary >= rank.minSalary) return rank.title
  }
  return '摸鱼新手'
}

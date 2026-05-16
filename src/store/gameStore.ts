import { create } from 'zustand'
import type { PlayerAction, Zone, BossState, GamePhase, CaughtEvent, LeaderboardEntry } from '../types/game'
import { level1Config, ranks } from '../data/level1'

interface GameStore {
  // 游戏阶段
  phase: GamePhase
  setPhase: (phase: GamePhase) => void

  // 玩家数值
  salary: number
  slacking: number
  addSalary: (amount: number) => void
  addSlacking: (amount: number) => void
  deductSalary: (amount: number) => void

  // 玩家状态
  playerAction: PlayerAction
  setPlayerAction: (action: PlayerAction) => void
  playerZone: Zone
  setPlayerZone: (zone: Zone) => void
  playerStunned: boolean
  setPlayerStunned: (stunned: boolean) => void

  // 冷却
  lastActionTime: number
  setLastActionTime: (time: number) => void
  canAct: () => boolean

  // 老板状态
  bossState: BossState
  setBossState: (state: BossState) => void
  bossAlert: number
  setBossAlert: (alert: number) => void

  // 被抓事件
  caughtEvent: CaughtEvent | null
  setCaughtEvent: (event: CaughtEvent | null) => void

  // 计时
  startTime: number
  elapsedTime: number
  setElapsedTime: (time: number) => void
  startGame: () => void

  // 老板出门警告
  bossLeaving: boolean
  setBossLeaving: (leaving: boolean) => void

  // 结算
  getRank: () => string
  getLeaderboard: () => LeaderboardEntry[]
  saveToLeaderboard: () => void

  // 重置
  resetGame: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'menu',
  setPhase: (phase) => set({ phase }),

  salary: level1Config.initialSalary,
  slacking: 0,

  addSalary: (amount) => set((s) => ({ salary: s.salary + amount })),
  addSlacking: (amount) => set((s) => ({ slacking: s.slacking + amount })),
  deductSalary: (amount) => set((s) => {
    const newSalary = Math.max(0, s.salary - amount)
    return { salary: newSalary }
  }),

  playerAction: 'idle',
  setPlayerAction: (action) => set({ playerAction: action }),
  playerZone: 'workstation',
  setPlayerZone: (zone) => set({ playerZone: zone }),
  playerStunned: false,
  setPlayerStunned: (stunned) => set({ playerStunned: stunned }),

  lastActionTime: 0,
  setLastActionTime: (time) => set({ lastActionTime: time }),
  canAct: () => {
    const state = get()
    if (state.playerStunned) return false
    return Date.now() - state.lastActionTime >= level1Config.actionCooldown * 1000
  },

  bossState: 'resting',
  setBossState: (state) => set({ bossState: state }),
  bossAlert: 0,
  setBossAlert: (alert) => set({ bossAlert: alert }),

  caughtEvent: null,
  setCaughtEvent: (event) => set({ caughtEvent: event }),

  startTime: 0,
  elapsedTime: 0,
  setElapsedTime: (time) => set({ elapsedTime: time }),
  startGame: () => set({
    phase: 'playing',
    salary: level1Config.initialSalary,
    slacking: 0,
    playerAction: 'idle',
    playerZone: 'workstation',
    playerStunned: false,
    bossState: 'resting',
    bossAlert: 0,
    caughtEvent: null,
    startTime: Date.now(),
    elapsedTime: 0,
    lastActionTime: 0,
    bossLeaving: false,
  }),

  bossLeaving: false,
  setBossLeaving: (leaving) => set({ bossLeaving: leaving }),

  getRank: () => {
    const { slacking, salary } = get()
    for (const rank of ranks) {
      if (slacking >= rank.minSlacking && salary >= rank.minSalary) {
        return rank.name
      }
    }
    return '摸鱼新手'
  },

  getLeaderboard: () => {
    try {
      const data = localStorage.getItem('slackfish_leaderboard')
      return data ? JSON.parse(data) as LeaderboardEntry[] : []
    } catch {
      return []
    }
  },

  saveToLeaderboard: () => {
    const state = get()
    const entry: LeaderboardEntry = {
      time: state.elapsedTime,
      salary: state.salary,
      slacking: state.slacking,
      rank: state.getRank(),
      date: new Date().toLocaleDateString('zh-CN'),
    }
    const board = state.getLeaderboard()
    board.unshift(entry)
    if (board.length > 10) board.length = 10
    localStorage.setItem('slackfish_leaderboard', JSON.stringify(board))
  },

  resetGame: () => set({
    phase: 'menu',
    salary: level1Config.initialSalary,
    slacking: 0,
    playerAction: 'idle',
    playerZone: 'workstation',
    playerStunned: false,
    bossState: 'resting',
    bossAlert: 0,
    caughtEvent: null,
    startTime: 0,
    elapsedTime: 0,
    lastActionTime: 0,
    bossLeaving: false,
  }),
}))

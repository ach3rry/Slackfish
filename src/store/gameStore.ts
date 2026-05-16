import { create } from 'zustand'
import { BOSS_TRASH_TALK, GAME_CONFIG } from '../game/config'
import { LEVEL_ACTIONS } from '../data/level1'
import { getRankTitle, loadLeaderboard, saveLeaderboardEntry } from '../utils/leaderboard'
import type { AreaId, BossStatus, CatchNotice, GamePhase, LeaderboardEntry, PlayerAction } from '../types/game'

type FlashTone = 'gain' | 'loss' | null

type GameState = {
  phase: GamePhase
  salary: number
  fish: number
  elapsedSeconds: number
  currentArea: AreaId
  currentAction: PlayerAction
  bossStatus: BossStatus
  threatText: string
  cooldownUntil: number
  stunnedUntil: number
  catchNotice: CatchNotice | null
  salaryFlash: FlashTone
  guideOpen: boolean
  leaderboard: LeaderboardEntry[]
  finalTitle: string
  startGame: () => void
  restartGame: () => void
  setArea: (area: AreaId) => void
  setAction: (action: PlayerAction, force?: boolean) => boolean
  setBossStatus: (status: BossStatus) => void
  setThreatText: (text: string) => void
  setStunnedUntil: (timestamp: number) => void
  tickEconomy: (deltaSeconds: number) => { fishGain: number; salaryGain: number }
  applyCatch: (amount: number, title: string) => void
  clearCatchNotice: () => void
  setGuideOpen: (open: boolean) => void
  markGuideSeen: () => void
  refreshLeaderboard: () => void
}

const now = () => performance.now()
const hasSeenGuide = () => window.localStorage.getItem(GAME_CONFIG.timing.guideStorageKey) === '1'
const randomTrashTalk = () => BOSS_TRASH_TALK[Math.floor(Math.random() * BOSS_TRASH_TALK.length)] ?? BOSS_TRASH_TALK[0]

const initialState = () => ({
  phase: 'start' as GamePhase, salary: GAME_CONFIG.economy.initialSalary, fish: 0,
  elapsedSeconds: 0, currentArea: 'workstation' as AreaId, currentAction: 'idle' as PlayerAction,
  bossStatus: 'resting' as BossStatus, threatText: '老板休息中', cooldownUntil: 0, stunnedUntil: 0,
  catchNotice: null, salaryFlash: null as FlashTone, guideOpen: !hasSeenGuide(),
  leaderboard: loadLeaderboard(), finalTitle: '',
})

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState(),
  startGame: () => set({ ...initialState(), phase: 'playing', guideOpen: !hasSeenGuide() }),
  restartGame: () => set({ ...initialState(), phase: 'playing', guideOpen: false }),
  setArea: (area) => set({ currentArea: area }),
  setAction: (action, force = false) => {
    const state = get()
    const timestamp = now()
    if (!force) {
      if (state.phase !== 'playing') return false
      if (timestamp < state.cooldownUntil || timestamp < state.stunnedUntil) return false
      if (state.currentAction === 'moving') return false
    }
    set({ currentAction: action, cooldownUntil: force || action === 'moving' ? state.cooldownUntil : timestamp + GAME_CONFIG.timing.actionCooldownMs })
    return true
  },
  setBossStatus: (status) => set({ bossStatus: status, threatText: status === 'resting' ? '休息中' : status === 'warning' ? '即将出门' : '巡查中' }),
  setThreatText: (text) => set({ threatText: text }),
  setStunnedUntil: (timestamp) => set({ stunnedUntil: timestamp }),
  tickEconomy: (deltaSeconds) => {
    const state = get()
    if (state.phase !== 'playing') return { fishGain: 0, salaryGain: 0 }
    if (state.currentAction === 'moving' || now() < state.stunnedUntil) {
      set((c) => ({ elapsedSeconds: c.elapsedSeconds + deltaSeconds }))
      return { fishGain: 0, salaryGain: 0 }
    }
    const action = LEVEL_ACTIONS.find((item) => item.id === state.currentAction)
    if (!action) { set((c) => ({ elapsedSeconds: c.elapsedSeconds + deltaSeconds })); return { fishGain: 0, salaryGain: 0 } }
    const fishGain = action.fishPerSecond * deltaSeconds
    const salaryGain = action.salaryPerSecond * deltaSeconds
    set((current) => {
      const nextFish = Math.min(GAME_CONFIG.economy.targetFish, current.fish + fishGain)
      const nextSalary = Math.max(0, current.salary + salaryGain)
      const elapsedSeconds = current.elapsedSeconds + deltaSeconds
      if (nextSalary <= 0) return { salary: 0, fish: nextFish, elapsedSeconds, phase: 'lost', salaryFlash: 'loss', threatText: '工资清零' }
      if (nextFish >= GAME_CONFIG.economy.targetFish && nextSalary > 0) {
        const title = getRankTitle(nextFish, nextSalary)
        const entry: LeaderboardEntry = { id: `${Date.now()}`, finishedAt: new Date().toISOString(), elapsedSeconds, salary: Math.round(nextSalary), fish: Math.round(nextFish), title }
        return { salary: nextSalary, fish: nextFish, elapsedSeconds, phase: 'won', finalTitle: title, salaryFlash: salaryGain > 0 ? 'gain' : current.salaryFlash, leaderboard: saveLeaderboardEntry(entry) }
      }
      return { salary: nextSalary, fish: nextFish, elapsedSeconds, salaryFlash: salaryGain > 0 ? 'gain' : current.salaryFlash }
    })
    if (salaryGain > 0) window.setTimeout(() => set({ salaryFlash: null }), 260)
    return { fishGain, salaryGain }
  },
  applyCatch: (amount, title) => {
    const timestamp = now()
    const message = randomTrashTalk()
    set((state) => {
      const nextSalary = Math.max(0, state.salary - amount)
      return { salary: nextSalary, phase: nextSalary <= 0 ? 'lost' : state.phase, stunnedUntil: timestamp + GAME_CONFIG.timing.catchStunMs, currentAction: 'idle', catchNotice: { id: Date.now(), amount, title, message }, salaryFlash: 'loss', threatText: nextSalary <= 0 ? '工资清零' : '被老板抓包' }
    })
    window.setTimeout(() => set({ salaryFlash: null }), 280)
    window.setTimeout(() => get().clearCatchNotice(), GAME_CONFIG.timing.catchNoticeMs)
  },
  clearCatchNotice: () => set({ catchNotice: null }),
  setGuideOpen: (open) => set({ guideOpen: open }),
  markGuideSeen: () => { window.localStorage.setItem(GAME_CONFIG.timing.guideStorageKey, '1'); set({ guideOpen: false }) },
  refreshLeaderboard: () => set({ leaderboard: loadLeaderboard() }),
}))

import { create } from 'zustand'
import { BOSS_TRASH_TALK, GAME_CONFIG } from '../game/config'
import { LEVEL_ACTIONS } from '../data/level1'
import { getRankTitle, loadLeaderboard, saveLeaderboardEntry } from '../utils/leaderboard'
import type { AreaId, BossBehavior, BossMood, DisguiseLevel, GamePhase, LeaderboardEntry, NpcData, PlayerAction, RhythmPhase, BossStatus, CatchNotice } from '../types/game'

type FlashTone = 'gain' | 'loss' | null

type GameState = {
  phase: GamePhase
  salary: number
  fish: number
  elapsedSeconds: number
  currentArea: AreaId
  currentAction: PlayerAction
  bossStatus: BossStatus
  bossBehavior: BossBehavior
  bossMood: BossMood
  threatText: string
  cooldownUntil: number
  stunnedUntil: number
  catchNotice: CatchNotice | null
  salaryFlash: FlashTone
  guideOpen: boolean
  leaderboard: LeaderboardEntry[]
  finalTitle: string
  fakeWorkStartMs: number
  fakeWorkCooldownUntil: number
  restroomEntries: number
  restroomEntryStartMs: number
  restroomPhoneTotalMs: number
  restroomLastWarningMs: number
  suspicion: number
  rhythmPhase: RhythmPhase
  rhythmTimer: number
  disguiseLevel: DisguiseLevel
  npcs: NpcData[]
  startGame: () => void
  restartGame: () => void
  setArea: (area: AreaId) => void
  setAction: (action: PlayerAction, force?: boolean) => boolean
  setBossStatus: (status: BossStatus) => void
  setBossBehavior: (behavior: BossBehavior) => void
  setThreatText: (text: string) => void
  setStunnedUntil: (timestamp: number) => void
  tickEconomy: (deltaSeconds: number) => { fishGain: number; salaryGain: number }
  applyCatch: (amount: number, title: string) => void
  clearCatchNotice: () => void
  setGuideOpen: (open: boolean) => void
  markGuideSeen: () => void
  refreshLeaderboard: () => void
  setSuspicion: (value: number) => void
  addSuspicion: (delta: number) => void
  setRhythmPhase: (phase: RhythmPhase) => void
  setRhythmTimer: (timer: number) => void
  updateDisguiseLevel: () => void
  setNpcs: (npcs: NpcData[]) => void
  updateNpc: (id: number, partial: Partial<NpcData>) => void
}

const now = () => performance.now()
const hasSeenGuide = () => window.localStorage.getItem(GAME_CONFIG.timing.guideStorageKey) === '1'
const randomTrashTalk = () => BOSS_TRASH_TALK[Math.floor(Math.random() * BOSS_TRASH_TALK.length)] ?? BOSS_TRASH_TALK[0]

const getMood = (suspicion: number): BossMood => {
  const t = GAME_CONFIG.suspicion.moodThresholds
  if (suspicion >= t.furious) return 'furious'
  if (suspicion >= t.angry) return 'angry'
  if (suspicion >= t.suspicious) return 'suspicious'
  return 'calm'
}

const getDisguise = (fish: number): DisguiseLevel => {
  const levels = GAME_CONFIG.disguise.levels
  let lv: DisguiseLevel = 0
  for (const l of levels) { if (fish >= l.requiredFish) lv = l.level as DisguiseLevel }
  return lv
}

const initialState = () => ({
  phase: 'start' as GamePhase, salary: GAME_CONFIG.economy.initialSalary, fish: 0,
  elapsedSeconds: 0, currentArea: 'workstation' as AreaId, currentAction: 'idle' as PlayerAction,
  bossStatus: 'resting' as BossStatus, bossBehavior: 'resting' as BossBehavior,
  bossMood: 'calm' as BossMood,
  threatText: '老板休息中', cooldownUntil: 0, stunnedUntil: 0,
  catchNotice: null, salaryFlash: null as FlashTone, guideOpen: !hasSeenGuide(),
  leaderboard: loadLeaderboard(), finalTitle: '',
  fakeWorkStartMs: 0, fakeWorkCooldownUntil: 0,
  restroomEntries: 0, restroomEntryStartMs: 0, restroomPhoneTotalMs: 0, restroomLastWarningMs: 0,
  suspicion: 0, rhythmPhase: 'calm' as RhythmPhase, rhythmTimer: 0,
  disguiseLevel: 0 as DisguiseLevel, npcs: [] as NpcData[],
})

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState(),
  startGame: () => set({ ...initialState(), phase: 'playing', guideOpen: !hasSeenGuide() }),
  restartGame: () => set({ ...initialState(), phase: 'playing', guideOpen: false }),
  setArea: (area) => {
    const prev = get().currentArea
    if (area === 'restroom' && prev !== 'restroom') {
      const state = get()
      if (state.restroomEntries >= GAME_CONFIG.limits.restroomMaxEntries) return
      set({ currentArea: area, restroomEntryStartMs: now(), restroomLastWarningMs: 0 })
      return
    }
    if (prev === 'restroom' && area !== 'restroom') {
      set({ currentArea: area, restroomEntryStartMs: 0 })
      return
    }
    set({ currentArea: area })
  },
  setAction: (action, force = false) => {
    const state = get()
    const timestamp = now()
    if (!force) {
      if (state.phase !== 'playing') return false
      if (timestamp < state.cooldownUntil || timestamp < state.stunnedUntil) return false
      if (state.currentAction === 'moving') return false
      if (action === 'fakeWorking' && timestamp < state.fakeWorkCooldownUntil) return false
    }
    const updates: Partial<GameState> = {
      currentAction: action,
      cooldownUntil: force || action === 'moving' ? state.cooldownUntil : timestamp + GAME_CONFIG.timing.actionCooldownMs,
    }
    if (action === 'fakeWorking') updates.fakeWorkStartMs = timestamp
    if (action === 'idle' && state.currentAction === 'fakeWorking') {
      updates.fakeWorkCooldownUntil = timestamp + GAME_CONFIG.limits.fakeWorkCooldownMs
    }
    set(updates)
    return true
  },
  setBossStatus: (status) => set({ bossStatus: status, threatText: status === 'resting' ? '休息中' : status === 'warning' ? '即将出门' : '巡查中' }),
  setBossBehavior: (behavior) => set({ bossBehavior: behavior }),
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
    const phoneExtra = state.currentAction === 'phone' ? { restroomPhoneTotalMs: state.restroomPhoneTotalMs + deltaSeconds * 1000 } : {}
    const entryExtra = (state.currentArea === 'restroom' && state.restroomEntryStartMs > 0 && state.restroomEntries === 0)
      ? { restroomEntries: 1, restroomEntryStartMs: now() }
      : {}
    set((current) => {
      const nextFish = Math.min(GAME_CONFIG.economy.targetFish, current.fish + fishGain)
      const nextSalary = Math.max(0, current.salary + salaryGain)
      const elapsedSeconds = current.elapsedSeconds + deltaSeconds
      const newDisguise = getDisguise(nextFish)
      if (nextSalary <= 0) return { salary: 0, fish: nextFish, elapsedSeconds, phase: 'lost', salaryFlash: 'loss', threatText: '工资清零' }
      if (nextFish >= GAME_CONFIG.economy.targetFish && nextSalary > 0) {
        const title = getRankTitle(nextFish, nextSalary)
        const entry: LeaderboardEntry = { id: `${Date.now()}`, finishedAt: new Date().toISOString(), elapsedSeconds, salary: Math.round(nextSalary), fish: Math.round(nextFish), title }
        return { salary: nextSalary, fish: nextFish, elapsedSeconds, phase: 'won', finalTitle: title, salaryFlash: salaryGain > 0 ? 'gain' : current.salaryFlash, leaderboard: saveLeaderboardEntry(entry) }
      }
      return { salary: nextSalary, fish: nextFish, elapsedSeconds, salaryFlash: salaryGain > 0 ? 'gain' : current.salaryFlash, disguiseLevel: newDisguise, ...phoneExtra, ...entryExtra }
    })
    if (salaryGain > 0) window.setTimeout(() => set({ salaryFlash: null }), 260)
    return { fishGain, salaryGain }
  },
  applyCatch: (amount, title) => {
    const timestamp = now()
    const message = randomTrashTalk()
    set((state) => {
      const nextSalary = Math.max(0, state.salary - amount)
      const fwCooldown = state.currentAction === 'fakeWorking' ? { fakeWorkCooldownUntil: timestamp + GAME_CONFIG.limits.fakeWorkCooldownMs } : {}
      return {
        salary: nextSalary, phase: nextSalary <= 0 ? 'lost' : state.phase,
        stunnedUntil: timestamp + GAME_CONFIG.timing.catchStunMs,
        currentAction: 'idle' as PlayerAction,
        catchNotice: { id: Date.now(), amount, title, message },
        salaryFlash: 'loss' as FlashTone, threatText: nextSalary <= 0 ? '工资清零' : '被老板抓包',
        ...fwCooldown,
      }
    })
    window.setTimeout(() => set({ salaryFlash: null }), 280)
    window.setTimeout(() => get().clearCatchNotice(), GAME_CONFIG.timing.catchNoticeMs)
  },
  clearCatchNotice: () => set({ catchNotice: null }),
  setGuideOpen: (open) => set({ guideOpen: open }),
  markGuideSeen: () => { window.localStorage.setItem(GAME_CONFIG.timing.guideStorageKey, '1'); set({ guideOpen: false }) },
  refreshLeaderboard: () => set({ leaderboard: loadLeaderboard() }),
  setSuspicion: (value) => set({ suspicion: Math.max(0, Math.min(GAME_CONFIG.suspicion.max, value)), bossMood: getMood(Math.max(0, Math.min(GAME_CONFIG.suspicion.max, value))) }),
  addSuspicion: (delta) => {
    const next = Math.max(0, Math.min(GAME_CONFIG.suspicion.max, get().suspicion + delta))
    set({ suspicion: next, bossMood: getMood(next) })
  },
  setRhythmPhase: (phase) => set({ rhythmPhase: phase }),
  setRhythmTimer: (timer) => set({ rhythmTimer: timer }),
  updateDisguiseLevel: () => set({ disguiseLevel: getDisguise(get().fish) }),
  setNpcs: (npcs) => set({ npcs }),
  updateNpc: (id, partial) => set((s) => ({ npcs: s.npcs.map(n => n.id === id ? { ...n, ...partial } : n) })),
}))

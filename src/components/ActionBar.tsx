import { useEffect, useMemo, useState } from 'react'
import { LEVEL_ACTIONS, LEVEL_AREAS } from '../data/level1'
import { gameBus } from '../game/gameBus'
import { useGameStore } from '../store/gameStore'
import type { AreaId } from '../types/game'

const travelAreas: AreaId[] = ['workstation', 'pantry', 'restroom']
const riskColor: Record<string, string> = { none: 'text-emerald-300', zero: 'text-emerald-300', veryLow: 'text-sky-300', low: 'text-cyan-300', medium: 'text-amber-300', high: 'text-orange-300', extreme: 'text-rose-300' }

export function ActionBar() {
  const [clock, setClock] = useState(() => performance.now())
  const phase = useGameStore((s) => s.phase)
  const currentArea = useGameStore((s) => s.currentArea)
  const currentAction = useGameStore((s) => s.currentAction)
  const cooldownUntil = useGameStore((s) => s.cooldownUntil)
  const stunnedUntil = useGameStore((s) => s.stunnedUntil)

  useEffect(() => { const iv = setInterval(() => setClock(performance.now()), 100); return () => clearInterval(iv) }, [])

  const cooldownRemaining = Math.max(0, cooldownUntil - clock)
  const stunnedRemaining = Math.max(0, stunnedUntil - clock)
  const locked = phase !== 'playing' || cooldownRemaining > 0 || stunnedRemaining > 0 || currentAction === 'moving'

  const lockText = useMemo(() => {
    if (stunnedRemaining > 0) return `僵直 ${(stunnedRemaining / 1000).toFixed(1)}s`
    if (cooldownRemaining > 0) return `冷却 ${(cooldownRemaining / 1000).toFixed(1)}s`
    if (currentAction === 'moving') return '移动中'
    return '可行动'
  }, [cooldownRemaining, currentAction, stunnedRemaining])

  return (
    <footer className="absolute bottom-0 left-0 right-0 z-30 border-t border-cyan-200/10 bg-slate-950/95 px-3 py-2" style={{ backdropFilter: 'blur(8px)' }}>
      <div className="flex gap-3 max-lg:flex-col">
        <section className="w-[300px] max-lg:w-full">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold">区域移动</span>
            <span className="rounded border border-cyan-200/20 px-1.5 py-0.5 text-[10px] text-cyan-300">{lockText}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {travelAreas.map((area) => {
              const cfg = LEVEL_AREAS[area]; const active = currentArea === area
              return (
                <button key={area} disabled={locked} onClick={() => gameBus.moveToArea(area)} type="button"
                  className={`rounded-lg border px-2 py-1.5 text-xs font-bold transition-all ${active ? 'border-cyan-400/60 bg-cyan-950/50 text-cyan-100' : 'border-slate-600/40 bg-slate-800/60 text-slate-400'} ${locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}>
                  <span className="text-base">{area === 'workstation' ? '💻' : area === 'pantry' ? '🧋' : '🚻'}</span>
                  <span className="ml-1">{cfg.name}</span>
                </button>
              )
            })}
          </div>
        </section>
        <section className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold">行为切换</span>
            <span className="text-[10px] text-slate-500">{LEVEL_AREAS[currentArea].name}{currentArea === 'restroom' ? '｜安全' : ''}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 max-md:grid-cols-2">
            {LEVEL_ACTIONS.map((action) => {
              const avail = action.area === currentArea; const active = currentAction === action.id
              return (
                <button key={action.id} disabled={!avail || locked} onClick={() => gameBus.setAction(action.id)} title={action.description} type="button"
                  className={`rounded-lg border px-2 py-1.5 text-left transition-all ${active ? 'border-amber-400/60 bg-amber-950/40 text-amber-100' : avail ? 'border-slate-600/40 bg-slate-800/60 text-slate-300' : 'border-slate-700/30 bg-slate-900/40 text-slate-600'} ${!avail || locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}>
                  <div className="flex items-center gap-1"><span className="text-lg leading-none">{action.icon}</span><span className="text-xs font-bold truncate">{action.name}</span></div>
                  <span className={`text-[10px] ${riskColor[action.risk]}`}>{action.fishPerSecond > 0 ? `+${action.fishPerSecond}/秒` : `工资 +${action.salaryPerSecond}/秒`}</span>
                  {action.disguise && active ? <span className="ml-1 text-[9px] text-orange-300 animate-pulse">伪装中</span> : null}
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </footer>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { LEVEL_ACTIONS, LEVEL_AREAS } from '../data/level1'
import { gameBus } from '../game/gameBus'
import { useGameStore } from '../store/gameStore'
import type { AreaId } from '../types/game'

const travelAreas: AreaId[] = ['workstation', 'pantry', 'restroom']

const riskColor = {
  none: 'text-emerald-200',
  zero: 'text-emerald-200',
  veryLow: 'text-sky-200',
  low: 'text-cyan-200',
  medium: 'text-amber-200',
  high: 'text-orange-200',
  extreme: 'text-rose-200',
}

export function ActionBar() {
  const [clock, setClock] = useState(() => performance.now())
  const phase = useGameStore((state) => state.phase)
  const currentArea = useGameStore((state) => state.currentArea)
  const currentAction = useGameStore((state) => state.currentAction)
  const cooldownUntil = useGameStore((state) => state.cooldownUntil)
  const stunnedUntil = useGameStore((state) => state.stunnedUntil)

  useEffect(() => {
    const interval = window.setInterval(() => setClock(performance.now()), 100)
    return () => window.clearInterval(interval)
  }, [])

  const cooldownRemaining = Math.max(0, cooldownUntil - clock)
  const stunnedRemaining = Math.max(0, stunnedUntil - clock)
  const locked = phase !== 'playing' || cooldownRemaining > 0 || stunnedRemaining > 0 || currentAction === 'moving'

  const lockText = useMemo(() => {
    if (stunnedRemaining > 0) {
      return `僵直中 ${(stunnedRemaining / 1000).toFixed(1)}s`
    }
    if (cooldownRemaining > 0) {
      return `冷却中 ${(cooldownRemaining / 1000).toFixed(1)}s`
    }
    if (currentAction === 'moving') {
      return '移动中'
    }
    return '可行动'
  }, [cooldownRemaining, currentAction, stunnedRemaining])

  return (
    <footer className="absolute bottom-0 left-0 right-0 z-30 border-t border-cyan-200/20 bg-slate-950/92 px-4 py-3 shadow-[0_-18px_60px_rgba(0,0,0,0.48)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1180px] gap-4 max-lg:flex-col">
        <section className="w-[330px] max-lg:w-full">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="hud-title">区域移动</h2>
            <span className="rounded border border-cyan-200/30 px-2 py-1 text-xs text-cyan-100">{lockText}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {travelAreas.map((area) => {
              const config = LEVEL_AREAS[area]
              const active = currentArea === area
              return (
                <button
                  key={area}
                  className={`game-button ${active ? 'game-button-active' : ''}`}
                  disabled={locked}
                  onClick={() => gameBus.moveToArea(area)}
                  type="button"
                >
                  <span className="text-lg">{area === 'workstation' ? '💻' : area === 'pantry' ? '🧋' : '🚻'}</span>
                  <span>{config.name}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="hud-title">行为切换</h2>
            <span className="text-xs text-slate-400">
              当前区域：{LEVEL_AREAS[currentArea].name}
              {currentArea === 'restroom' ? '｜绝对安全' : ''}
            </span>
          </div>
          <div className="grid grid-cols-7 gap-2 max-xl:grid-cols-4 max-md:grid-cols-2">
            {LEVEL_ACTIONS.map((action) => {
              const available = action.area === currentArea
              const active = currentAction === action.id
              return (
                <button
                  key={action.id}
                  className={`action-button ${active ? 'action-button-active' : ''}`}
                  disabled={!available || locked}
                  onClick={() => gameBus.setAction(action.id)}
                  title={action.description}
                  type="button"
                >
                  <span className="text-2xl leading-none">{action.icon}</span>
                  <span className="truncate text-sm font-black">{action.name}</span>
                  <span className={`truncate text-[11px] ${riskColor[action.risk]}`}>
                    {action.fishPerSecond > 0 ? `+${action.fishPerSecond}/秒` : `工资 +${action.salaryPerSecond}/秒`}
                  </span>
                  {action.disguise ? <span className="disguise-tag">伪装中</span> : null}
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </footer>
  )
}

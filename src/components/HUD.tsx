import { GAME_CONFIG } from '../game/config'
import { useGameStore } from '../store/gameStore'

const bossStatusLabel = { resting: '休息中', warning: '即将出门', patrolling: '巡查中' }

export function HUD() {
  const salary = useGameStore((s) => s.salary)
  const fish = useGameStore((s) => s.fish)
  const bossStatus = useGameStore((s) => s.bossStatus)
  const threatText = useGameStore((s) => s.threatText)
  const salaryFlash = useGameStore((s) => s.salaryFlash)
  const progress = Math.min(100, (fish / GAME_CONFIG.economy.targetFish) * 100)

  return (
    <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 grid grid-cols-[180px_1fr_200px] gap-2 p-2 max-lg:grid-cols-1">
      <section className={`rounded-lg border px-3 py-2 flex items-center justify-between ${salaryFlash === 'loss' ? 'border-red-400/60 bg-red-950/50' : salaryFlash === 'gain' ? 'border-green-400/60 bg-green-950/50' : 'border-slate-600/50 bg-slate-900/80'}`} style={{ backdropFilter: 'blur(6px)' }}>
        <span className="text-xs text-slate-400">工资</span>
        <strong className="text-xl text-amber-200">🪙 {Math.round(salary)}</strong>
      </section>
      <section className="rounded-lg border border-slate-600/50 bg-slate-900/80 px-4 py-2" style={{ backdropFilter: 'blur(6px)' }}>
        <div className="mb-1 flex justify-between text-xs text-slate-400">
          <span>摸鱼收益</span>
          <strong className="text-amber-100">{Math.floor(fish)} / {GAME_CONFIG.economy.targetFish}</strong>
        </div>
        <div className="h-3 rounded-full border border-amber-200/30 bg-slate-950 overflow-hidden">
          <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #67e8f9, #fbbf24, #f97316)' }} />
        </div>
      </section>
      <section className="rounded-lg border border-slate-600/50 bg-slate-900/80 px-3 py-2 flex items-center justify-between" style={{ backdropFilter: 'blur(6px)' }}>
        <div>
          <p className="text-[10px] text-slate-500">老板</p>
          <strong className="text-sm text-rose-200">👔 {bossStatusLabel[bossStatus]}</strong>
        </div>
        <div className="rounded border border-rose-300/30 bg-rose-950/60 px-2 py-1 text-xs text-rose-200">{threatText}</div>
      </section>
    </header>
  )
}

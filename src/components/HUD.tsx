import { GAME_CONFIG } from '../game/config'
import { useGameStore } from '../store/gameStore'

const bossStatusLabel = {
  resting: '休息中',
  warning: '即将出门',
  patrolling: '巡查中',
}

export function HUD() {
  const salary = useGameStore((state) => state.salary)
  const fish = useGameStore((state) => state.fish)
  const bossStatus = useGameStore((state) => state.bossStatus)
  const threatText = useGameStore((state) => state.threatText)
  const salaryFlash = useGameStore((state) => state.salaryFlash)

  const progress = Math.min(100, (fish / GAME_CONFIG.economy.targetFish) * 100)

  return (
    <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 grid grid-cols-[220px_1fr_260px] gap-3 p-4 max-lg:grid-cols-1">
      <section
        className={`game-panel flex items-center justify-between px-4 py-3 ${
          salaryFlash === 'loss' ? 'salary-loss' : salaryFlash === 'gain' ? 'salary-gain' : ''
        }`}
      >
        <span className="text-sm text-slate-300">工资</span>
        <strong className="text-3xl text-amber-200">🪙 {Math.round(salary)}</strong>
      </section>

      <section className="game-panel px-5 py-3">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
          <span>第 1 关｜摸鱼收益</span>
          <strong className="text-amber-100">
            {Math.floor(fish)} / {GAME_CONFIG.economy.targetFish}
          </strong>
        </div>
        <div className="h-4 overflow-hidden rounded-full border border-amber-200/50 bg-slate-950">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-amber-200 to-orange-400 transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <section className="game-panel flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs text-slate-400">老板状态</p>
          <strong className="text-xl text-rose-100">👔 {bossStatusLabel[bossStatus]}</strong>
        </div>
        <div className="rounded-md border border-rose-300/40 bg-rose-950/70 px-3 py-2 text-sm text-rose-100">
          {threatText}
        </div>
      </section>
    </header>
  )
}

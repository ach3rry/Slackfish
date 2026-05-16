import { GAME_CONFIG } from '../game/config'
import { useGameStore } from '../store/gameStore'
import { LAYERS } from '../data/mobileLevelLayout'

const bossStatusLabel = { resting: '休息中', warning: '警戒中', patrolling: '巡逻中' }

const panelBase: React.CSSProperties = {
  background: 'linear-gradient(180deg, #242321 0%, #131313 100%)',
  border: '3px solid #6f604c',
  boxShadow: 'inset 0 0 0 2px #141414, 0 3px 0 rgba(0,0,0,0.55)',
}

export function HUD() {
  const salary = useGameStore((s) => s.salary)
  const fish = useGameStore((s) => s.fish)
  const bossStatus = useGameStore((s) => s.bossStatus)
  const threatText = useGameStore((s) => s.threatText)
  const progress = Math.min(100, (fish / GAME_CONFIG.economy.targetFish) * 100)
  const bossColor = bossStatus === 'patrolling' ? '#f97316' : bossStatus === 'warning' ? '#facc15' : '#fca5a5'

  return (
    <header
      className="pointer-events-none absolute left-0 top-0 z-30"
      style={{ width: LAYERS.topHud.width, height: LAYERS.topHud.height, background: '#11110f', boxShadow: 'inset 0 -5px 0 #050505' }}
    >
      <section className="absolute flex items-center gap-14 rounded-md px-16" style={{ ...panelBase, left: 8, top: 8, width: 312, height: 134 }}>
        <div className="relative h-[104px] w-[104px] rounded border-2 border-[#9a8461] bg-[#1b1b1b]">
          <img src="/sprites/employee-idle.png" alt="" className="absolute left-1/2 top-1 h-[92px] -translate-x-1/2 object-contain" />
        </div>
        <div>
          <div className="text-[22px] font-black text-amber-100">实习摸鱼王 <span className="text-[16px] text-stone-300">Lv.15</span></div>
          <div className="mt-6 h-12 w-[160px] overflow-hidden rounded-sm border border-[#8b7456] bg-black/70">
            <div className="h-full w-[56%] bg-gradient-to-r from-orange-500 to-amber-200" />
          </div>
        </div>
      </section>

      <section className="absolute rounded-md px-22 py-18" style={{ ...panelBase, left: 330, top: 24, width: 214, height: 112 }}>
        <p className="text-[22px] font-black text-amber-100">月薪</p>
        <strong className="block text-[38px] leading-none text-[#9bd34f]">{Math.round(salary).toLocaleString()}</strong>
      </section>

      <section className="absolute rounded-md px-18 py-16" style={{ ...panelBase, left: 556, top: 24, width: 174, height: 112 }}>
        <p className="text-[20px] font-black text-amber-100">摸鱼进度</p>
        <div className="mt-8 flex items-center gap-8">
          <span className="text-[30px]">🐟</span>
          <strong className="text-[38px] leading-none text-orange-300">{Math.floor(progress)}%</strong>
        </div>
      </section>

      <section className="absolute rounded-md px-18 py-15" style={{ ...panelBase, left: 742, top: 24, width: 220, height: 112 }}>
        <p className="text-[20px] font-black text-amber-100">老板状态</p>
        <strong className="block text-[30px] leading-tight" style={{ color: bossColor }}>{bossStatusLabel[bossStatus]}</strong>
        <span className="block text-[16px] font-bold text-amber-100">{threatText}</span>
      </section>
    </header>
  )
}

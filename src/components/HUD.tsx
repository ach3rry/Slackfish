import { GAME_CONFIG } from '../game/config'
import { useGameStore } from '../store/gameStore'
import { LAYERS } from '../data/mobileLevelLayout'

const bossStatusLabel = { resting: '休息中', warning: '警戒中', patrolling: '巡逻中' }
const moodEmoji: Record<string, string> = { calm: '😊', suspicious: '🤨', angry: '😠', furious: '🤬' }
const moodColor: Record<string, string> = { calm: '#86efac', suspicious: '#fbbf24', angry: '#f97316', furious: '#ef4444' }
const rhythmLabel: Record<string, string> = { calm: '平静', patrol: '巡逻', pressure: '高压', buffer: '缓冲' }
const rhythmColor: Record<string, string> = { calm: '#86efac', patrol: '#fbbf24', pressure: '#ef4444', buffer: '#60a5fa' }

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
  const suspicion = useGameStore((s) => s.suspicion)
  const bossMood = useGameStore((s) => s.bossMood)
  const rhythmPhase = useGameStore((s) => s.rhythmPhase)
  const disguiseLevel = useGameStore((s) => s.disguiseLevel)
  const progress = Math.min(100, (fish / GAME_CONFIG.economy.targetFish) * 100)
  const bossColor = bossStatus === 'patrolling' ? '#f97316' : bossStatus === 'warning' ? '#facc15' : '#fca5a5'
  const suspPct = Math.round((suspicion / GAME_CONFIG.suspicion.max) * 100)

  return (
    <header
      className="pointer-events-none absolute left-0 top-0 z-30"
      style={{ width: LAYERS.topHud.width, height: LAYERS.topHud.height, background: '#11110f', boxShadow: 'inset 0 -5px 0 #050505' }}
    >
      <section className="absolute flex items-center gap-14 rounded-md px-16" style={{ ...panelBase, left: 8, top: 8, width: 312, height: 134 }}>
        <div className="relative h-[104px] w-[104px] rounded border-2 border-[#9a8461] bg-[#1b1b1b]">
          <img src="/sprites/employee-idle.png" alt="" className="absolute left-1/2 top-1 h-[92px] -translate-x-1/2 object-contain" />
          {disguiseLevel > 0 && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded px-1" style={{ background: 'rgba(0,0,0,0.7)', fontSize: 11, color: '#ffd740', fontWeight: 700 }}>
              伪装 Lv.{disguiseLevel}
            </div>
          )}
        </div>
        <div>
          <div className="text-[22px] font-black text-amber-100">实习摸鱼王 <span className="text-[16px] text-stone-300">Lv.15</span></div>
          <div className="mt-4 h-10 w-[160px] overflow-hidden rounded-sm border border-[#8b7456] bg-black/70">
            <div className="h-full bg-gradient-to-r from-orange-500 to-amber-200" style={{ width: `${progress}%` }} />
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

      {/* 老板状态 + 怀疑值 + 情绪 */}
      <section className="absolute rounded-md px-18 py-10" style={{ ...panelBase, left: 742, top: 8, width: 260, height: 134 }}>
        <div className="flex items-center gap-8">
          <span className="text-[24px]">{moodEmoji[bossMood] ?? '😊'}</span>
          <div>
            <p className="text-[16px] font-black text-amber-100">老板状态</p>
            <strong className="block text-[24px] leading-tight" style={{ color: bossColor }}>{bossStatusLabel[bossStatus]}</strong>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold" style={{ color: moodColor[bossMood] }}>怀疑值</span>
            <span className="text-[12px] font-bold" style={{ color: moodColor[bossMood] }}>{suspPct}%</span>
          </div>
          <div className="mt-1 h-5 w-full overflow-hidden rounded-sm border border-[#8b7456] bg-black/70">
            <div className="h-full transition-all duration-300" style={{
              width: `${suspPct}%`,
              background: suspPct < 30 ? '#fbbf24' : suspPct < 60 ? '#f97316' : '#ef4444',
            }} />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-6">
          <span className="text-[12px]" style={{ color: '#8a7a60' }}>{threatText}</span>
          <span className="text-[12px] font-bold" style={{ color: rhythmColor[rhythmPhase] ?? '#8a7a60' }}>
            {rhythmLabel[rhythmPhase] ?? ''}
          </span>
        </div>
      </section>
    </header>
  )
}

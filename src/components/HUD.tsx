import { useGameStore } from '../store/gameStore'
import { level1Config } from '../data/level1'

export function HUD() {
  const salary = useGameStore((s) => s.salary)
  const slacking = useGameStore((s) => s.slacking)
  const bossState = useGameStore((s) => s.bossState)
  const bossAlert = useGameStore((s) => s.bossAlert)
  const bossLeaving = useGameStore((s) => s.bossLeaving)
  const playerAction = useGameStore((s) => s.playerAction)
  const playerZone = useGameStore((s) => s.playerZone)
  const elapsedTime = useGameStore((s) => s.elapsedTime)

  const progress = Math.min(100, (slacking / level1Config.targetSlacking) * 100)

  const bossStateText = {
    resting: '💤 休息中',
    patrolling: '👀 巡查中',
    leaving: '🚪 即将出门',
  }

  const bossStateColor = {
    resting: 'text-green-400',
    patrolling: 'text-red-400',
    leaving: 'text-yellow-400',
  }

  const effectiveBossState = bossLeaving ? 'leaving' : bossState

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
      {/* 顶部信息栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/80 backdrop-blur-sm border-b border-white/10">
        {/* 左侧：工资 */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <span className="text-yellow-400 text-lg">💰</span>
          <div>
            <div className="text-xs text-gray-400">工资</div>
            <div className={`text-lg font-bold ${salary < 50 ? 'text-red-400' : 'text-yellow-300'}`}>
              {salary.toFixed(0)}
            </div>
          </div>
        </div>

        {/* 中间：摸鱼进度 */}
        <div className="flex-1 mx-4 max-w-md">
          <div className="flex justify-between text-xs text-gray-300 mb-1">
            <span>🐟 摸鱼收益</span>
            <span>{slacking.toFixed(1)} / {level1Config.targetSlacking}</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 右侧：老板状态 */}
        <div className="flex items-center gap-2 min-w-[140px] justify-end">
          <div className="text-right">
            <div className="text-xs text-gray-400">老板状态</div>
            <div className={`text-sm font-bold ${bossStateColor[effectiveBossState]}`}>
              {bossStateText[effectiveBossState]}
            </div>
          </div>
          {/* 威胁等级条 */}
          {bossAlert > 0 && (
            <div className="w-2 h-8 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="w-full bg-red-500 transition-all duration-100 rounded-full"
                style={{ height: `${bossAlert * 100}%`, marginTop: `${(1 - bossAlert) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 副信息栏 */}
      <div className="flex justify-between items-center px-4 py-1 bg-black/50 text-xs text-gray-400">
        <span>⏱️ {formatTime(elapsedTime)}</span>
        <span>
          📍 {
            level1Config.zones.find(z => z.id === playerZone)?.label || '走廊'
          }
        </span>
        <span>
          {
            level1Config.actions.find(a => a.id === playerAction)?.emoji || '😐'
          } {
            level1Config.actions.find(a => a.id === playerAction)?.label || '待机'
          }
        </span>
      </div>

      {/* 老板出门警告 */}
      {bossLeaving && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-6 py-2 rounded-lg text-lg font-bold animate-pulse border border-red-400 shadow-lg shadow-red-500/50">
          🚨 老板开门了！注意隐蔽！
        </div>
      )}
    </div>
  )
}

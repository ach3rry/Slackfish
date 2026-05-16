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

  const bossStateMap: Record<string, { text: string; color: string; dot: string }> = {
    resting: { text: '休息中', color: '#3fb950', dot: 'bg-green-500' },
    patrolling: { text: '巡查中', color: '#f85149', dot: 'bg-red-500' },
    leaving: { text: '即将出门', color: '#d29922', dot: 'bg-yellow-500' },
  }

  const effectiveBossState = bossLeaving ? 'leaving' : bossState
  const bossInfo = bossStateMap[effectiveBossState] || bossStateMap.resting

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const zoneLabel = level1Config.zones.find(z => z.id === playerZone)?.label || '走廊'
  const actionInfo = level1Config.actions.find(a => a.id === playerAction)
  const actionLabel = actionInfo ? `${actionInfo.emoji} ${actionInfo.label}` : '😐 待机'

  return (
    <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
      {/* 主 HUD 栏 */}
      <div className="flex items-center justify-between px-3 py-1.5"
        style={{ background: 'rgba(13, 17, 23, 0.92)', borderBottom: '1px solid #30363d', backdropFilter: 'blur(8px)' }}>

        {/* 工资 */}
        <div className="flex items-center gap-1.5 min-w-[110px]">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: 'linear-gradient(135deg, #f0883e, #da3633)' }}>
            💰
          </div>
          <div>
            <div className="text-[10px] text-gray-500 leading-tight">工资</div>
            <div className={`text-base font-black leading-tight ${salary < 50 ? 'text-red-400' : salary < 100 ? 'text-yellow-400' : 'text-yellow-300'}`}>
              {salary.toFixed(0)}
            </div>
          </div>
        </div>

        {/* 摸鱼进度 */}
        <div className="flex-1 mx-3 max-w-xs">
          <div className="flex justify-between items-center text-[10px] text-gray-400 mb-0.5">
            <span>🐟 摸鱼收益</span>
            <span className="font-bold text-gray-300">{slacking.toFixed(1)} / {level1Config.targetSlacking}</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#21262d', border: '1px solid #30363d' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #1f6feb, #58a6ff, #79c0ff)',
                boxShadow: progress > 80 ? '0 0 8px rgba(88, 166, 255, 0.5)' : 'none',
              }}
            />
          </div>
        </div>

        {/* 老板状态 */}
        <div className="flex items-center gap-1.5 min-w-[110px] justify-end">
          <div className="text-right">
            <div className="text-[10px] text-gray-500 leading-tight">老板</div>
            <div className="flex items-center gap-1 justify-end">
              <span className={`w-1.5 h-1.5 rounded-full ${bossInfo.dot} ${effectiveBossState === 'patrolling' ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-bold leading-tight" style={{ color: bossInfo.color }}>
                {bossInfo.text}
              </span>
            </div>
          </div>
          {/* 威胁条 */}
          {bossAlert > 0 && (
            <div className="w-1.5 h-6 rounded-full overflow-hidden" style={{ background: '#21262d' }}>
              <div className="w-full rounded-full transition-all duration-100"
                style={{
                  height: `${bossAlert * 100}%`,
                  marginTop: `${(1 - bossAlert) * 100}%`,
                  background: bossAlert > 0.7 ? '#f85149' : bossAlert > 0.3 ? '#d29922' : '#f0883e',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 副信息栏 */}
      <div className="flex justify-between items-center px-3 py-0.5 text-[10px]"
        style={{ background: 'rgba(13, 17, 23, 0.7)', borderBottom: '1px solid rgba(48, 54, 61, 0.3)' }}>
        <span className="text-gray-500">⏱ {formatTime(elapsedTime)}</span>
        <span className="text-gray-400">📍 {zoneLabel}</span>
        <span className="text-gray-400">{actionLabel}</span>
      </div>

      {/* 老板出门警告 */}
      {bossLeaving && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 px-5 py-2 rounded-lg text-sm font-black border z-40"
          style={{
            background: 'rgba(248, 81, 73, 0.15)',
            borderColor: '#f85149',
            color: '#ff7b72',
            boxShadow: '0 0 20px rgba(248, 81, 73, 0.3)',
            animation: 'pulse 1s ease-in-out infinite',
          }}>
          🚨 老板开门了！注意隐蔽！
        </div>
      )}
    </div>
  )
}

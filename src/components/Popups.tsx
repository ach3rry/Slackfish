import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

/** 被抓弹窗 */
export function CaughtPopup() {
  const caughtEvent = useGameStore((s) => s.caughtEvent)
  const setCaughtEvent = useGameStore((s) => s.setCaughtEvent)

  useEffect(() => {
    if (caughtEvent) {
      const timer = setTimeout(() => setCaughtEvent(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [caughtEvent, setCaughtEvent])

  if (!caughtEvent) return null

  return (
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-50" style={{ animation: 'catchBounce 0.5s ease-out' }}>
      <div className="rounded-xl px-6 py-3 text-center shadow-2xl min-w-[280px]"
        style={{
          background: 'rgba(248, 81, 73, 0.15)',
          border: '2px solid #f85149',
          boxShadow: '0 0 30px rgba(248, 81, 73, 0.3), inset 0 0 20px rgba(248, 81, 73, 0.05)',
          backdropFilter: 'blur(8px)',
        }}>
        <div className="text-red-400 text-xl font-black mb-1">💢 被发现了！</div>
        <div className="text-yellow-400 text-lg font-bold mb-1.5"
          style={{ textShadow: '0 0 10px rgba(210, 153, 34, 0.5)' }}>
          💰 工资 -{caughtEvent.penalty}
        </div>
        <div className="text-gray-300 text-xs italic leading-relaxed">
          "{caughtEvent.taunt}"
        </div>
      </div>
      <style>{`
        @keyframes catchBounce {
          0% { transform: translateX(-50%) scale(0.5); opacity: 0; }
          60% { transform: translateX(-50%) scale(1.1); }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

/** 通关弹窗 */
export function WinPopup() {
  const slacking = useGameStore((s) => s.slacking)
  const salary = useGameStore((s) => s.salary)
  const elapsedTime = useGameStore((s) => s.elapsedTime)
  const getRank = useGameStore((s) => s.getRank)
  const resetGame = useGameStore((s) => s.resetGame)

  const m = Math.floor(elapsedTime / 60)
  const sec = Math.floor(elapsedTime % 60)

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl px-8 py-6 max-w-sm w-full mx-4 text-center"
        style={{
          background: 'linear-gradient(180deg, rgba(35, 134, 54, 0.15) 0%, rgba(13, 17, 23, 0.98) 30%)',
          border: '2px solid #3fb950',
          boxShadow: '0 0 40px rgba(63, 185, 80, 0.2)',
        }}>

        <div className="text-5xl mb-2">🎉</div>
        <h2 className="text-2xl font-black text-green-400 mb-1">摸鱼成功！</h2>
        <p className="text-gray-400 text-sm mb-3">恭喜通关！真正的摸鱼达人！</p>

        {/* 称号 */}
        <div className="inline-block rounded-lg px-5 py-1.5 mb-4"
          style={{ background: 'rgba(210, 153, 34, 0.1)', border: '1px solid #d29922' }}>
          <span className="text-yellow-400 text-lg font-black">🏅 {getRank()}</span>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(33, 38, 45, 0.8)', border: '1px solid #30363d' }}>
            <div className="text-gray-500 text-[10px]">用时</div>
            <div className="text-white text-lg font-black">{m}:{sec.toString().padStart(2, '0')}</div>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(33, 38, 45, 0.8)', border: '1px solid #30363d' }}>
            <div className="text-gray-500 text-[10px]">剩余工资</div>
            <div className="text-yellow-400 text-lg font-black">{salary.toFixed(0)}</div>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(33, 38, 45, 0.8)', border: '1px solid #30363d' }}>
            <div className="text-gray-500 text-[10px]">摸鱼收益</div>
            <div className="text-cyan-400 text-lg font-black">{slacking.toFixed(1)}</div>
          </div>
        </div>

        <button onClick={resetGame}
          className="w-full py-3 rounded-xl text-base font-black transition-all duration-200 active:scale-95 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #238636, #3fb950)',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(63, 185, 80, 0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
          🔄 再来一局
        </button>
      </div>
    </div>
  )
}

/** 失败弹窗 */
export function LosePopup() {
  const elapsedTime = useGameStore((s) => s.elapsedTime)
  const slacking = useGameStore((s) => s.slacking)
  const resetGame = useGameStore((s) => s.resetGame)

  const m = Math.floor(elapsedTime / 60)
  const sec = Math.floor(elapsedTime % 60)

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl px-8 py-6 max-w-sm w-full mx-4 text-center"
        style={{
          background: 'linear-gradient(180deg, rgba(248, 81, 73, 0.12) 0%, rgba(13, 17, 23, 0.98) 30%)',
          border: '2px solid #f85149',
          boxShadow: '0 0 40px rgba(248, 81, 73, 0.2)',
        }}>

        <div className="text-5xl mb-2">😵</div>
        <h2 className="text-2xl font-black text-red-400 mb-1">惨遭辞退！</h2>
        <p className="text-gray-400 text-sm mb-4">工资被扣光，收拾东西走人吧...</p>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(33, 38, 45, 0.8)', border: '1px solid #30363d' }}>
            <div className="text-gray-500 text-[10px]">存活时间</div>
            <div className="text-white text-lg font-black">{m}:{sec.toString().padStart(2, '0')}</div>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(33, 38, 45, 0.8)', border: '1px solid #30363d' }}>
            <div className="text-gray-500 text-[10px]">摸鱼收益</div>
            <div className="text-cyan-400 text-lg font-black">{slacking.toFixed(1)}</div>
          </div>
        </div>

        <button onClick={resetGame}
          className="w-full py-3 rounded-xl text-base font-black transition-all duration-200 active:scale-95 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #da3633, #f85149)',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(248, 81, 73, 0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
          🔄 重新挑战
        </button>
      </div>
    </div>
  )
}

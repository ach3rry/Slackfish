import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { level1Config } from '../data/level1'

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
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-50 animate-bounce">
      <div className="bg-red-900/95 border-2 border-red-400 rounded-xl px-8 py-4 text-center shadow-2xl shadow-red-500/50 min-w-[300px]">
        <div className="text-red-300 text-2xl font-black mb-2">
          💢 被发现了！
        </div>
        <div className="text-yellow-300 text-xl font-bold mb-2">
          工资 -{caughtEvent.penalty}
        </div>
        <div className="text-white text-sm italic">
          "{caughtEvent.taunt}"
        </div>
      </div>
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
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-[#1a2a1a] to-[#0f1f0f] border-2 border-green-400 rounded-2xl px-10 py-8 text-center shadow-2xl shadow-green-500/30 max-w-md w-full mx-4">
        <div className="text-4xl mb-3">🎉</div>
        <h2 className="text-3xl font-black text-green-300 mb-2">摸鱼成功！</h2>
        <p className="text-green-400 text-lg mb-4">恭喜通关！你是真正的摸鱼达人！</p>

        {/* 称号 */}
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg px-4 py-2 mb-4 inline-block">
          <span className="text-yellow-300 text-xl font-bold">
            🏅 {getRank()}
          </span>
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-gray-400 text-xs">用时</div>
            <div className="text-white text-lg font-bold">{m}:{sec.toString().padStart(2, '0')}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-gray-400 text-xs">剩余工资</div>
            <div className="text-yellow-300 text-lg font-bold">{salary.toFixed(0)}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-gray-400 text-xs">摸鱼收益</div>
            <div className="text-cyan-300 text-lg font-bold">{slacking.toFixed(1)}</div>
          </div>
        </div>

        <button
          onClick={resetGame}
          className="px-8 py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-400 hover:to-cyan-400 text-black font-bold rounded-xl text-lg transition-all duration-200 active:scale-95 shadow-lg"
        >
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
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-[#2a1a1a] to-[#1f0f0f] border-2 border-red-400 rounded-2xl px-10 py-8 text-center shadow-2xl shadow-red-500/30 max-w-md w-full mx-4">
        <div className="text-4xl mb-3">😵</div>
        <h2 className="text-3xl font-black text-red-300 mb-2">惨遭辞退！</h2>
        <p className="text-red-400 text-lg mb-4">工资被扣光，收拾东西走人吧...</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-gray-400 text-xs">存活时间</div>
            <div className="text-white text-lg font-bold">{m}:{sec.toString().padStart(2, '0')}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-gray-400 text-xs">摸鱼收益</div>
            <div className="text-cyan-300 text-lg font-bold">{slacking.toFixed(1)}</div>
          </div>
        </div>

        <button
          onClick={resetGame}
          className="px-8 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white font-bold rounded-xl text-lg transition-all duration-200 active:scale-95 shadow-lg"
        >
          🔄 重新挑战
        </button>
      </div>
    </div>
  )
}

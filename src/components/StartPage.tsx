import { useGameStore } from '../store/gameStore'

export function StartPage() {
  const startGame = useGameStore((s) => s.startGame)
  const leaderboard = useGameStore((s) => s.getLeaderboard)

  const board = leaderboard()

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#0f0f23] via-[#1a1a3e] to-[#0f0f23] text-white">
      {/* 标题区域 */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 mb-3 drop-shadow-lg tracking-wider">
          工位摸鱼：伪装局
        </h1>
        <p className="text-lg text-gray-300">
          在老板眼皮底下，快乐摸鱼！
        </p>
      </div>

      {/* 游戏预览图 */}
      <div className="w-[480px] h-[200px] rounded-xl border-2 border-yellow-500/30 bg-[#1a1a3e] flex items-center justify-center mb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-6 text-4xl">🏢</div>
          <div className="absolute top-8 right-10 text-3xl">👔</div>
          <div className="absolute bottom-4 left-20 text-3xl">💻</div>
          <div className="absolute bottom-6 right-16 text-3xl">🧋</div>
          <div className="absolute top-16 left-1/2 text-4xl">🏃</div>
        </div>
        <div className="z-10 text-center">
          <p className="text-yellow-300 text-xl font-bold mb-1">🎮 办公室潜行摸鱼</p>
          <p className="text-gray-400 text-sm">躲避老板视线 · 赚取摸鱼收益</p>
        </div>
      </div>

      {/* 开始按钮 */}
      <button
        onClick={startGame}
        className="px-12 py-4 text-2xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black rounded-2xl shadow-lg shadow-orange-500/30 transform hover:scale-105 transition-all duration-200 active:scale-95 mb-8"
      >
        🐟 开始摸鱼
      </button>

      {/* 玩法说明 */}
      <div className="max-w-lg text-center space-y-2 text-gray-400 text-sm">
        <p className="text-yellow-300 font-bold text-base mb-2">📖 玩法说明</p>
        <p>🏢 点击底部区域按钮在不同办公区域间移动</p>
        <p>🎯 选择摸鱼行为赚取摸鱼收益，收益达到 100 即通关</p>
        <p>👀 躲避老板红色扇形视野，被抓会扣工资</p>
        <p>🛡️ 卫生间是绝对安全区，茶水间收益高但风险大</p>
        <p>💰 工资降到 0 就会被辞退，小心！</p>
      </div>

      {/* 排行榜 */}
      {board.length > 0 && (
        <div className="mt-6 w-80">
          <p className="text-yellow-300 font-bold text-sm mb-2">🏆 最近记录</p>
          <div className="space-y-1 text-xs text-gray-400">
            {board.slice(0, 3).map((entry, i) => (
              <div key={i} className="flex justify-between bg-white/5 rounded px-3 py-1">
                <span>{entry.rank}</span>
                <span>收益 {entry.slacking.toFixed(0)}</span>
                <span>工资 {entry.salary}</span>
                <span>{entry.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

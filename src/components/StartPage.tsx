import { useGameStore } from '../store/gameStore'

export function StartPage() {
  const startGame = useGameStore((s) => s.startGame)
  const leaderboard = useGameStore((s) => s.getLeaderboard)

  const board = leaderboard()

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-auto"
      style={{ background: 'linear-gradient(135deg, #0d1117 0%, #161b22 40%, #1a1025 100%)' }}>

      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 text-6xl opacity-10">🏢</div>
        <div className="absolute top-20 right-20 text-5xl opacity-10">👔</div>
        <div className="absolute bottom-20 left-20 text-5xl opacity-10">🐟</div>
        <div className="absolute bottom-10 right-10 text-6xl opacity-10">🎮</div>
        <div className="absolute top-1/3 left-1/4 text-4xl opacity-5">💻</div>
        <div className="absolute top-1/2 right-1/4 text-4xl opacity-5">🧋</div>
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-lg w-full px-4">
        {/* Logo 区域 */}
        <div className="mb-6 text-center">
          <div className="text-6xl mb-4 drop-shadow-lg">🐟</div>
          <h1 className="text-4xl font-black tracking-wide mb-2"
            style={{
              background: 'linear-gradient(90deg, #f0883e, #da3633, #f0883e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 4px rgba(240, 136, 62, 0.3))',
            }}>
            工位摸鱼：伪装局
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            在老板眼皮底下，快乐摸鱼！
          </p>
        </div>

        {/* 产品图预览 */}
        <div className="w-full rounded-xl overflow-hidden border border-gray-700/50 mb-6 shadow-xl shadow-black/50">
          <img src="/images/overview.png" alt="办公室总览" className="w-full h-44 object-cover opacity-80" />
          <div className="bg-black/60 backdrop-blur px-4 py-2 text-center">
            <span className="text-yellow-400 text-sm font-bold">🎮 办公室潜行摸鱼 — 躲避老板视线</span>
          </div>
        </div>

        {/* 开始按钮 */}
        <button
          onClick={startGame}
          className="w-full py-4 text-xl font-black rounded-xl shadow-lg transition-all duration-200 active:scale-95 mb-6 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #f0883e, #da3633)',
            color: '#fff',
            boxShadow: '0 4px 24px rgba(240, 136, 62, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
          🐟 开始摸鱼
        </button>

        {/* 玩法说明卡片 */}
        <div className="w-full rounded-xl p-4 mb-4"
          style={{ background: 'rgba(22, 27, 34, 0.9)', border: '1px solid #30363d' }}>
          <p className="text-yellow-400 font-bold text-sm mb-3 text-center">📖 玩法说明</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
              <span className="text-lg">🏢</span>
              <span>点击底部按钮<br/>在不同区域移动</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
              <span className="text-lg">🎯</span>
              <span>选择摸鱼行为<br/>赚满100收益通关</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
              <span className="text-lg">👀</span>
              <span>躲避红色扇形<br/>老板视野</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
              <span className="text-lg">🛡️</span>
              <span>卫生间绝对安全<br/>茶水间高风险</span>
            </div>
          </div>
        </div>

        {/* 排行榜 */}
        {board.length > 0 && (
          <div className="w-full rounded-xl p-4"
            style={{ background: 'rgba(22, 27, 34, 0.9)', border: '1px solid #30363d' }}>
            <p className="text-yellow-400 font-bold text-sm mb-2">🏆 最近记录</p>
            <div className="space-y-1">
              {board.slice(0, 5).map((entry, i) => (
                <div key={i} className="flex justify-between items-center bg-white/5 rounded-lg px-3 py-1.5 text-xs">
                  <span className="text-yellow-300">{entry.rank}</span>
                  <span className="text-gray-400">收益 {entry.slacking.toFixed(0)}</span>
                  <span className="text-gray-400">工资 {entry.salary}</span>
                  <span className="text-gray-500">{entry.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

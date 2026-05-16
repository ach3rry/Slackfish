import { GAME_CONFIG } from '../game/config'
import { gameBus } from '../game/gameBus'
import { useGameStore } from '../store/gameStore'

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function ModalLayer() {
  const phase = useGameStore((s) => s.phase)
  const salary = useGameStore((s) => s.salary)
  const fish = useGameStore((s) => s.fish)
  const elapsed = useGameStore((s) => s.elapsedSeconds)
  const catchNotice = useGameStore((s) => s.catchNotice)
  const finalTitle = useGameStore((s) => s.finalTitle)
  const guideOpen = useGameStore((s) => s.guideOpen)
  const restart = useGameStore((s) => s.restartGame)
  const startGame = useGameStore((s) => s.startGame)
  const markGuideSeen = useGameStore((s) => s.markGuideSeen)

  const handleRestart = () => { restart(); gameBus.restart() }
  const handleStart = () => { const guide = window.localStorage.getItem(GAME_CONFIG.timing.guideStorageKey) !== '1'; startGame(); if (!guide) gameBus.start() }
  const handleGuideOk = () => { markGuideSeen(); gameBus.start() }

  return (
    <>
      {phase === 'start' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/96" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="max-w-lg w-full mx-4 text-center">
            <div className="text-6xl mb-4">🐟</div>
            <h1 className="text-4xl font-black text-amber-100 mb-2">《工位摸鱼：伪装局》</h1>
            <p className="text-lg text-slate-300 mb-6">在老板眼皮底下，快乐摸鱼！</p>
            <div className="grid grid-cols-2 gap-2 mb-6 text-xs text-slate-400">
              <div className="bg-slate-800/50 rounded-lg p-3">🏢 点击区域按钮移动</div>
              <div className="bg-slate-800/50 rounded-lg p-3">🎯 选行为赚收益到100</div>
              <div className="bg-slate-800/50 rounded-lg p-3">👀 躲避红色扇形视野</div>
              <div className="bg-slate-800/50 rounded-lg p-3">🛡️ 卫生间绝对安全</div>
            </div>
            <button onClick={handleStart} className="w-full py-3 rounded-xl text-lg font-black bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg active:scale-95 transition-transform cursor-pointer">🐟 开始摸鱼</button>
          </div>
        </div>
      )}

      {guideOpen && phase === 'playing' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="max-w-md w-full mx-4 bg-slate-900 border border-cyan-400/30 rounded-xl p-6 text-center">
            <h2 className="text-xl font-black text-cyan-200 mb-3">📖 新手引导</h2>
            <div className="text-sm text-slate-300 space-y-2 mb-4">
              <p>1. 点击底部「区域」按钮移动到不同区域</p>
              <p>2. 到达后选择对应「行为」开始摸鱼</p>
              <p>3. 🛡️ <strong className="text-green-300">卫生间是安全区</strong>，老板不会进来</p>
              <p>4. ⚠️ 茶水间收益高但风险极大</p>
              <p>5. 💻 正常工作能涨工资，但没摸鱼收益</p>
            </div>
            <button onClick={handleGuideOk} className="w-full py-2 rounded-lg bg-cyan-600 text-white font-bold active:scale-95 transition-transform cursor-pointer">知道了，开始摸鱼！</button>
          </div>
        </div>
      )}

      {catchNotice && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div className="rounded-xl border-2 border-red-400/60 bg-red-950/80 px-6 py-4 text-center" style={{ backdropFilter: 'blur(8px)', boxShadow: '0 0 30px rgba(248,113,113,0.3)' }}>
            <p className="text-sm font-black text-rose-300">{catchNotice.title}</p>
            <h2 className="mt-1 text-3xl font-black text-rose-100">-{catchNotice.amount} 工资</h2>
            <p className="mt-2 text-sm text-slate-200">"{catchNotice.message}"</p>
          </div>
        </div>
      )}

      {phase === 'won' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="max-w-md w-full bg-slate-900 border border-emerald-400/40 rounded-xl p-6 text-center" style={{ boxShadow: '0 0 40px rgba(52,211,153,0.15)' }}>
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-sm font-black text-emerald-300">达标通关</p>
            <h2 className="mt-1 text-3xl font-black text-amber-100">{finalTitle || '摸鱼熟练工'}</h2>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-800 rounded-lg p-2"><span className="text-[10px] text-slate-500">用时</span><br /><strong className="text-white">{fmt(elapsed)}</strong></div>
              <div className="bg-slate-800 rounded-lg p-2"><span className="text-[10px] text-slate-500">工资</span><br /><strong className="text-amber-200">{Math.round(salary)}</strong></div>
              <div className="bg-slate-800 rounded-lg p-2"><span className="text-[10px] text-slate-500">摸鱼</span><br /><strong className="text-cyan-300">{Math.round(fish)}</strong></div>
            </div>
            <button onClick={handleRestart} className="mt-5 w-full py-2.5 rounded-lg bg-emerald-600 text-white font-bold active:scale-95 transition-transform cursor-pointer">🔄 再来一局</button>
          </div>
        </div>
      )}

      {phase === 'lost' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="max-w-md w-full bg-slate-900 border border-red-400/40 rounded-xl p-6 text-center" style={{ boxShadow: '0 0 40px rgba(248,113,113,0.15)' }}>
            <div className="text-4xl mb-2">😵</div>
            <p className="text-sm font-black text-rose-300">游戏失败</p>
            <h2 className="mt-1 text-3xl font-black text-rose-100">工资被扣光，惨遭辞退</h2>
            <p className="mt-3 text-sm text-slate-400">摸鱼收益停在 {Math.floor(fish)}，下次记得用卫生间当安全屋。</p>
            <button onClick={handleRestart} className="mt-5 w-full py-2.5 rounded-lg bg-red-600 text-white font-bold active:scale-95 transition-transform cursor-pointer">🔄 重新挑战</button>
          </div>
        </div>
      )}
    </>
  )
}
